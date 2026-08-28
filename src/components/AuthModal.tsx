/**
 * SafeHeaven Authentication & Privacy Portal
 * Primary: Phone Number SMS Auth with OTP verification
 * Secondary: Email/Password & Google Sign-In
 * Onboarding: Optional Emergency Contact Setup with Skip
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Smartphone,
  Globe,
  Ghost,
  RefreshCw,
  UserCheck,
  Heart,
  Save,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth } from '../services/firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

export interface UserAuthProfile {
  uid: string;
  displayName: string;
  phone?: string;
  email?: string;
  homeCountryCode: string;
  isDiscreetMode: boolean;
  trustedContactPhone?: string;
  createdAt: number;
  admin?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAuthProfile) => void;
  onTriggerEmergencyBypass?: () => void;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', defaultEmergency: '112 / 1091' },
  { code: '+1', country: 'United States', flag: '🇺🇸', defaultEmergency: '911' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', defaultEmergency: '999 / 112' },
  { code: '+49', country: 'Germany / EU', flag: '🇩🇪', defaultEmergency: '112' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', defaultEmergency: '000' },
  { code: '+1', country: 'Canada', flag: '🇨🇦', defaultEmergency: '911' },
];

const RELATIONSHIPS = [
  'Parent / Guardian',
  'Partner / Spouse',
  'Friend',
  'Sibling',
  'Roommate',
  'Other Trusted Person',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onTriggerEmergencyBypass,
}) => {
  const { setEmergencyContact, theme, currentUser, setCurrentUser, navigate } = useApp();

  const [authMethod, setAuthMethod] = useState<'phone' | 'email' | 'privacy' | 'admin'>('email');

  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };
  const [phoneCountry, setPhoneCountry] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpStep, setOtpStep] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [receivedDemoOtp, setReceivedDemoOtp] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Discreet mode
  const [isDiscreetEnabled, setIsDiscreetEnabled] = useState(false);
  const [disguiseTitle, setDisguiseTitle] = useState('Daily Weather & Calculator');

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Emergency Contact Onboarding Step
  const [showContactOnboarding, setShowContactOnboarding] = useState<boolean>(false);
  const [tempUserProfile, setTempUserProfile] = useState<UserAuthProfile | null>(null);
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactRelation, setContactRelation] = useState<string>('Parent / Guardian');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpStep && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, resendTimer]);

  if (!isOpen) return null;

  const isLight = theme === 'light';

  const completeAuth = (userProfile: UserAuthProfile) => {
    onLoginSuccess(userProfile);
    onClose();
    setShowContactOnboarding(false);
    setTempUserProfile(null);
    setSuccessMessage(null);
    setOtpStep(false);
    setReceivedDemoOtp(null);
    navigate('/app');
  };

  const handleSaveContactAndFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactName.trim() && contactPhone.trim()) {
      setEmergencyContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelation,
      });
    }
    finishLogin();
  };

  const handleSkipContact = () => {
    finishLogin();
  };

  const finishLogin = () => {
    if (tempUserProfile) {
      onLoginSuccess(tempUserProfile);
    }
    onClose();
    setShowContactOnboarding(false);
    setTempUserProfile(null);
    setSuccessMessage(null);
    setOtpStep(false);
    setReceivedDemoOtp(null);
    navigate('/app');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!displayName || displayName.trim().length < 2) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/safety/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          countryCode: phoneCountry,
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to send verification code');
      }

      setOtpStep(true);
      setResendTimer(data.cooldownSeconds || 60);
      setOtpCode(['', '', '', '', '', '']);
      if (data.demoOtp) {
        setReceivedDemoOtp(data.demoOtp);
      }
      setSuccessMessage(data.message || `Code sent to ${phoneCountry} ${phoneNumber}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send code. Please check your network.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const fullOtp = otpCode.join('');
    if (fullOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/safety/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          otp: fullOtp,
          name: displayName.trim(),
          countryCode: phoneCountry,
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      const userProfile: UserAuthProfile = {
        uid: data.user.id,
        displayName: data.user.name,
        phone: data.user.phoneNumber,
        homeCountryCode: phoneCountry === '+91' ? 'IN' : 'US',
        isDiscreetMode: isDiscreetEnabled,
        createdAt: data.user.createdAt,
      };

      setSuccessMessage(`Phone verified! Welcome, ${userProfile.displayName}.`);
      setTimeout(() => {
        completeAuth(userProfile);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (isSignUp) {
        if (!displayName || displayName.trim().length < 2) {
          setErrorMessage('Please enter your full name for account creation.');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCredential.user;
        const idTokenResult = await user.getIdTokenResult(true);
        const adminEmail = ((import.meta as any).env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
        const isAdmin = !!idTokenResult.claims.admin || (adminEmail ? user.email?.toLowerCase() === adminEmail : false);

        const userProfile: UserAuthProfile = {
          uid: user.uid,
          displayName: displayName.trim(),
          email: user.email || trimmedEmail,
          homeCountryCode: 'IN',
          isDiscreetMode: isDiscreetEnabled,
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now(),
          admin: isAdmin,
        };

        setSuccessMessage('Account created successfully!');
        setTimeout(() => {
          completeAuth(userProfile);
        }, 700);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCredential.user;
        const idTokenResult = await user.getIdTokenResult(true);
        const adminEmail = ((import.meta as any).env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
        const isAdmin = !!idTokenResult.claims.admin || (adminEmail ? user.email?.toLowerCase() === adminEmail : false);

        const userProfile: UserAuthProfile = {
          uid: user.uid,
          displayName: user.displayName || displayName || user.email?.split('@')[0] || 'SafeRoute User',
          email: user.email || trimmedEmail,
          homeCountryCode: 'IN',
          isDiscreetMode: isDiscreetEnabled,
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now(),
          admin: isAdmin,
        };

        setSuccessMessage('Logged in successfully!');
        setTimeout(() => {
          completeAuth(userProfile);
        }, 700);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Account not found or invalid credentials. Please check your email and password or sign up.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('An account already exists with this email address. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Invalid email format.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password should be at least 6 characters long.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed attempts. Please try again later.');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
      }
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid administrator email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    const adminEmail = ((import.meta as any).env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;
      const idTokenResult = await user.getIdTokenResult(true);
      const isAdmin = !!idTokenResult.claims.admin || (adminEmail ? user.email?.toLowerCase() === adminEmail : false);

      if (isAdmin) {
        const userProfile: UserAuthProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Admin',
          email: user.email || trimmedEmail,
          homeCountryCode: 'IN',
          isDiscreetMode: false,
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now(),
          admin: true,
        };
        setSuccessMessage('Admin verified! Welcome, Admin.');
        setTimeout(() => {
          onLoginSuccess(userProfile);
          onClose();
          navigate('/admin');
        }, 700);
      } else {
        await auth.signOut();
        setErrorMessage('Access Denied: Authenticated account does not have ADMIN privileges.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid administrator credentials.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password for administrator account.');
      } else {
        setErrorMessage(err.message || 'Administrator authentication failed.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idTokenResult = await user.getIdTokenResult(true);
      const adminEmail = ((import.meta as any).env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
      const isAdmin = !!idTokenResult.claims.admin || (adminEmail ? user.email?.toLowerCase() === adminEmail : false);

      const userProfile: UserAuthProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'SafeRoute User',
        email: user.email || undefined,
        phone: user.phoneNumber || undefined,
        homeCountryCode: 'IN',
        isDiscreetMode: isDiscreetEnabled,
        createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now(),
        admin: isAdmin,
      };

      setSuccessMessage(`Google sign-in verified! Welcome, ${userProfile.displayName}.`);
      setTimeout(() => {
        completeAuth(userProfile);
      }, 700);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Google sign-in popup was closed before completion.');
      } else {
        setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      }
    }
  };

  const handleQuickDemoLoad = () => {
    setDisplayName('Priya Sharma');
    setPhoneNumber('98765 43210');
    setEmail('priya.sharma@saferoute.demo');
    setPhoneCountry('+91');
  };

  const toggleStealthMode = () => {
    const nextState = !isDiscreetEnabled;
    setIsDiscreetEnabled(nextState);
    if (nextState) {
      document.title = disguiseTitle;
    } else {
      document.title = 'SafeRoute AI - Real-Time Safety Navigation';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border p-6 shadow-2xl transition-colors duration-200 ${isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
          : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-cyan-950/30'
          }`}
      >
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl" />

        {/* Header Bar */}
        <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                SafeRoute Account
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {showContactOnboarding ? 'Emergency contact setup' : 'Sign in to save favorite routes & contacts'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {currentUser ? (
          <div className="mt-5 space-y-5 animate-in fade-in">
            <div className={`p-4 rounded-2xl border text-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-850'
              }`}>
              <div className="h-14 w-14 rounded-full bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 mx-auto mb-3">
                <User className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-base">{currentUser.displayName}</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{currentUser.email || currentUser.phone || 'Anonymous Session'}</p>
              <div className="text-[10px] text-gray-400 mt-2 font-mono">Member since {new Date(currentUser.createdAt).toLocaleDateString()}</div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onClose();
                  navigate('/app');
                }}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                Go to Main App Portal
              </button>
              <button
                onClick={async () => {
                  try {
                    await auth.signOut();
                  } catch (e) {
                    console.warn('Sign out error:', e);
                  }
                  setCurrentUser(null);
                  onClose();
                  navigate('/');
                }}
                className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-50/10 font-bold text-xs transition-colors cursor-pointer"
              >
                Sign Out of Account
              </button>
            </div>
          </div>
        ) : showContactOnboarding ? (
          <div className="mt-4 space-y-4 animate-in fade-in">
            <div
              className={`p-3.5 rounded-xl border ${isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/30 border-rose-800/60'
                } space-y-1`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                <Heart className="h-4 w-4" />
                <span>Who should we contact if you need help?</span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                Add someone you trust so they are easy to reach in an emergency. You can always change this later.
              </p>
            </div>

            <form onSubmit={handleSaveContactAndFinish} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Contact Name
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none ${isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                      : 'bg-zinc-900 border-zinc-800 text-white focus:border-rose-500'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 234-5678"
                    className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none ${isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                      : 'bg-zinc-900 border-zinc-800 text-white focus:border-rose-500'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Relationship (Optional)
                </label>
                <select
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                    : 'bg-zinc-900 border-zinc-800 text-white focus:border-rose-500'
                    }`}
                >
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
                <button
                  type="button"
                  onClick={handleSkipContact}
                  className={`text-xs font-medium px-3 py-2 rounded-xl transition-colors ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  Skip for now
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors active:scale-95"
                >
                  Save & Continue
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Emergency SOS Bypass Banner */}
            <div
              className={`mt-4 p-3 rounded-xl border flex items-center justify-between gap-3 ${isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Need immediate help? Trigger alert without logging in.</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onTriggerEmergencyBypass) onTriggerEmergencyBypass();
                }}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
              >
                Quick Help
              </button>
            </div>

            {/* Auth Method Navigation Header */}
            {authMethod !== 'admin' && (
              <div
                className={`mt-5 flex items-center justify-between rounded-xl p-1 border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
                  }`}
              >
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${authMethod === 'email'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white shadow-xs'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  <Mail className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Email & Password</span>
                </button>
              </div>
            )}

            {/* Success Alert Toast */}
            {successMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert Toast */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: PHONE AUTHENTICATION */}
            {authMethod === 'phone' && !otpStep && (
              <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:outline-none ${isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-zinc-900 border-zinc-800 text-white focus:border-cyan-500'
                      }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className={`rounded-xl border px-2.5 py-2 text-xs focus:outline-none shrink-0 ${isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-zinc-900 border-zinc-800 text-white'
                        }`}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code + c.country} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <Phone className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-xs focus:outline-none ${isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                          : 'bg-zinc-900 border-zinc-800 text-white focus:border-cyan-500'
                          }`}
                        required
                      />
                    </div>
                  </div>
                  <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    We will send a 6-digit verification code to confirm your number.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSendingOtp ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemoLoad}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-cyan-500 hover:text-cyan-400"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Fill Demo Credentials</span>
                  </button>
                </div>
              </form>
            )}

            {/* OTP VERIFICATION STEP */}
            {authMethod === 'phone' && otpStep && (
              <div className="mt-5 space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold">Enter 6-Digit Code</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Sent to <span className="font-mono font-bold text-cyan-500">{phoneCountry} {phoneNumber}</span>
                  </p>
                </div>

                {/* Delivered OTP Code Banner with 1-Click Auto-Fill */}
                {receivedDemoOtp && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${isLight ? 'bg-cyan-50 border-cyan-200 text-slate-800' : 'bg-cyan-950/70 border-cyan-800 text-cyan-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-cyan-500 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">Delivered OTP Code:</div>
                        <div className="font-mono font-bold text-sm tracking-widest text-emerald-600 dark:text-emerald-400">{receivedDemoOtp}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = receivedDemoOtp.split('');
                        setOtpCode(digits);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      ⚡ Auto-Fill Code
                    </button>
                  </div>
                )}

                <div className="flex justify-center gap-2 my-4">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-box-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const newOtp = [...otpCode];
                        newOtp[idx] = val.slice(-1);
                        setOtpCode(newOtp);
                        if (val && idx < 5) {
                          const nextInput = document.getElementById(`otp-box-${idx + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                          const prevInput = document.getElementById(`otp-box-${idx - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (pasteData) {
                          const newOtp = [...otpCode];
                          pasteData.split('').forEach((char, i) => {
                            if (i < 6) newOtp[i] = char;
                          });
                          setOtpCode(newOtp);
                        }
                      }}
                      className={`h-11 w-11 rounded-xl border text-center font-mono text-base font-bold focus:outline-none transition-all ${isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                        : 'bg-zinc-900 border-zinc-700 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                        }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    onClick={() => {
                      setOtpStep(false);
                      setReceivedDemoOtp(null);
                    }}
                    className={isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-white'}
                  >
                    Change Number
                  </button>
                  <span>
                    {resendTimer > 0 ? (
                      `Resend in ${resendTimer}s`
                    ) : (
                      <button
                        onClick={handleSendOtp}
                        className="text-cyan-500 hover:underline"
                      >
                        Resend Code
                      </button>
                    )}
                  </span>
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: EMAIL AUTH */}
            {authMethod === 'email' && (
              <form onSubmit={handleEmailAuth} className="mt-5 space-y-4">
                {isSignUp && (
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="off"
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                        }`}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-xs focus:outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                        }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className={`w-full rounded-xl border pl-9 pr-9 py-2 text-xs focus:outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                        }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-2.5 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors"
                >
                  <span>{isSignUp ? 'Create SafeRoute Account' : 'Sign In'}</span>
                </button>

                <div className="text-center text-xs mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-cyan-500 hover:underline font-semibold"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>
                </div>

                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`} />
                  </div>
                  <span className={`relative px-2 text-[11px] ${isLight ? 'bg-white text-slate-400' : 'bg-zinc-950 text-zinc-400'}`}>
                    OR
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className={`w-full flex items-center justify-center gap-2.5 py-2 text-xs font-medium rounded-xl border transition-colors ${isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                    }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </form>
            )}

            {/* TAB 3: STEALTH MODE */}
            {authMethod === 'privacy' && (
              <div className="mt-5 space-y-4">
                <div
                  className={`rounded-xl border p-3.5 space-y-2 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/30 border-amber-800/60'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                      <Ghost className="h-4 w-4" /> Private Browsing Mode
                    </span>
                    <button
                      onClick={toggleStealthMode}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isDiscreetEnabled ? 'bg-amber-500' : 'bg-zinc-700'
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isDiscreetEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-amber-300/80'}`}>
                    Disguises browser tab title if you need to view safer routes without drawing attention.
                  </p>
                </div>
              </div>
            )}

            {/* ADMIN SIGN IN FORM */}
            {authMethod === 'admin' && (
              <form onSubmit={handleAdminAuth} className="mt-5 space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-950/60 text-purple-400 border border-purple-800">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold">Console Administrator Login</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Authorized staff and system developers only
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-xs focus:outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500' : 'bg-zinc-900 border-zinc-800 text-white focus:border-purple-500'
                        }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Secret Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className={`w-full rounded-xl border pl-9 pr-9 py-2 text-xs focus:outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500' : 'bg-zinc-900 border-zinc-800 text-white focus:border-purple-500'
                        }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-2.5 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors"
                >
                  <span>Access Administrator Portal</span>
                </button>
              </form>
            )}

            {/* ADMIN LOGIN TOGGLE BLOCK */}
            {authMethod !== 'admin' ? (
              <div className="text-center mt-4 pt-3 border-t border-zinc-800/40">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('admin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-purple-500 hover:text-purple-400 font-semibold"
                >
                  Looking for Admin Sign In?
                </button>
              </div>
            ) : (
              <div className="text-center mt-4 pt-3 border-t border-zinc-800/40">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('phone');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-cyan-500 hover:text-cyan-400 font-semibold"
                >
                  Back to Regular Sign In
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
