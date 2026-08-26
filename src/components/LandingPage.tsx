import React from 'react';
import { useApp } from '../context/AppContext';
import { AuthModal } from './AuthModal';
import {
  Shield,
  ShieldAlert,
  Navigation,
  Sparkles,
  Users,
  Bell,
  Heart,
  ChevronRight,
  Eye,
  Activity,
  ArrowRight,
  MapPin,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme, currentUser, openAuthModal, navigate, isAuthModalOpen, closeAuthModal, setCurrentUser, openFollowedMode } = useApp();
  const isLight = theme === 'light';

  const handleGetStarted = () => {
    if (currentUser) {
      navigate('/app');
    } else {
      openAuthModal();
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 overflow-hidden relative ${isLight
        ? 'bg-slate-50 text-slate-900'
        : 'bg-zinc-950 text-zinc-100'
        }`}
    >
      {/* Background Decorative Glow Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 ${isLight ? 'bg-white/80 border-slate-200' : 'bg-zinc-950/80 border-zinc-900'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-9 w-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-sm">SafeRoute</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold block leading-none">AI NAVIGATION</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isLight
                ? 'border-slate-350 hover:bg-slate-100 text-slate-700'
                : 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                }`}
            >
              Admin Panel
            </button>
            <button
              onClick={handleGetStarted}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/20 transition-transform active:scale-95"
            >
              {currentUser ? 'Enter App' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Next-Gen Safety-First Navigation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Navigate Nagpur <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-400">
                With Confidence
              </span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 ${isLight ? 'text-slate-600' : 'text-zinc-400'
              }`}>
              Crowdsourced community safety reports, automated AI validation metrics, and
              one-tap sanctuary routing. Protect your journeys and walk with safety-first travel intelligence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Get Started Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#features"
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl border text-center font-bold text-sm transition-colors ${isLight
                  ? 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  : 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                  }`}
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Interactive Feature Graphic / Simulated UI preview */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className={`relative w-80 h-96 rounded-3xl border shadow-2xl p-4 overflow-hidden backdrop-blur-md ${isLight ? 'bg-white/80 border-slate-200' : 'bg-zinc-950/80 border-zinc-800/80'
              }`}>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">Live Safety Pulse</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              {/* Mock Map View */}
              <div className={`mt-3 h-40 rounded-2xl border relative flex items-center justify-center overflow-hidden ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/50 border-zinc-850'
                }`}>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="flex flex-col items-center gap-2 text-center z-10">
                  <MapPin className="h-7 w-7 text-cyan-600 dark:text-cyan-400 animate-bounce" />
                  <span className="text-[10px] font-bold">Sitabuldi Nagpur</span>
                </div>
              </div>

              {/* Incident report preview */}
              <div className={`mt-3 p-3 rounded-2xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-850'
                }`}>
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-800/20 shrink-0">
                  <ShieldAlert className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold flex items-center justify-between">
                    <span>Streetlight outage</span>
                    <span className="text-amber-500 font-mono text-[8px] font-bold uppercase">Confidence: 94%</span>
                  </div>
                  <p className="text-[9px] text-gray-500 truncate">Broken LED lamps on main subway corridor.</p>
                </div>
              </div>

              {/* Route Star Scoring */}
              <div className={`mt-2.5 p-2.5 rounded-2xl border flex items-center justify-between text-[10px] ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-850'
                }`}>
                <div className="font-semibold">Illuminated Route</div>
                <div className="text-emerald-500 font-bold">★★★★★ (Safest)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section
        id="features"
        className={`py-16 sm:py-20 border-t ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-900'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Engineered for Safe Urban Journeys</h2>
            <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Combining automated safety evaluation, community reporting, and localized support networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className={`p-6 rounded-3xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-800'
              }`}>
              <div className="h-10 w-10 rounded-2xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 mb-4">
                <Navigation className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm mb-2">Safer Route Scorer</h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Compare travel paths by incident concentration, lighting ratings, and real crowdsourced data. Choose safety over speed.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-800'
              }`}>
              <div className="h-10 w-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm mb-2">Safe Havens Directory</h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Sanctuaries and public spaces marked as safe havens with verified lighting, staff presence, and direct routing.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-800'
              }`}>
              <div className="h-10 w-10 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 mb-4">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm mb-2">SOS & Followed Mode</h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Share your active route coordinates with trusted contacts. Tap SOS for immediate check-in options and stealth screen mode.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`border-t px-4 sm:px-6 py-6 text-xs transition-colors duration-200 ${isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-zinc-950 border-zinc-900 text-zinc-500'
          }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Shield className="h-4 w-4 text-cyan-500" />
            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>SafeRoute</span>
            <span>— Nagpur Smart City Project</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-gray-500">
            <span>5-Star Safety Standards</span>
            <span>•</span>
            <span>Zero Discrimination</span>
            <span>•</span>
            <span>Call local authorities in emergencies</span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onLoginSuccess={setCurrentUser}
        onTriggerEmergencyBypass={() => openFollowedMode()}
      />
    </div>
  );
};
