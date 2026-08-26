/**
 * SafeHeaven Safer Route Comparative Scorer & Safety-First Intelligence Engine
 * 
 * Features:
 * - Human-friendly wording and intuitive 5-Star ratings
 * - Day / Night theme support
 * - Mode-specific models (🚗 Vehicle vs 🚶 Walking)
 * - Explicit Safety vs Time Tradeoff comparison
 * - "Why this route is rated" explanation drawer
 * - Responsive stacked mobile cards
 */

import React, { useState } from 'react';
import {
  Navigation,
  Shield,
  Sun,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Car,
  Footprints,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface RouteScoringViewProps {
  onSelectRouteTab?: () => void;
}

export const RouteScoringView: React.FC<RouteScoringViewProps> = ({ onSelectRouteTab }) => {
  const {
    routeScores,
    selectedRouteId,
    setSelectedRouteId,
    startNavigation,
    stopNavigation,
    navigation,
    timeOfDay,
    travelMode,
    setTravelMode,
    routePriority,
    setRoutePriority,
    refreshRouteScores,
    isRouteScoringLoading,
    theme,
    destinationLocation,
    currentUser,
    openAuthModal,
    incidents,
  } = useApp();

  const isLight = theme === 'light';
  const [expandedId, setExpandedId] = useState<string | null>(routeScores[0]?.route_id || null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const safestRoute = routeScores[0];
  const fastestRoute = routeScores.length > 1 ? routeScores[1] : routeScores[0];
  const timeDifferenceMinutes = safestRoute && fastestRoute
    ? Math.max(0, safestRoute.est_time_min - fastestRoute.est_time_min)
    : 0;

  const isDataScarce = navigation.gpsMode === 'SIMULATED' || !incidents || incidents.filter(i => !i.isResolved).length === 0;

  if (!destinationLocation) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`rounded-2xl border p-8 sm:p-12 text-center shadow-lg space-y-5 max-w-md w-full transition-colors duration-200 ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200' : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-black'
            }`}
        >
          <div className="h-12 w-12 rounded-full bg-cyan-600/10 text-cyan-400 flex items-center justify-center border border-cyan-800/30 mx-auto">
            <Navigation className="h-6 w-6 text-cyan-500 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base">Select a Destination First</h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-650' : 'text-zinc-400'}`}>
              Safer routes cannot be calculated without a destination. Please go to the Live Map and choose where you are heading.
            </p>
          </div>
          <button
            onClick={onSelectRouteTab}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-transform active:scale-95 shadow-md shadow-cyan-950/25"
          >
            Go to Live Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HERO CONTROLS & TRAVEL MODE HEADER */}
      <div
        className={`rounded-2xl border p-5 shadow-lg space-y-4 transition-colors duration-200 ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
          }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
                <Shield className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold">Choose Your Safer Route</h2>
            </div>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-650' : 'text-zinc-400'}`}>
              Safety evaluation for your journey at <span className="font-semibold">{timeOfDay}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Travel Mode Toggle */}
            <div
              className={`flex items-center p-1 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-zinc-900 border-zinc-800'
                }`}
            >
              <button
                onClick={() => setTravelMode('WALKING')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${travelMode === 'WALKING'
                  ? isLight
                    ? 'bg-white text-cyan-800 border border-slate-200 shadow-xs'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-xs'
                  : isLight
                    ? 'text-slate-650 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <Footprints className="h-3.5 w-3.5" />
                <span>🚶 Walking</span>
              </button>
              <button
                onClick={() => setTravelMode('VEHICLE')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${travelMode === 'VEHICLE'
                  ? isLight
                    ? 'bg-white text-indigo-800 border border-slate-200 shadow-xs'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-xs'
                  : isLight
                    ? 'text-slate-650 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <Car className="h-3.5 w-3.5" />
                <span>🚗 Driving</span>
              </button>
            </div>

            <button
              onClick={refreshRouteScores}
              disabled={isRouteScoringLoading}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 ${isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
            >
              <Sparkles className={`h-3.5 w-3.5 text-cyan-500 ${isRouteScoringLoading ? 'animate-spin' : ''}`} />
              <span>{isRouteScoringLoading ? 'Checking...' : 'Re-Check Routes'}</span>
            </button>
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div className={`flex items-center gap-2 pt-1 overflow-x-auto text-xs border-t ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
          <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            Priority:
          </span>
          <button
            onClick={() => setRoutePriority('SAFETY')}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${routePriority === 'SAFETY'
              ? isLight
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
          >
            🛡️ Maximum Safety
          </button>
          <button
            onClick={() => setRoutePriority('BALANCED')}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${routePriority === 'BALANCED'
              ? isLight
                ? 'bg-cyan-100 text-cyan-900 border-cyan-300 shadow-xs'
                : 'bg-cyan-950 text-cyan-300 border-cyan-700'
              : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
          >
            ⚖️ Safety + Time
          </button>
          <button
            onClick={() => setRoutePriority('TIME')}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${routePriority === 'TIME'
              ? isLight
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-amber-950 text-amber-300 border-amber-700'
              : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
          >
            ⚡ Faster Travel
          </button>
        </div>
      </div>

      {/* Scarce Data Warning Banner */}
      {isDataScarce && (
        <div
          className={`rounded-2xl border p-4.5 shadow-lg flex items-start gap-4 transition-colors duration-200 ${isLight
            ? 'bg-amber-50/70 border-amber-200 text-amber-900 shadow-xs'
            : 'bg-gradient-to-r from-zinc-950 via-amber-950/20 to-zinc-950 border-amber-900/60 text-amber-200'
            }`}
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold">Limited safety data</h4>
            <p className={`${isLight ? 'text-amber-800 font-medium' : 'text-amber-300'} leading-relaxed`}>
              The safety engine is operating under a simulated GPS environment or sparse verification sensor feeds. Route ratings reflect standard municipal baselines rather than high-density real-time telemetry.
            </p>
          </div>
        </div>
      )}

      {/* 2. SAFETY VS TIME TRADEOFF COMPARISON */}
      {timeDifferenceMinutes > 0 && safestRoute && fastestRoute && (
        <div
          className={`rounded-2xl border p-4.5 shadow-lg space-y-2 transition-colors duration-200 ${isLight
            ? 'bg-cyan-50/70 border-cyan-200 text-slate-900'
            : 'bg-gradient-to-r from-zinc-950 via-cyan-950/20 to-zinc-950 border-cyan-800/60 text-zinc-100'
            }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
            <Info className="h-4 w-4 text-cyan-500" />
            <span>Safety vs. Travel Time Comparison</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${isLight ? 'bg-white border-emerald-300 shadow-xs' : 'bg-emerald-950/40 border-emerald-800/80'
                }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  🛡️ Safest Choice
                </span>
                <span className="font-bold text-xs">{safestRoute.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{safestRoute.star_rating.starDisplay}</span>
                <span className={`text-[11px] block font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{safestRoute.est_time_min} mins</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  ⚡ Fastest Choice
                </span>
                <span className="font-bold text-xs">{fastestRoute.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-300">{fastestRoute.star_rating.starDisplay}</span>
                <span className={`text-[11px] block font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{fastestRoute.est_time_min} mins</span>
              </div>
            </div>
          </div>

          <p className={`text-xs pt-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            You save <b>{timeDifferenceMinutes} minutes</b> by choosing the faster shortcut, but the safer route has a higher <span className="text-emerald-600 dark:text-emerald-400 font-bold">{safestRoute.star_rating.label} ({safestRoute.star_rating.starDisplay})</span> safety rating.
          </p>
        </div>
      )}

      {/* 3. ROUTE CARDS */}
      <div className="grid grid-cols-1 gap-4">
        {routeScores.map((route, idx) => {
          const isSelected = selectedRouteId === route.route_id;
          const isNavigatingThis = navigation.isNavigating && navigation.activeRouteId === route.route_id;
          const isExpanded = expandedId === route.route_id;
          const isSafest = idx === 0;
          const isFastest = idx === 1;

          return (
            <div
              key={route.route_id}
              className={`rounded-2xl border transition-all duration-150 ${isNavigatingThis
                ? isLight
                  ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/40 shadow-lg'
                  : 'border-cyan-400 bg-zinc-900 ring-2 ring-cyan-500/50 shadow-xl'
                : isSelected
                  ? isLight
                    ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/30 shadow-lg'
                    : 'border-emerald-500 bg-zinc-900 ring-2 ring-emerald-500/30 shadow-lg'
                  : isLight
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
            >
              <div className="p-5 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSafest
                          ? 'bg-emerald-600 text-white'
                          : isFastest
                            ? 'bg-amber-500 text-white'
                            : isLight
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                      >
                        {isSafest ? '🛡️ SAFEST ROUTE' : isFastest ? '⚡ FASTEST ROUTE' : `OPTION ${idx + 1}`}
                      </span>

                      {isNavigatingThis && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-600 text-white animate-pulse">
                          ● Navigating
                        </span>
                      )}

                      <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        Mode: {travelMode}
                      </span>
                    </div>

                    <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {route.name}
                    </h3>
                  </div>

                  {/* 5-Star Safety Badge */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-4 py-2 rounded-xl border text-center ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : route.star_rating.badgeClass
                        }`}
                    >
                      <div className="text-sm font-bold font-mono tracking-widest leading-none text-emerald-600 dark:text-emerald-400">
                        {route.star_rating.starDisplay}
                      </div>
                      <div className="text-[10px] uppercase font-bold tracking-wider mt-1">
                        {route.star_rating.label} ({route.safety_score}/100)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Estimated Time</div>
                    <div className="font-mono font-bold flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{route.est_time_min} mins</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Distance</div>
                    <div className="font-mono font-bold mt-0.5">{route.distance_km} km</div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      {travelMode === 'VEHICLE' ? 'Traffic Condition' : 'Street Lighting'}
                    </div>
                    <div className="font-semibold text-amber-600 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                      <Sun className="h-3.5 w-3.5" />
                      <span>{travelMode === 'VEHICLE' ? (idx === 0 ? 'Smooth Flow' : 'Moderate Traffic') : route.lighting_rating}</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      {travelMode === 'VEHICLE' ? 'Accident Risk' : 'People Walking'}
                    </div>
                    <div className="font-semibold text-cyan-600 dark:text-cyan-300 flex items-center gap-1 mt-0.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{travelMode === 'VEHICLE' ? (idx === 0 ? 'Low Risk' : 'Moderate') : route.activity_level}</span>
                    </div>
                  </div>
                </div>

                {/* "Why this route is rated" Factor Box */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-300">
                      <Award className="h-3.5 w-3.5" />
                      <span>Why this route is rated {route.star_rating.label}:</span>
                    </span>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      Verified Conditions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {route.safety_factors_explained.map((factor, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expandable Score Breakdown */}
                {isExpanded && (
                  <div
                    className={`rounded-xl border p-4 space-y-3 text-xs animate-in fade-in duration-200 ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
                      }`}
                  >
                    <div className={`font-semibold text-xs border-b pb-2 flex items-center justify-between ${isLight ? 'border-slate-200 text-slate-800' : 'border-zinc-800 text-zinc-300'}`}>
                      <span>Safety Score Breakdown ({travelMode}):</span>
                      <span className="font-mono">{route.safety_score}/100</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {travelMode === 'VEHICLE' ? (
                        <>
                          <div className="space-y-1">
                            <div className={`flex justify-between text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                              <span>Accident Avoidance</span>
                              <span className="font-mono font-bold">{route.score_breakdown.accident_avoidance || 25}/30</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${((route.score_breakdown.accident_avoidance || 25) / 30) * 100}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className={`flex justify-between text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                              <span>Traffic Flow</span>
                              <span className="font-mono font-bold">{route.score_breakdown.traffic_flow_rating || 22}/25</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-cyan-500" style={{ width: `${((route.score_breakdown.traffic_flow_rating || 22) / 25) * 100}%` }} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className={`flex justify-between text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                              <span>Street Lighting</span>
                              <span className="font-mono font-bold">{route.score_breakdown.lighting || 24}/25</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${((route.score_breakdown.lighting || 24) / 25) * 100}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className={`flex justify-between text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                              <span>Sidewalks & Crossings</span>
                              <span className="font-mono font-bold">{route.score_breakdown.pedestrian_infrastructure || 22}/25</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-cyan-500" style={{ width: `${((route.score_breakdown.pedestrian_infrastructure || 22) / 25) * 100}%` }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Actions Row */}
                <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
                  <button
                    onClick={() => toggleExpand(route.route_id)}
                    className={`text-xs flex items-center gap-1 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>Hide Details</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRouteId(route.route_id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${isSelected
                        ? isLight
                          ? 'bg-slate-200 border-slate-400 text-slate-900'
                          : 'bg-zinc-800 border-zinc-600 text-white'
                        : isLight
                          ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                      {isSelected ? 'Selected' : 'Show on Map'}
                    </button>

                    {isNavigatingThis ? (
                      <button
                        onClick={stopNavigation}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-transform active:scale-95 shadow-md shadow-rose-950/40"
                      >
                        <Square className="h-3.5 w-3.5" />
                        <span>End Route</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!currentUser) {
                            openAuthModal();
                          } else {
                            startNavigation(route.route_id);
                            onSelectRouteTab?.();
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-transform active:scale-95 shadow-md text-white ${isSafest ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
                          }`}
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>CHOOSE THIS ROUTE</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reassuring Notice */}
      <div
        className={`p-4 rounded-xl border text-[11px] flex items-start gap-2.5 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-400'
          }`}
      >
        <Info className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">SafeRoute Safety Advisory:</span> Scores reflect physical factors (streetlights, open stores, clear sidewalks, emergency vehicle access) so you can choose the route you feel most comfortable taking.
        </div>
      </div>
    </div>
  );
};
