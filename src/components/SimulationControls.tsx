/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Clock,
  Play,
  Pause,
  FastForward,
  AlertTriangle,
  Moon,
  Sun,
  CheckCircle,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SimulationControls: React.FC = () => {
  const {
    timeOfDay,
    setTimeOfDay,
    isSimulatingTime,
    setIsSimulatingTime,
    simulationSpeed,
    setSimulationSpeed,
    triggerSimulationScenario,
    refreshSafetyPulse,
    refreshRouteScores,
  } = useApp();

  const handleTimeChange = (newTime: string) => {
    setTimeOfDay(newTime);
    refreshSafetyPulse();
    refreshRouteScores();
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 text-cyan-400">
            <Sliders className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Deterministic Simulation & Time-of-Day Engine
            </h3>
            <p className="text-[11px] text-zinc-400">
              Altering time recalculates pedestrian density, lighting infrastructure, incident decay, and safety scores.
            </p>
          </div>
        </div>

        {/* Time of Day Presets & Live Clock */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-zinc-400">Time:</span>
            <select
              value={timeOfDay}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="bg-transparent font-mono font-bold text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="20:00">20:00 (Dusk - High Foot Traffic)</option>
              <option value="22:30">22:30 (Late Evening - Normal)</option>
              <option value="00:45">00:45 (Midnight - Lower Foot Traffic)</option>
              <option value="03:15">03:15 (Overnight - Low Traffic & Visibility)</option>
            </select>
          </div>

          {/* Clock Timer Progression Control */}
          <button
            onClick={() => setIsSimulatingTime(!isSimulatingTime)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              isSimulatingTime
                ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isSimulatingTime ? (
              <>
                <Pause className="h-3 w-3 text-cyan-400" />
                <span>Clock Running</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 text-emerald-400" />
                <span>Run Time Clock</span>
              </>
            )}
          </button>

          {/* Speed Selector */}
          {isSimulatingTime && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[11px] transition-colors ${
                    simulationSpeed === spd
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scenario Injection Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Test Scenarios:
        </span>

        <button
          onClick={() => triggerSimulationScenario('incident_ahead')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors"
        >
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span>Inject Incident on Path</span>
        </button>

        <button
          onClick={() => triggerSimulationScenario('midnight_rush')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-cyan-300 transition-colors"
        >
          <Moon className="h-3 w-3 text-cyan-400" />
          <span>Simulate 01:30 AM Late Night</span>
        </button>

        <button
          onClick={() => triggerSimulationScenario('all_clear')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-300 transition-colors"
        >
          <CheckCircle className="h-3 w-3 text-emerald-400" />
          <span>Clear / Resolve All Incidents</span>
        </button>
      </div>
    </div>
  );
};
