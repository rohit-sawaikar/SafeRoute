/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  MapPin,
  CheckCircle,
  Navigation,
  Filter,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Building2,
  Cross,
  Pill,
  Bus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafeHavenCandidate, SafeHavenType } from '../types/safety';

export const SafeHavensDirectory: React.FC = () => {
  const {
    safeHavens,
    havenRankingData,
    isHavenRankingLoading,
    refreshHavenRanking,
    navigateToHaven,
    navigation,
    theme,
    currentUser,
    openAuthModal,
    isPoiLoading,
    poiError,
    refreshNearbyPlaces,
  } = useApp();

  const isLight = theme === 'light';
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredHavens = safeHavens.filter((haven) => {
    if (filterType === 'ALL') return true;
    if (filterType === '24_7') return haven.is_open_now;
    if (filterType === 'POLICE_FIRE') return haven.type === 'POLICE_STATION' || haven.type === 'FIRE_STATION';
    if (filterType === 'PHARMACY') return haven.type === 'PHARMACY_24_7';
    if (filterType === 'TRANSIT') return haven.type === 'TRANSIT_HUB';
    return true;
  });

  const getCategoryBadge = (type: SafeHavenType) => {
    switch (type) {
      case 'POLICE_STATION':
        return { label: 'Police Station', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Building2 };
      case 'FIRE_STATION':
        return { label: 'Fire Station', bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: Building2 };
      case 'HOSPITAL':
        return { label: 'Hospital & Clinic', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: Cross };
      case 'PHARMACY_24_7':
        return { label: 'Pharmacy', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', icon: Pill };
      case 'TRANSIT_HUB':
        return { label: 'Transit Hub', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Bus };
      default:
        return { label: 'Verified Sanctuary', bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', icon: Shield };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`rounded-2xl border p-5 shadow-lg transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Shield className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold">Nearby Help & Emergency Places</h2>
            </div>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Real-time OpenStreetMap POIs centered on your GPS position.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshNearbyPlaces}
              disabled={isPoiLoading}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 disabled:opacity-50 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
              title="Refresh live POI search"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPoiLoading ? 'animate-spin' : ''}`} />
              <span>Refresh POIs</span>
            </button>

            <button
              onClick={refreshHavenRanking}
              disabled={isHavenRankingLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 disabled:opacity-50 ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-950 hover:bg-emerald-900 border-emerald-800 text-emerald-200'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isHavenRankingLoading ? 'animate-spin' : ''}`} />
              <span>{isHavenRankingLoading ? 'Checking...' : 'Find Best Havens'}</span>
            </button>
          </div>
        </div>

        {/* Top Recommendation */}
        {havenRankingData?.top_recommendation_reason && (
          <div
            className={`mt-3.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-800/80 text-emerald-200/90'
            }`}
          >
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Top Recommendation:</span>{' '}
              {havenRankingData.top_recommendation_reason}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`text-xs font-semibold mr-1 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
          <Filter className="h-3.5 w-3.5" /> Filter:
        </span>
        {[
          { id: 'ALL', label: `All Places (${safeHavens.length})` },
          { id: '24_7', label: 'Open Now' },
          { id: 'POLICE_FIRE', label: 'Police & Emergency' },
          { id: 'PHARMACY', label: 'Pharmacies' },
          { id: 'TRANSIT', label: 'Transit Hubs' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
              filterType === f.id
                ? isLight
                  ? 'bg-slate-200 border-slate-300 text-slate-900'
                  : 'bg-zinc-800 border-zinc-600 text-white'
                : isLight
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isPoiLoading && (
        <div className={`p-12 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
        }`}>
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Searching Live OpenStreetMap POIs...</h3>
            <p className="text-xs text-gray-500">Querying real nearby police stations, hospitals, pharmacies, and transit hubs within 3km.</p>
          </div>
        </div>
      )}

      {/* Error / Empty State */}
      {!isPoiLoading && (poiError || filteredHavens.length === 0) && (
        <div className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center space-y-4 ${
          isLight ? 'bg-amber-50/50 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-800/80 text-amber-200'
        }`}>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-bold text-base">Unable to load nearby places</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {poiError || 'No matching emergency places found around your current GPS coordinates.'}
            </p>
          </div>
          <button
            onClick={refreshNearbyPlaces}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Search</span>
          </button>
        </div>
      )}

      {/* Havens Grid */}
      {!isPoiLoading && filteredHavens.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHavens.map((haven, idx) => {
            const isRankOne = idx === 0;
            const isNavigatingHere = navigation.isNavigating && navigation.destinationName === haven.name;
            const categoryInfo = getCategoryBadge(haven.type);
            const CategoryIcon = categoryInfo.icon;

            return (
              <div
                key={haven.id}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isNavigatingHere
                    ? isLight
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-500'
                      : 'border-emerald-400 bg-emerald-950/30 shadow-xl ring-2 ring-emerald-500'
                    : isRankOne
                    ? isLight
                      ? 'border-emerald-400 bg-white shadow-md'
                      : 'border-emerald-500/80 bg-zinc-900/90 shadow-xl'
                    : isLight
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-800 text-zinc-300'}`}>
                        #{idx + 1}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${categoryInfo.bg}`}>
                        <CategoryIcon className="h-3 w-3" />
                        <span>{categoryInfo.label}</span>
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        haven.is_open_now
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isLight
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {haven.is_open_now ? 'Open Now' : 'Closed'}
                    </span>
                  </div>

                  <div>
                    <h3 className={`font-bold text-sm leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>{haven.name}</h3>
                    <p className={`text-xs mt-1 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{haven.address}</span>
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className={`grid grid-cols-2 gap-2 text-xs pt-1 border-t ${isLight ? 'border-slate-100' : 'border-zinc-800/80'}`}>
                    <div className={`rounded-xl p-2 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                      <div className="text-[10px] text-gray-500">Distance</div>
                      <div className="font-mono font-bold">
                        {haven.distance_meters}m (~{haven.walk_time_minutes} min)
                      </div>
                    </div>

                    <div className={`rounded-xl p-2 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                      <div className="text-[10px] text-gray-500">Verification</div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] truncate">
                        {haven.is_verified_partner ? 'Partner Verified' : 'Public Facility'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] text-gray-500">
                    {haven.has_security_staff && (
                      <span className={`px-2 py-0.5 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>Staff On-Site</span>
                    )}
                    {haven.has_well_lit_entrance && (
                      <span className={`px-2 py-0.5 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>Well-Lit Entrance</span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className={`mt-4 pt-3 border-t ${isLight ? 'border-slate-100' : 'border-zinc-800'}`}>
                  {isNavigatingHere ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-300 text-center animate-pulse">
                      ● Navigating Here
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          openAuthModal();
                        } else {
                          navigateToHaven(haven);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Get Directions</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

