/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  Code2,
  Copy,
  Cpu,
  Layers,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
  Check,
  AlertTriangle,
  FileText,
  UserCheck,
  Radio,
  Bell,
  Scale,
  Compass,
  Repeat,
  Crosshair,
  TrendingDown,
  Navigation
} from 'lucide-react';
import { AI_FUNCTION_PRESETS } from '../data/mockSafetyData';
import {
  fetchSafetyPulse,
  fetchIncidentClassification,
  fetchDuplicateDetection,
  fetchSeverityDecay,
  fetchSaferRouteScoring,
  fetchFollowedMode,
  fetchSafeHavenRanking,
  fetchCrossSignalRisk,
  fetchAreaSummary,
  fetchCommunityReportVerification,
  fetchSafetyNotification,
} from '../services/safetyAiService';

type FunctionKey =
  | 'pulse'
  | 'classify'
  | 'duplicate'
  | 'decay'
  | 'routeScore'
  | 'followed'
  | 'havenRank'
  | 'crossSignal'
  | 'areaSummary'
  | 'verifyReport'
  | 'notification';

interface FunctionMeta {
  key: FunctionKey;
  idNumber: number;
  title: string;
  shortDesc: string;
  icon: any;
  endpoint: string;
}

const AI_FUNCTIONS: FunctionMeta[] = [
  { key: 'pulse', idNumber: 1, title: 'Safety Pulse', shortDesc: 'Aggregates multi-signals into state (NORMAL/CAUTION/HIGH_ALERT)', icon: Activity, endpoint: '/api/safety/pulse' },
  { key: 'classify', idNumber: 2, title: 'Incident Classification', shortDesc: 'Classifies text/photo report category, severity & evidence', icon: FileText, endpoint: '/api/safety/classify-incident' },
  { key: 'duplicate', idNumber: 3, title: 'Duplicate Detection', shortDesc: 'Semantic & spatial comparison with active reports', icon: Repeat, endpoint: '/api/safety/detect-duplicates' },
  { key: 'decay', idNumber: 4, title: 'Severity Decay', shortDesc: 'Gradual temporal confidence decay based on persistence', icon: TrendingDown, endpoint: '/api/safety/severity-decay' },
  { key: 'routeScore', idNumber: 5, title: 'Safer Route Scoring', shortDesc: 'Multi-factor transparent safety score without false guarantees', icon: Navigation, endpoint: '/api/safety/route-scoring' },
  { key: 'followed', idNumber: 6, title: 'Followed Mode HUD', shortDesc: 'Immediate sanctuary routing, dispatch, & discreet tactics', icon: Shield, endpoint: '/api/safety/followed-mode' },
  { key: 'havenRank', idNumber: 7, title: 'Safe Haven Ranking', shortDesc: 'Ranks 24/7 verified sanctuaries by availability & access', icon: Crosshair, endpoint: '/api/safety/rank-safe-havens' },
  { key: 'crossSignal', idNumber: 8, title: 'Cross-Signal Risk', shortDesc: 'Detects compounded friction synergies (e.g. dark + rain + obstruction)', icon: Zap, endpoint: '/api/safety/cross-signal-risk' },
  { key: 'areaSummary', idNumber: 9, title: 'Area Summary', shortDesc: 'Separates observed facts from predictive indicators', icon: Layers, endpoint: '/api/safety/area-summary' },
  { key: 'verifyReport', idNumber: 10, title: 'Report Verification', shortDesc: 'Calculates trust score with zero-knowledge reporter privacy', icon: UserCheck, endpoint: '/api/safety/verify-community-report' },
  { key: 'notification', idNumber: 11, title: 'Safety Notification', shortDesc: 'Generates calm, factual in-route alerts avoiding panic', icon: Bell, endpoint: '/api/safety/safety-notification' },
];

export const AiFunctionWorkbench: React.FC = () => {
  const [activeFuncKey, setActiveFuncKey] = useState<FunctionKey>('pulse');
  const [inputPayloads, setInputPayloads] = useState<Record<FunctionKey, string>>({
    pulse: JSON.stringify(AI_FUNCTION_PRESETS.safetyPulse, null, 2),
    classify: JSON.stringify(AI_FUNCTION_PRESETS.incidentClassification, null, 2),
    duplicate: JSON.stringify(AI_FUNCTION_PRESETS.duplicateDetection, null, 2),
    decay: JSON.stringify(AI_FUNCTION_PRESETS.severityDecay, null, 2),
    routeScore: JSON.stringify(AI_FUNCTION_PRESETS.saferRouteScoring, null, 2),
    followed: JSON.stringify(AI_FUNCTION_PRESETS.followedMode, null, 2),
    havenRank: JSON.stringify(AI_FUNCTION_PRESETS.safeHavenRanking, null, 2),
    crossSignal: JSON.stringify(AI_FUNCTION_PRESETS.crossSignalRisk, null, 2),
    areaSummary: JSON.stringify(AI_FUNCTION_PRESETS.areaSummary, null, 2),
    verifyReport: JSON.stringify(AI_FUNCTION_PRESETS.communityReportVerification, null, 2),
    notification: JSON.stringify(AI_FUNCTION_PRESETS.safetyNotification, null, 2),
  });

  const [results, setResults] = useState<Record<string, { data: any; latencyMs: number; isFallback?: boolean }>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outputTab, setOutputTab] = useState<'visual' | 'raw'>('visual');

  const activeFunctionMeta = AI_FUNCTIONS.find((f) => f.key === activeFuncKey)!;

  const handleResetPreset = () => {
    let preset: any = {};
    switch (activeFuncKey) {
      case 'pulse': preset = AI_FUNCTION_PRESETS.safetyPulse; break;
      case 'classify': preset = AI_FUNCTION_PRESETS.incidentClassification; break;
      case 'duplicate': preset = AI_FUNCTION_PRESETS.duplicateDetection; break;
      case 'decay': preset = AI_FUNCTION_PRESETS.severityDecay; break;
      case 'routeScore': preset = AI_FUNCTION_PRESETS.saferRouteScoring; break;
      case 'followed': preset = AI_FUNCTION_PRESETS.followedMode; break;
      case 'havenRank': preset = AI_FUNCTION_PRESETS.safeHavenRanking; break;
      case 'crossSignal': preset = AI_FUNCTION_PRESETS.crossSignalRisk; break;
      case 'areaSummary': preset = AI_FUNCTION_PRESETS.areaSummary; break;
      case 'verifyReport': preset = AI_FUNCTION_PRESETS.communityReportVerification; break;
      case 'notification': preset = AI_FUNCTION_PRESETS.safetyNotification; break;
    }
    setInputPayloads((prev) => ({
      ...prev,
      [activeFuncKey]: JSON.stringify(preset, null, 2),
    }));
  };

  const handleExecute = async () => {
    setIsRunning(true);
    try {
      const parsedInput = JSON.parse(inputPayloads[activeFuncKey]);
      let res: any;

      switch (activeFuncKey) {
        case 'pulse':
          res = await fetchSafetyPulse(parsedInput);
          break;
        case 'classify':
          res = await fetchIncidentClassification(parsedInput);
          break;
        case 'duplicate':
          res = await fetchDuplicateDetection(parsedInput);
          break;
        case 'decay':
          res = await fetchSeverityDecay(parsedInput);
          break;
        case 'routeScore':
          res = await fetchSaferRouteScoring(parsedInput.routes, parsedInput.timeOfDay);
          break;
        case 'followed':
          res = await fetchFollowedMode(parsedInput);
          break;
        case 'havenRank':
          res = await fetchSafeHavenRanking(parsedInput.havens, parsedInput.timeOfDay);
          break;
        case 'crossSignal':
          res = await fetchCrossSignalRisk(parsedInput);
          break;
        case 'areaSummary':
          res = await fetchAreaSummary(parsedInput);
          break;
        case 'verifyReport':
          res = await fetchCommunityReportVerification(parsedInput);
          break;
        case 'notification':
          res = await fetchSafetyNotification(parsedInput);
          break;
      }

      setResults((prev) => ({
        ...prev,
        [activeFuncKey]: res,
      }));
    } catch (err) {
      console.error('Execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyJson = () => {
    const activeRes = results[activeFuncKey];
    if (activeRes?.data) {
      navigator.clipboard.writeText(JSON.stringify(activeRes.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeResult = results[activeFuncKey];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                <Cpu className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-white">SafeRoute AI Safety Engine (Architecture & Inspector)</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Developer and testing sandbox for all 11 structured JSON safety reasoning functions powering the app.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Model: gemini-3.7-flash</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Code2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Schema: JSON Object</span>
            </div>
          </div>
        </div>
      </div>

      {/* Function Selector Grid (1 to 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {AI_FUNCTIONS.map((func) => {
          const Icon = func.icon;
          const isActive = activeFuncKey === func.key;
          const hasRun = Boolean(results[func.key]);

          return (
            <button
              key={func.key}
              onClick={() => setActiveFuncKey(func.key)}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                isActive
                  ? 'border-cyan-500 bg-cyan-950/30 text-white ring-1 ring-cyan-500 shadow-md'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  #{func.idNumber}
                </span>
                {hasRun && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              </div>

              <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs text-zinc-100 truncate">
                <Icon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{func.title}</span>
              </div>
              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-tight">{func.shortDesc}</p>
            </button>
          );
        })}
      </div>

      {/* Active Function Playground: Split View Input & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Input JSON & Parameters (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400">FUNCTION #{activeFunctionMeta.idNumber}</span>
                <h3 className="font-bold text-sm text-white">{activeFunctionMeta.title} Input</h3>
              </div>
              <button
                onClick={handleResetPreset}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="Reset to realistic preset"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Preset</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400">{activeFunctionMeta.shortDesc}</p>

            <div className="relative">
              <textarea
                value={inputPayloads[activeFuncKey]}
                onChange={(e) =>
                  setInputPayloads((prev) => ({
                    ...prev,
                    [activeFuncKey]: e.target.value,
                  }))
                }
                rows={14}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 font-mono text-xs text-cyan-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleExecute}
              disabled={isRunning}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-transform active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Gemini Safety Model...' : 'Execute AI Function'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Output & Inspection (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 flex flex-col justify-between">
          <div>
            {/* Header & Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm text-white">AI Intelligence Output</h3>
                {activeResult && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-emerald-300">
                    Latency: {activeResult.latencyMs}ms
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
                  <button
                    onClick={() => setOutputTab('visual')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      outputTab === 'visual' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                    }`}
                  >
                    Visual Card
                  </button>
                  <button
                    onClick={() => setOutputTab('raw')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      outputTab === 'raw' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>

                <button
                  onClick={handleCopyJson}
                  disabled={!activeResult?.data}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30"
                  title="Copy JSON"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Output Body */}
            {!activeResult ? (
              <div className="h-80 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-xl space-y-3">
                <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-300">Ready to execute #{activeFunctionMeta.idNumber}: {activeFunctionMeta.title}</p>
                  <p className="text-[11px] text-zinc-500 max-w-sm">
                    Click "Execute AI Function" to evaluate multi-signal reasoning and inspect structured JSON output.
                  </p>
                </div>
              </div>
            ) : outputTab === 'raw' ? (
              <pre className="h-[360px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 font-mono text-xs text-emerald-300 leading-relaxed scrollbar-thin">
                {JSON.stringify(activeResult.data, null, 2)}
              </pre>
            ) : (
              <div className="h-[360px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {/* Dynamic Visual Formatter per Function */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                  {/* Status / Main Indicator */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                      Reasoning Result
                    </span>
                    {activeResult.data.safety_status && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                        {activeResult.data.safety_status}
                      </span>
                    )}
                    {activeResult.data.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                        {activeResult.data.category} ({activeResult.data.severity})
                      </span>
                    )}
                    {activeResult.data.duplicate_probability !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 border border-amber-800 text-amber-300">
                        Duplicate Prob: {Math.round(activeResult.data.duplicate_probability * 100)}%
                      </span>
                    )}
                    {activeResult.data.verification_score !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                        Verification: {activeResult.data.verification_score}/100 ({activeResult.data.verification_level})
                      </span>
                    )}
                  </div>

                  {/* Primary Narrative Fields */}
                  {activeResult.data.explanation && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-400">Explanation:</span>
                      <p className="text-xs text-zinc-200 leading-relaxed">{activeResult.data.explanation}</p>
                    </div>
                  )}

                  {activeResult.data.recommended_action && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-cyan-400">Recommended Action:</span>
                      <p className="text-xs text-cyan-100 leading-relaxed">{activeResult.data.recommended_action}</p>
                    </div>
                  )}

                  {activeResult.data.factual_summary && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-400">Factual Summary:</span>
                      <p className="text-xs text-zinc-200 leading-relaxed">{activeResult.data.factual_summary}</p>
                    </div>
                  )}

                  {/* Observed facts separation */}
                  {activeResult.data.observed_facts && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400">Observed Facts (Verified):</span>
                      <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                        {activeResult.data.observed_facts.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeResult.data.predictive_indicators && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-amber-400">Predictive Indicators (Trends):</span>
                      <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                        {activeResult.data.predictive_indicators.map((p: string, i: number) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notification text if alert */}
                  {activeResult.data.notification_text && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-amber-400">Calm In-Route Notification:</span>
                      <p className="text-xs text-zinc-100 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-medium">
                        "{activeResult.data.notification_text}"
                      </p>
                    </div>
                  )}

                  {/* Privacy guarantee */}
                  {activeResult.data.privacy_guarantee && (
                    <div className="text-[10px] text-zinc-500 font-mono pt-1">
                      Privacy: {activeResult.data.privacy_guarantee}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Compliance Checklist Footer */}
          <div className="border-t border-zinc-800/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Factual & Non-Panic
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Zero PII Exposure
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Decision Support Only
              </span>
            </div>
            <span className="text-zinc-500 font-mono">Status: Verified Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
