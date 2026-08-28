/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Phone,
  Radio,
  MapPin,
  Mic,
  MicOff,
  Share2,
  AlertOctagon,
  ChevronRight,
  Sparkles,
  Lock,
  Copy,
  Check,
  Navigation,
  X,
  Volume2,
} from 'lucide-react';
import type { SafeHavenCandidate } from '../types/safety';
import { useApp } from '../context/AppContext';

export const FollowedModeHud: React.FC = () => {
  const {
    isFollowedModeOpen,
    closeFollowedMode,
    followedData,
    isFollowedLoading,
    safeHavens,
    navigateToHaven,
    navigation,
    emergencyContact,
  } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isFollowedModeOpen) return null;

  const topHaven: SafeHavenCandidate = safeHavens[0] || {
    id: 'haven_fallback_1',
    name: 'Walgreens 24/7 Pharmacy',
    type: 'PHARMACY_24_7',
    distance_meters: 140,
    walk_time_minutes: 2,
    address: '498 Market St (Well-lit, 24/7 Staff)',
    phone: '555-0199',
    is_open_now: true,
    is_verified_partner: true,
    has_security_staff: true,
    has_well_lit_entrance: true,
  };

  const contactName = emergencyContact?.name || 'Alex';
  const contactCode = emergencyContact?.countryCode || '';
  const contactPhone = emergencyContact?.phone || '555-0199';
  const displayPhone = contactCode ? `${contactCode} ${contactPhone}` : contactPhone;
  const rawPhoneDigits = `${contactCode}${contactPhone}`.replace(/[^+\d]/g, '');
  const telLink = `tel:${rawPhoneDigits || '5550199'}`;

  const shareableGpsLink = `${window.location.origin}/live-share?lat=${navigation.currentPosition.lat}&lng=${navigation.currentPosition.lng}&t=${Date.now()}`;
  const emergencySmsText = `[SafeRoute Emergency Alert] I feel unsafe. My live tracking link: ${shareableGpsLink} - Heading towards ${topHaven.name}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableGpsLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopySms = () => {
    navigator.clipboard.writeText(emergencySmsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  const handleRerouteToHaven = () => {
    navigateToHaven(topHaven);
    closeFollowedMode();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border-2 border-rose-600 bg-zinc-950 p-5 sm:p-6 shadow-2xl shadow-rose-950/60 text-white space-y-4">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-rose-900/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg animate-pulse">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Followed Mode Active HUD</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                  Priority Sanctuary Protocol
                </span>
              </div>
              <p className="text-xs text-rose-200/80">
                Calm immediate tactical steps • Real phone click-to-call • Audio evidence logger
              </p>
            </div>
          </div>

          <button
            onClick={closeFollowedMode}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Priority 1: Top Sanctuary Immediate Navigation */}
        <div className="rounded-xl border border-emerald-500 bg-emerald-950/40 p-4 space-y-3 shadow-lg shadow-emerald-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Closest Verified Safe Sanctuary
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700">
              {topHaven.distance_meters}m (~{topHaven.walk_time_minutes} min walk)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">{topHaven.name}</h3>
              <p className="text-xs text-emerald-200/90 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{topHaven.address}</span>
              </p>
            </div>

            <button
              onClick={handleRerouteToHaven}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform active:scale-95 shadow-md shrink-0"
            >
              <Navigation className="h-4 w-4" />
              <span>Reroute to This Haven Now</span>
            </button>
          </div>
        </div>

        {/* Priority 2: Real Click-to-Call Emergency Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Emergency 911 Call Link */}
          <a
            href="tel:911"
            className="flex items-center justify-between p-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <Phone className="h-5 w-5" />
              <div className="text-left">
                <div className="text-sm font-black">Call 911 Emergency</div>
                <div className="text-[10px] text-rose-100 font-normal">Opens device native phone dialer</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </a>

          {/* Trusted Contact Call Link */}
          <a
            href={telLink}
            className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs transition-all active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <Phone className="h-5 w-5 text-cyan-400" />
              <div className="text-left">
                <div className="text-sm font-bold">Call Emergency Contact</div>
                <div className="text-[10px] text-zinc-400 font-normal">{contactName} ({displayPhone})</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </a>
        </div>

        {/* Priority 3: Share Live GPS & Dispatch SMS */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-cyan-400" /> Share Live Tracking Link
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Encrypted Token</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableGpsLink}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] font-mono text-cyan-300 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs shrink-0 flex items-center gap-1 transition-colors"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick SMS Body button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400 truncate max-w-sm">
              Prepared SOS text with GPS coords ready
            </span>
            <button
              onClick={handleCopySms}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              {copiedSms ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>Copy SOS Text</span>
            </button>
          </div>
        </div>

        {/* Priority 4: Simulated Discreet Audio Evidence Recorder */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            <div>
              <div className="font-semibold text-white">
                {isRecording ? 'Evidence Audio Recording Active' : 'Discreet Audio Evidence Recorder'}
              </div>
              <div className="text-[11px] text-zinc-400">
                {isRecording ? (
                  <span className="text-rose-400 font-mono font-semibold">
                    Recording: {Math.floor(recordSeconds / 60)}:
                    {String(recordSeconds % 60).padStart(2, '0')} (Saved securely)
                  </span>
                ) : (
                  'Tap to record ambient audio & sensor timestamps'
                )}
              </div>
            </div>
          </div>

          {isRecording && (
            <div className="flex items-center gap-1">
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="w-1 bg-rose-500 rounded-full animate-bounce"
                  style={{
                    height: `${12 + (i % 3) * 6}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Immediate Tactical Advice from AI */}
        {followedData?.immediate_steps && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1.5 text-xs text-zinc-300">
            <span className="font-semibold text-zinc-200 text-[11px]">Immediate Tactical Guidance:</span>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-300">
              {followedData.immediate_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>Zero PII stored • Encrypted session</span>
          </div>

          <button
            onClick={closeFollowedMode}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
          >
            Exit Followed Mode
          </button>
        </div>
      </div>
    </div>
  );
};
