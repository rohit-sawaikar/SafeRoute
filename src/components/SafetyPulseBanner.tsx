/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, RefreshCw, Clock, Compass, Sparkles, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SafetyPulseBanner: React.FC = () => {
  const { pulseData, isPulseLoading, refreshSafetyPulse, timeOfDay, theme, incidents } = useApp();

  const isLight = theme === 'light';

  const statusConfig = {
    NORMAL: {
      bg: isLight ? 'bg-emerald-50 border-emerald-200 text-slate-900' : 'bg-emerald-950/40 border-emerald-800/60 text-zinc-100',
      badgeBg: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-300 border-emerald-700/60',
      icon: ShieldCheck,
      iconColor: 'text-emerald-500',
      title: '🟢 SAFE • Low safety concerns',
      barColor: 'bg-emerald-500',
    },
    CAUTION: {
      bg: isLight ? 'bg-amber-50 border-amber-200 text-slate-900' : 'bg-amber-950/40 border-amber-800/60 text-zinc-100',
      badgeBg: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/10 text-amber-300 border-amber-700/60',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      title: '🟡 BE CAREFUL • Some recent issues reported nearby',
      barColor: 'bg-amber-500',
    },
    HIGH_ALERT: {
      bg: isLight ? 'bg-rose-50 border-rose-200 text-slate-900' : 'bg-rose-950/40 border-rose-800/60 text-zinc-100',
      badgeBg: isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/10 text-rose-300 border-rose-700/60',
      icon: AlertOctagon,
      iconColor: 'text-rose-500',
      title: '🔴 AVOID IF POSSIBLE • Several recent safety concerns',
      barColor: 'bg-rose-500',
    },
    LIMITED_DATA: {
      bg: isLight ? 'bg-slate-100 border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100',
      badgeBg: isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700',
      icon: Info,
      iconColor: 'text-zinc-500',
      title: '⚪ LIMITED SAFETY DATA • No active community reports available',
      barColor: 'bg-zinc-500',
    },
  };

  const hasNoData = incidents.filter(i => !i.isResolved).length === 0;
  const status = hasNoData ? 'LIMITED_DATA' : (pulseData?.safety_status || 'NORMAL');
  const config = statusConfig[status];
  const Icon = config.icon;
  const confidencePercent = hasNoData ? 50 : Math.round((pulseData?.confidence || 0.88) * 100);
  const explanationText = hasNoData
    ? 'Limited safety data in Nagpur area. No active community reports are currently stored in the system. Always maintain normal situational awareness.'
    : (pulseData?.explanation || 'Checking street lighting, pedestrian flow, open shops, and recent verified reports.');

  return (
    <div className={`rounded-2xl border ${config.bg} p-4 sm:p-5 transition-colors duration-200 shadow-md`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Status & Explanation */}
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.badgeBg}`}>
              <Icon className="h-3.5 w-3.5" />
              <span>{config.title}</span>
            </span>

            <span className={`text-xs flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <Clock className="h-3 w-3" />
              <span>Checked at {timeOfDay}</span>
            </span>

            <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <span>Reliability:</span>
              <span className="font-mono font-medium">{confidencePercent}%</span>
              <div className="w-16 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-800 overflow-hidden">
                <div className={`h-full ${config.barColor}`} style={{ width: `${confidencePercent}%` }} />
              </div>
            </div>
          </div>

          <p className="text-sm font-medium leading-relaxed">
            {explanationText}
          </p>

          {/* Action Recommendation */}
          {pulseData?.recommended_action && (
            <div className="flex items-start gap-2 pt-0.5">
              <Compass className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <p className={`text-xs font-medium ${isLight ? 'text-cyan-800' : 'text-cyan-200'}`}>
                <span className="font-bold">Tip:</span> {pulseData.recommended_action}
              </p>
            </div>
          )}

          {/* Recent Signals Chips */}
          {pulseData?.recent_signals && pulseData.recent_signals.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className={`text-[11px] font-semibold mr-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Recent Reports:
              </span>
              {pulseData.recent_signals.map((signal, idx) => (
                <span
                  key={idx}
                  className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] border ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-700'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                  }`}
                >
                  {signal}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Refresh Button */}
        <div
          className={`flex lg:flex-col items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-5 ${
            isLight ? 'border-slate-200' : 'border-zinc-800/80'
          }`}
        >
          <button
            onClick={refreshSafetyPulse}
            disabled={isPulseLoading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-100'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-500 ${isPulseLoading ? 'animate-spin' : ''}`} />
            <span>{isPulseLoading ? 'Checking...' : 'Refresh Safety Check'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
