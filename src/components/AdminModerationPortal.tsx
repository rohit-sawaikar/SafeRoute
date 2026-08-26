/**
 * SafeHeaven Admin Moderation Portal & Audit Trail Inspector
 * 
 * Allows administrators to inspect pending community incident reports,
 * review AI evidence analysis, approve/reject/flag reports, and view audit trail logs.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Flag,
  Clock,
  Sparkles,
  FileText,
  RefreshCw,
  AlertTriangle,
  Camera,
  Check,
  X,
  Eye,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface IncidentReportAdmin {
  id: string;
  category: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  severitySubmitted: string;
  evaluatedSeverity: string;
  photos: string[];
  createdAt: number;
  status: string;
  verificationStatus: string;
  confidenceScore: number;
  sourceCount: number;
  supportCount: number;
  contradictionCount: number;
  aiAnalysis?: {
    relevanceScore: number;
    detectedCategory: string;
    photoConsistent: boolean;
    flaggedSpam: boolean;
    reasoning: string;
  };
}

interface AuditLogAdmin {
  id: string;
  timestamp: number;
  incidentId: string;
  action: string;
  actor: string;
  details: string;
}

export const AdminModerationPortal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, theme } = useApp();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'audit'>('pending');
  const [pendingReports, setPendingReports] = useState<IncidentReportAdmin[]>([]);
  const [publishedReports, setPublishedReports] = useState<IncidentReportAdmin[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogAdmin[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/safety/admin/incidents');
      if (res.ok) {
        const data = await res.json();
        setPendingReports(data.pending || []);
        setPublishedReports(data.published || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch admin moderation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  const handleModerateAction = async (id: string, action: 'APPROVE' | 'REJECT' | 'FLAG' | 'EXPIRE') => {
    try {
      const res = await fetch(`/api/safety/admin/incidents/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: `Admin action: ${action}` }),
      });
      if (res.ok) {
        setActionSuccess(`Incident ${id} updated with status ${action}.`);
        fetchAdminData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Moderation failed:', err);
    }
  };

  if (!isOpen) return null;

  if (!currentUser || currentUser.email !== 'erumallasathvika2677@gmail.com') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className={`relative w-full max-w-md overflow-hidden rounded-2xl border p-8 text-center shadow-2xl space-y-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}>
          <div className="h-12 w-12 rounded-full bg-rose-600/10 text-rose-500 flex items-center justify-center border border-rose-800/30 mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base">Access Denied</h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              This moderation portal is restricted to authorized SafeRoute administrators only.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            Close Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl flex flex-col space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                SafeHeaven Community Moderation & Audit Console
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700">
                  Admin Active
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Review pending incident reports, AI evidence metrics, and system audit logs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeTab === 'pending'
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pending Verification ({pendingReports.length})
            </button>

            <button
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeTab === 'published'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Published & Active ({publishedReports.length})
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeTab === 'audit'
                  ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Audit Trail Logs ({auditLogs.length})
            </button>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Tab 1 & 2: Reports Stream */}
        {(activeTab === 'pending' || activeTab === 'published') && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {(activeTab === 'pending' ? pendingReports : publishedReports).length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <ShieldAlert className="h-8 w-8 text-zinc-600 mx-auto" />
                <p>No reports currently in this category.</p>
              </div>
            ) : (
              (activeTab === 'pending' ? pendingReports : publishedReports).map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded font-mono font-bold text-[10px] bg-zinc-800 text-zinc-300 uppercase">
                        {report.category.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-white">{report.address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-zinc-400">Confidence:</span>
                      <span className="font-mono font-bold text-amber-400">{Math.round(report.confidenceScore * 100)}%</span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-zinc-400">{new Date(report.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-zinc-200 text-xs leading-relaxed">{report.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono pt-1">
                      <span>Sources: {report.sourceCount}</span>
                      <span>•</span>
                      <span>Confirmations: {report.supportCount}</span>
                      <span>•</span>
                      <span>Disputes: {report.contradictionCount}</span>
                    </div>
                  </div>

                  {/* AI Evidence Box */}
                  {report.aiAnalysis && (
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1 text-[11px]">
                      <span className="font-bold text-cyan-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Automated AI Vision & NLP Reasoning:
                      </span>
                      <p className="text-zinc-300">{report.aiAnalysis.reasoning}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={() => handleModerateAction(report.id, 'APPROVE')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve & Publish
                    </button>

                    <button
                      onClick={() => handleModerateAction(report.id, 'FLAG')}
                      className="px-3 py-1.5 rounded-xl bg-amber-950 border border-amber-800 text-amber-300 font-semibold text-xs flex items-center gap-1 hover:bg-amber-900 transition-colors"
                    >
                      <Flag className="h-3.5 w-3.5" /> Flag Review
                    </button>

                    <button
                      onClick={() => handleModerateAction(report.id, 'REJECT')}
                      className="px-3 py-1.5 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 font-semibold text-xs flex items-center gap-1 hover:bg-rose-900 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject / Spam
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Audit Trail Table */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                    <th className="p-3">Time</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-850/50">
                      <td className="p-3 text-zinc-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-bold text-cyan-300">{log.actor}</td>
                      <td className="p-3 text-amber-300 font-bold">{log.action}</td>
                      <td className="p-3 text-zinc-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
