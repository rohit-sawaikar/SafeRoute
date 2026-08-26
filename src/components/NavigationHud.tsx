/**
 * SafeHeaven Active Navigation HUD & Real-Time Dynamic Route Caution Engine
 * 
 * Features:
 * - 5-Star Safety Rating (★★★★★) permanently visible during travel
 * - Dynamic route cautions with real-time distance countdown
 * - Pass detection when user maneuvers past the hazard
 * - Mode-specific caution recommendations
 * - Destination arrival summary logged to Trip Safety History
 * - Full Day / Night Mode support
 */

import React, { useMemo, useState } from 'react';
import {
  Navigation,
  Clock,
  Shield,
  Square,
  Pause,
  Play,
  AlertTriangle,
  ArrowUpRight,
  CornerUpRight,
  CheckCircle,
  FastForward,
  Award,
  Footprints,
  Radio,
  Car,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSafetyStarRating } from '../types/safety';

export const NavigationHud: React.FC = () => {
  const {
    navigation,
    stopNavigation,
    togglePauseNavigation,
    advanceSimulationStep,
    applySuggestedReroute,
    continueCurrentRoute,
    closeCompletionSummary,
    routeScores,
    openFollowedMode,
    incidents,
    theme,
    corroborateIncident,
    disputeIncident,
    resolveIncident,
  } = useApp();

  const isLight = theme === 'light';
  const [surveySubmitted, setSurveySubmitted] = useState<boolean>(false);
  const [surveyMessage, setSurveyMessage] = useState<string | null>(null);
  const [answeredIncidentIds, setAnsweredIncidentIds] = useState<string[]>([]);

  const nearbyPassIncident = useMemo(() => {
    if (!navigation.isNavigating || navigation.arrivalState === 'COMPLETED_SUMMARY') return null;
    const userLat = navigation.currentPosition.lat;
    const userLng = navigation.currentPosition.lng;

    const activeIncidents = incidents.filter(i => !i.isResolved && i.status !== 'REJECTED' && i.status !== 'EXPIRED');
    for (const inc of activeIncidents) {
      const dLat = (inc.location.lat - userLat) * 111000;
      const dLng = (inc.location.lng - userLng) * 111000 * Math.cos((userLat * Math.PI) / 180);
      const distMeters = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

      // If user is within 300 meters of the incident
      if (distMeters <= 300) {
        return {
          incidentId: inc.id,
          category: inc.category,
          description: inc.description,
          distanceMeters: distMeters,
        };
      }
    }
    return null;
  }, [navigation.currentPosition, incidents, navigation.isNavigating, navigation.arrivalState]);

  const showReviewPrompt = nearbyPassIncident && !answeredIncidentIds.includes(nearbyPassIncident.incidentId);

  const handleSurveySubmit = async (option: string) => {
    setSurveySubmitted(true);
    try {
      const routeCoords = navigation.steps.map((s) => s.point);
      if (option === 'NOTHING') {
        const nearby = incidents.filter((i) => !i.isResolved);
        let disputedCount = 0;
        for (const inc of nearby) {
          let isNearby = false;
          routeCoords.forEach((pt) => {
            const dLat = pt.lat - inc.location.lat;
            const dLng = pt.lng - inc.location.lng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
            if (dist <= 400) isNearby = true;
          });
          if (isNearby) {
            await disputeIncident(inc.id);
            disputedCount++;
          }
        }
        setSurveyMessage(disputedCount > 0 ? 'Thank you! We have updated the reliability of nearby reports.' : 'Thank you for verifying local conditions!');
      } else if (option === 'NOT_SURE') {
        setSurveyMessage('Thank you for helping keep the map accurate!');
      } else {
        const optionMap: Record<string, string> = {
          'ACCIDENT': 'ACCIDENT',
          'CONSTRUCTION': 'CONSTRUCTION',
          'ROAD_BLOCKAGE': 'ROAD_BLOCKAGE',
          'SAFETY_ISSUE': 'UNSAFE_INFRASTRUCTURE'
        };
        const targetCat = optionMap[option];
        const nearby = incidents.filter((i) => !i.isResolved && (i.category === targetCat || targetCat === 'UNSAFE_INFRASTRUCTURE'));
        let corroborated = false;
        for (const inc of nearby) {
          let isNearby = false;
          routeCoords.forEach((pt) => {
            const dLat = pt.lat - inc.location.lat;
            const dLng = pt.lng - inc.location.lng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
            if (dist <= 400) isNearby = true;
          });
          if (isNearby) {
            await corroborateIncident(inc.id);
            corroborated = true;
          }
        }
        setSurveyMessage(corroborated ? 'Thank you! Your feedback corroborates recent nearby reports.' : 'Thank you! Your signal has been registered.');
      }
    } catch (e) {
      console.error(e);
      setSurveyMessage('Thank you for your feedback!');
    }
  };

  if (!navigation.isNavigating && navigation.arrivalState !== 'COMPLETED_SUMMARY') return null;

  const currentRoute = routeScores.find((r) => r.route_id === navigation.activeRouteId) || {
    name: navigation.routeName || navigation.destinationName,
    safety_score: 88,
    star_rating: getSafetyStarRating(88),
  };

  const starRating = currentRoute.star_rating || getSafetyStarRating(currentRoute.safety_score);

  const currentStep = navigation.steps[navigation.currentStepIndex] || {
    text: 'Proceed along marked route corridor',
    safetyNote: 'Stay on illuminated sidewalk with municipal lighting',
  };

  const nextStep = navigation.steps[navigation.currentStepIndex + 1];

  const formatRemainingDistance = (km: number) => {
    if (km <= 0) return '0 m';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  // Dynamic In-Route Incident Caution Calculation
  const activeRouteCaution = useMemo(() => {
    const userLat = navigation.currentPosition.lat;
    const userLng = navigation.currentPosition.lng;

    const nearby = incidents.filter((i) => !i.isResolved && i.confidence >= 0.70);
    if (nearby.length === 0) return null;

    for (const inc of nearby) {
      const dLat = (inc.location.lat - userLat) * 111000;
      const dLng = (inc.location.lng - userLng) * 111000 * Math.cos((userLat * Math.PI) / 180);
      const distMeters = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

      if (distMeters > 30 && distMeters < 800) {
        return {
          incidentId: inc.id,
          category: inc.category,
          title: `${String(inc.category).replace('_', ' ')} Ahead`,
          description: inc.description,
          distanceMeters: distMeters,
          confidencePercent: Math.round(inc.confidence * 100),
          recommendedAction: navigation.travelMode === 'VEHICLE'
            ? 'Traffic slow ahead. Consider taking the wider bypass if delay increases.'
            : 'Keep to the bright side of the road with open stores.',
        };
      }
    }
    return null;
  }, [navigation.currentPosition, incidents, navigation.travelMode]);

  // --- STATE 1: DESTINATION REACHED - FULL COMPLETION SUMMARY ---
  if (navigation.arrivalState === 'COMPLETED_SUMMARY' && navigation.completedSummary) {
    const summary = navigation.completedSummary;

    return (
      <div
        className={`rounded-2xl border-2 p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-400 ${isLight
          ? 'bg-white border-emerald-500 text-slate-900 shadow-slate-300'
          : 'bg-zinc-950 border-emerald-500 text-white shadow-emerald-950/40'
          }`}
      >
        {/* Celebration Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-500 shrink-0 shadow-lg">
              <CheckCircle className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">Safe Arrival Verified</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold">
                  {summary.starDisplay} {summary.safetyScore}/100
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Arrived safely at <span className="font-semibold">{summary.destinationName}</span> at {summary.completedAt} ({summary.travelMode})
              </p>
            </div>
          </div>

          <button
            onClick={closeCompletionSummary}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span>Done & Return to Map</span>
          </button>
        </div>

        {/* Trip Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-xl p-3 border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              {summary.travelMode === 'VEHICLE' ? <Car className="h-3.5 w-3.5 text-indigo-500" /> : <Footprints className="h-3.5 w-3.5 text-cyan-500" />}
              <span>Total Distance</span>
            </div>
            <div className="font-mono font-bold text-lg">{summary.totalDistanceKm} km</div>
          </div>

          <div className={`rounded-xl p-3 border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Travel Time</span>
            </div>
            <div className="font-mono font-bold text-lg">{summary.travelTimeMin} min</div>
          </div>

          <div className={`rounded-xl p-3 border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Safety Rating</span>
            </div>
            <div className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">{summary.starDisplay}</div>
          </div>

          <div className={`rounded-xl p-3 border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Award className="h-3.5 w-3.5 text-purple-500" />
              <span>Safety Hazards Avoided</span>
            </div>
            <div className="font-mono font-bold text-lg text-purple-600 dark:text-purple-300">
              {summary.incidentsAvoided > 0 ? `${summary.incidentsAvoided} Bypassed` : 'Clear Path'}
            </div>
          </div>
        </div>

        {/* Safety Check Survey Panel */}
        <div className={`p-4 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <h4 className="font-bold text-xs flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
            <Radio className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
            <span>Safety Check Survey</span>
          </h4>
          {!surveySubmitted ? (
            <>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Did you notice any incidents or safety issues during your trip? Your answer is processed anonymously.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'ACCIDENT', label: 'Accident' },
                  { id: 'CONSTRUCTION', label: 'Construction' },
                  { id: 'ROAD_BLOCKAGE', label: 'Road blockage' },
                  { id: 'SAFETY_ISSUE', label: 'Safety issue' },
                  { id: 'NOTHING', label: 'Nothing unusual' },
                  { id: 'NOT_SURE', label: 'Not sure' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSurveySubmit(opt.id)}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${isLight
                      ? 'bg-white border-slate-350 hover:bg-slate-100 text-slate-800'
                      : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-zinc-300'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle className="h-4 w-4" />
              <span>{surveyMessage || 'Thank you for your feedback!'}</span>
            </p>
          )}
        </div>

        {/* Route Highlights Footer */}
        <div className={`rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'}`}>
          <span>
            Followed: <span className="font-semibold">{summary.routeName}</span>
          </span>
          <span className="text-[11px]">
            Trip recorded in Safety History
          </span>
        </div>
      </div>
    );
  }

  // --- STATE 2: JUST REACHED ---
  if (navigation.arrivalState === 'JUST_REACHED') {
    return (
      <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-600 text-white p-5 shadow-2xl space-y-2 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 font-bold shadow-md">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">✓ You have reached your destination.</h3>
            <p className="text-xs opacity-90">Saving trip safety recap...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- STATE 3: LIVE ACTIVE NAVIGATION ---
  return (
    <div
      className={`rounded-2xl border-2 p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 transition-colors duration-200 ${isLight
        ? 'bg-white border-cyan-500 text-slate-900 shadow-slate-300'
        : 'bg-zinc-950 border-cyan-500 text-white shadow-cyan-950/40'
        }`}
    >
      {/* Route Review Bot Verification Overlay */}
      {showReviewPrompt && nearbyPassIncident && (
        <div
          className={`rounded-2xl border p-4 shadow-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-colors ${isLight
            ? 'bg-cyan-50/70 border-cyan-200 text-slate-950 shadow-xs'
            : 'bg-gradient-to-r from-zinc-950 via-cyan-950/20 to-zinc-950 border-cyan-800/60 text-zinc-150'
            }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-600/10 border border-cyan-800/30 flex items-center justify-center shrink-0 mt-0.5 animate-pulse text-cyan-400">
                <Radio className="h-4.5 w-4.5 text-cyan-500" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs">Route Review Bot</h4>
                <p className={`text-xs ${isLight ? 'text-slate-800' : 'text-zinc-300'} leading-relaxed`}>
                  You just passed the reported <span className="font-semibold">{nearbyPassIncident.category.replace('_', ' ').toLowerCase()}</span> (~{nearbyPassIncident.distanceMeters}m away). Did you observe it?
                </p>
                <p className={`text-[10px] italic ${isLight ? 'text-slate-655' : 'text-zinc-500'}`}>
                  "{nearbyPassIncident.description}"
                </p>
              </div>
            </div>

            <button
              onClick={() => setAnsweredIncidentIds(prev => [...prev, nearbyPassIncident.incidentId])}
              className={`rounded-lg p-1 transition-colors ${isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              onClick={async () => {
                await disputeIncident(nearbyPassIncident.incidentId);
                setAnsweredIncidentIds(prev => [...prev, nearbyPassIncident.incidentId]);
              }}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-850'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                }`}
            >
              No, Clear Path
            </button>
            <button
              onClick={async () => {
                await corroborateIncident(nearbyPassIncident.incidentId);
                setAnsweredIncidentIds(prev => [...prev, nearbyPassIncident.incidentId]);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-md transition-transform active:scale-95"
            >
              Yes, Observed
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md animate-pulse">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">Active Navigation</span>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-mono flex items-center gap-1 ${isLight
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  }`}
              >
                {navigation.travelMode === 'VEHICLE' ? <Car className="h-3 w-3" /> : <Footprints className="h-3 w-3" />}
                <span>{navigation.travelMode}</span>
              </span>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {navigation.speedKmh} km/h speed
              </span>
            </div>
            <p className={`text-xs truncate max-w-md mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Destination: <span className="font-semibold">{navigation.destinationName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={advanceSimulationStep}
            title="Advance position along route"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-cyan-300'
              }`}
          >
            <FastForward className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Next Step</span>
          </button>

          <button
            onClick={togglePauseNavigation}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
              }`}
          >
            {navigation.isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-500" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            onClick={stopNavigation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Square className="h-3.5 w-3.5" />
            <span>End Route</span>
          </button>
        </div>
      </div>

      {/* Dynamic Caution Card */}
      {activeRouteCaution && (
        <div
          className={`rounded-xl border-2 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-300 ${isLight
            ? 'bg-amber-50 border-amber-400 text-amber-950'
            : 'bg-amber-950/80 border-amber-500 text-amber-100'
            }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">⚠️ CAUTION AHEAD: {activeRouteCaution.title}</span>
                <span className="px-2 py-0.2 bg-amber-500 text-white rounded text-[10px] font-mono font-bold">
                  ~{activeRouteCaution.distanceMeters} m ahead
                </span>
              </div>
              <p className="text-xs leading-relaxed">{activeRouteCaution.description}</p>
              <p className="text-[11px] font-medium italic">{activeRouteCaution.recommendedAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Static Reroute Notice */}
      {navigation.rerouteNotice && (
        <div
          className={`rounded-xl border-2 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${isLight
            ? 'bg-amber-50 border-amber-400 text-amber-950'
            : 'bg-amber-950/80 border-amber-500 text-amber-100'
            }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm">{navigation.rerouteNotice.title}</span>
              <p className="text-xs leading-relaxed">{navigation.rerouteNotice.text}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
            <button
              onClick={continueCurrentRoute}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                }`}
            >
              Stay on Route
            </button>
            <button
              onClick={applySuggestedReroute}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Take Safer Alternate
            </button>
          </div>
        </div>
      )}

      {/* Turn-by-Turn Instruction Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className={`md:col-span-8 rounded-xl border p-4 space-y-2.5 flex flex-col justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  Step {navigation.currentStepIndex + 1} of {navigation.steps.length}
                </span>
                <span className="text-gray-400 text-[11px]">•</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {formatRemainingDistance(navigation.distanceRemainingKm)} left
                </span>
              </div>
              <h3 className="font-bold text-base leading-snug">{currentStep.text}</h3>
              {currentStep.safetyNote && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>{currentStep.safetyNote}</span>
                </p>
              )}
            </div>
          </div>

          {nextStep && (
            <div className={`pt-2.5 border-t flex items-center gap-2 text-xs ${isLight ? 'border-slate-200 text-slate-600' : 'border-zinc-800 text-zinc-400'}`}>
              <CornerUpRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Then: {nextStep.text}</span>
            </div>
          )}
        </div>

        {/* Real-Time Metrics & Safety Rating */}
        <div className={`md:col-span-4 rounded-xl border p-4 space-y-3 flex flex-col justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={`rounded-lg p-2 border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'}`}>
              <div className="text-[10px] text-gray-500">ETA Left</div>
              <div className="font-mono font-bold text-lg">~{navigation.etaMinutes} min</div>
            </div>
            <div className={`rounded-lg p-2 border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'}`}>
              <div className="text-[10px] text-gray-500">Distance</div>
              <div className="font-mono font-bold text-lg text-cyan-600 dark:text-cyan-400">
                {formatRemainingDistance(navigation.distanceRemainingKm)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-xs">
            <span className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              <Shield className="h-3.5 w-3.5 text-emerald-500" /> Safety:
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {starRating.starDisplay} ({currentRoute.safety_score}/100)
            </span>
          </div>

          <button
            onClick={openFollowedMode}
            className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Emergency Followed Mode</span>
          </button>
        </div>
      </div>

      {/* Progress Bar along route */}
      <div className="space-y-1">
        <div className={`flex items-center justify-between text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          <span>Journey Progress</span>
          <span className="font-mono font-semibold">{navigation.progressPercent}% Completed</span>
        </div>
        <div className={`w-full h-2.5 rounded-full border overflow-hidden ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-zinc-900 border-zinc-800'}`}>
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${navigation.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
