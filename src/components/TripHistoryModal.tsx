/**
 * SafeHeaven Trip Safety History Modal
 * 
 * Displays transparent user trip records with 5-star safety ratings,
 * travel mode (Vehicle vs Walking), distance, and alerts/incidents avoided.
 * Supports Day / Night mode.
 */

import React from 'react';
import { X, Shield, Footprints, Car, Trash2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TripHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TripHistoryModal: React.FC<TripHistoryModalProps> = ({ isOpen, onClose }) => {
  const { tripHistory, clearTripHistory, theme } = useApp();

  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-2xl border p-6 shadow-2xl space-y-4 transition-colors duration-200 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
            : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-cyan-950/20'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Your Trip Safety History</h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Verified safety performance & route ratings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tripHistory.length > 0 && (
              <button
                onClick={clearTripHistory}
                title="Clear History"
                className={`p-1.5 rounded-lg transition-colors ${
                  isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-slate-100' : 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-900'
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`rounded-lg p-1.5 transition-colors ${
                isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Trips List */}
        {tripHistory.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-gray-500">
            <Shield className="h-10 w-10 mx-auto opacity-40" />
            <p className="text-xs">No completed trips logged yet.</p>
            <p className="text-[11px]">Start and complete navigation to generate safety history.</p>
          </div>
        ) : (
          <div className={`space-y-3 max-h-96 overflow-y-auto pr-1 divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-900'}`}>
            {tripHistory.map((trip) => {
              const isWalking = trip.travelMode === 'WALKING';
              const Icon = isWalking ? Footprints : Car;

              return (
                <div key={trip.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase flex items-center gap-1 border ${
                            isWalking
                              ? isLight
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                              : isLight
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{trip.travelMode}</span>
                        </span>
                        <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          {trip.formattedDate}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold">
                        {trip.originName} <span className="text-gray-400">→</span> {trip.destinationName}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">
                        {trip.starDisplay}
                      </div>
                      <div className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Score: <span className="font-bold">{trip.safetyScore}</span>/100
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className={`p-1.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                      <span className="text-[10px] text-gray-500 block">Distance</span>
                      <span className="font-mono font-bold">{trip.distanceKm} km</span>
                    </div>
                    <div className={`p-1.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                      <span className="text-[10px] text-gray-500 block">Duration</span>
                      <span className="font-mono font-bold">{trip.travelTimeMin} min</span>
                    </div>
                    <div className={`p-1.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                      <span className="text-[10px] text-gray-500 block">Status</span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-300">
                        {trip.incidentsAvoided > 0 ? `${trip.incidentsAvoided} Bypassed` : 'Clear'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className={`pt-2 border-t flex items-center justify-between text-xs ${isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-500'}`}>
          <span className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Encrypted local log • Private to your device</span>
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
