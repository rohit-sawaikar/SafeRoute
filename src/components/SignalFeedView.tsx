/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Clock,
  TrendingDown,
  Layers,
  Sparkles,
  CheckCircle,
  ThumbsUp,
  RefreshCw,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { fetchAreaSummary, fetchCrossSignalRisk } from '../services/safetyAiService';
import type { AreaSummaryOutput, CrossSignalRiskOutput } from '../types/safety';
import { useApp } from '../context/AppContext';

export const SignalFeedView: React.FC = () => {
  const { incidents, corroborateIncident, resolveIncident, timeOfDay, theme, currentUser, openAuthModal } = useApp();
  const isLight = theme === 'light';

  const [areaSummary, setAreaSummary] = useState<AreaSummaryOutput | null>(null);
  const [crossRisk, setCrossRisk] = useState<CrossSignalRiskOutput | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [filterState, setFilterState] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const handleRefreshSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const [sumRes, crossRes] = await Promise.all([
        fetchAreaSummary({
          areaName: 'Downtown Safety Grid',
          currentObservedIncidents: incidents
            .filter((i) => !i.isResolved)
            .map((i) => `${i.title} (${Math.round(i.minutesAgo)}m ago)`),
          activeLightingSensors: '94% operational along main avenues',
          pedestrianTrafficRating: timeOfDay > '23:00' ? 'LOW' : 'MODERATE',
          weatherCondition: 'Clear skies, 14°C',
          timeOfDay: timeOfDay,
        }),
        fetchCrossSignalRisk({
          activeSignals: [
            { type: 'INCIDENT', description: 'Streetlamp out on Pine St', severity: 'MEDIUM', timestamp: timeOfDay },
            { type: 'ROAD_CLOSURE', description: 'Sidewalk construction barrier', severity: 'LOW', timestamp: timeOfDay },
          ],
          areaType: 'TRANSIT_CORRIDOR',
          timeOfDay: timeOfDay,
        }),
      ]);

      setAreaSummary(sumRes.data);
      setCrossRisk(crossRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterState === 'ACTIVE') return !inc.isResolved;
    if (filterState === 'RESOLVED') return inc.isResolved;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Area Summary & Safety Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          className={`lg:col-span-7 rounded-2xl border p-5 space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm">Area Safety Overview</h3>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Observed local conditions ({timeOfDay})
                </span>
              </div>
            </div>

            <button
              onClick={handleRefreshSummary}
              disabled={isLoadingSummary}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <RefreshCw className={`h-3 w-3 text-cyan-500 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              <span>Refresh Summary</span>
            </button>
          </div>

          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            {areaSummary?.factual_summary ||
              'Main avenues in Downtown Corridor are well-lit with active pedestrian movement and regular shop activity.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            {/* Observed Facts */}
            <div
              className={`rounded-xl border p-3 space-y-1.5 ${
                isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-900/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Verified Facts:</span>
              </div>
              <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                {(areaSummary?.observed_facts || [
                  'Streetlamps active on Market Blvd (94% operational)',
                  `${incidents.filter((i) => !i.isResolved).length} recent reports registered`,
                  'Transit station open with security present',
                ]).map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            </div>

            {/* Predictive Indicators */}
            <div
              className={`rounded-xl border p-3 space-y-1.5 ${
                isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-900/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Travel Tips:</span>
              </div>
              <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                {(areaSummary?.predictive_indicators || [
                  'Foot traffic tapers after 23:00 store closings',
                  'Recommended to walk along brightly lit Market Blvd',
                ]).map((pred, idx) => (
                  <li key={idx}>{pred}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Safety Advisory Overview */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-5 space-y-3 flex flex-col justify-between transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
          }`}
        >
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Combined Safety Insights</h3>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Connecting multiple reports</span>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {crossRisk?.risk_level || 'ADVISORY'}
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              {crossRisk?.emerging_risk_description ||
                'Unlit side alley combined with sidewalk repair encourages walking along the primary well-lit boulevard.'}
            </p>

            <div className={`rounded-xl border p-2.5 text-xs space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
              <span className="font-semibold text-[11px]">Helpful Recommendations:</span>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                {(crossRisk?.preventative_recommendations || [
                  'Use main illuminated Market Blvd instead of Pine St.',
                  'Cross at marked crosswalks only.',
                ]).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`text-[10px] font-mono pt-2 border-t ${isLight ? 'border-slate-200 text-slate-400' : 'border-zinc-800 text-zinc-500'}`}>
            SafeRoute Factual Safety Engine
          </div>
        </div>
      </div>

      {/* Incident Stream */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-500" />
            <h3 className="font-bold text-sm">Recent Community Reports</h3>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterState('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                filterState === 'ALL'
                  ? isLight
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-zinc-800 text-white'
                  : isLight
                  ? 'text-slate-500'
                  : 'text-zinc-500'
              }`}
            >
              All ({incidents.length})
            </button>
            <button
              onClick={() => setFilterState('ACTIVE')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                filterState === 'ACTIVE'
                  ? isLight
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-zinc-800 text-rose-300'
                  : isLight
                  ? 'text-slate-500'
                  : 'text-zinc-500'
              }`}
            >
              Active ({incidents.filter((i) => !i.isResolved).length})
            </button>
            <button
              onClick={() => setFilterState('RESOLVED')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                filterState === 'RESOLVED'
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-800 text-emerald-300'
                  : isLight
                  ? 'text-slate-500'
                  : 'text-zinc-500'
              }`}
            >
              Resolved ({incidents.filter((i) => i.isResolved).length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredIncidents.map((inc) => {
            const decayFactor = Math.max(0.15, Math.exp(-inc.minutesAgo / 50));
            const currentConfidence = Math.round(inc.confidence * decayFactor * 100);

            return (
              <div
                key={inc.id}
                className={`rounded-2xl border p-4 space-y-3 flex flex-col justify-between transition-all ${
                  inc.isResolved
                    ? isLight
                      ? 'border-slate-200 bg-slate-50 opacity-70'
                      : 'border-zinc-800/60 bg-zinc-950/60 opacity-60'
                    : isLight
                    ? 'border-slate-200 bg-white shadow-xs'
                    : 'border-zinc-800 bg-zinc-950'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {inc.category.replace('_', ' ')}
                    </span>
                    <span className={`text-[11px] flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      <Clock className="h-3 w-3" />
                      <span>{Math.round(inc.minutesAgo)}m ago</span>
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs leading-snug">{inc.title}</h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      {inc.description}
                    </p>
                    <p className={`text-[11px] font-mono mt-1 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{inc.location.name}</p>
                  </div>

                  {/* Confidence Decay */}
                  <div
                    className={`rounded-xl border p-2.5 space-y-1.5 text-[11px] ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-amber-500" /> Report Reliability:
                      </span>
                      <span className="font-mono font-bold">{currentConfidence}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full ${
                          currentConfidence > 70
                            ? 'bg-emerald-500'
                            : currentConfidence > 40
                            ? 'bg-amber-500'
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${currentConfidence}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={`border-t pt-3 space-y-2 text-xs ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{inc.corroborations} confirmations</span>
                    {inc.isResolved && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>

                  {!inc.isResolved && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => currentUser ? corroborateIncident(inc.id) : openAuthModal()}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                            : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3 text-cyan-500" />
                        <span>Confirm</span>
                      </button>

                      <button
                        onClick={() => currentUser ? resolveIncident(inc.id) : openAuthModal()}
                        className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Cleared</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
