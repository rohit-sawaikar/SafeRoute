import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Shield,
  ShieldAlert,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  Lock,
  ArrowLeft,
  Activity,
  PlusCircle,
  Sparkles,
  MapPin,
  Map,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    incidents,
    corroborateIncident,
    disputeIncident,
    resolveIncident,
    openAuthModal,
    isAuthModalOpen,
    closeAuthModal,
    setCurrentUser,
    openFollowedMode,
    theme,
    navigate,
    safeHavens,
  } = useApp();

  const isLight = theme === 'light';
  const [activeSubTab, setActiveSubTab] = useState<'incidents' | 'users' | 'havens'>('incidents');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Simulated admin audit logs and users list
  const [adminUsers, setAdminUsers] = useState<any[]>([
    { id: 'usr_admin_sathvika', name: 'Admin Sathvika', email: 'erumallasathvika2677@gmail.com', role: 'ADMIN', status: 'ACTIVE', joined: 'Yesterday' },
    { id: 'usr_priya', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'USER', status: 'ACTIVE', joined: '2 days ago' },
    { id: 'usr_rohit', name: 'Rohit Mehta', email: 'rohit.mehta@gmail.com', role: 'USER', status: 'ACTIVE', joined: '5 days ago' },
    { id: 'usr_spammer', name: 'Spam User', email: 'spammer123@gmail.com', role: 'USER', status: 'SUSPENDED', joined: '6 days ago' },
  ]);

  const activeIncidents = incidents.filter((i) => !i.isResolved);

  const handleToggleUserStatus = (userId: string) => {
    setAdminUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? { ...user, status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
          : user
      )
    );
  };

  const handleDeactivateReport = (id: string) => {
    resolveIncident(id);
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || inc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Access check: Only Firebase accounts with an actual ADMIN claim/role or designated fallback email can access
  if (!currentUser || (!currentUser.admin && currentUser.email !== 'erumallasathvika2677@gmail.com')) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 font-sans ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-100'
        }`}>
        <div className={`w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl space-y-5 backdrop-blur-md ${isLight ? 'bg-white border-slate-200 shadow-slate-200' : 'bg-zinc-950 border-zinc-800'
          }`}>
          <div className="h-14 w-14 rounded-full bg-rose-600/10 text-rose-500 flex items-center justify-center border border-rose-800/20 mx-auto">
            <Lock className="h-6 w-6 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-lg tracking-tight">Access Restricted</h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              The SafeRoute administration and moderation console is restricted to authorized credentials only.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={openAuthModal}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              Sign In with Admin Account
            </button>
            <button
              onClick={() => navigate('/')}
              className={`w-full py-2.5 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${isLight ? 'border-slate-300 hover:bg-slate-100 text-slate-700' : 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          onLoginSuccess={setCurrentUser}
          onTriggerEmergencyBypass={() => openFollowedMode()}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-100'
      }`}>
      {/* Header */}
      <header className={`border-b h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 backdrop-blur-md ${isLight ? 'bg-white/80 border-slate-200' : 'bg-zinc-950/80 border-zinc-900'
        }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className={`p-1.5 rounded-lg border transition-colors ${isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-zinc-850 hover:bg-zinc-900'
              }`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight">SafeRoute Control Hub</h1>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
              Moderator Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold">{currentUser.displayName}</div>
            <div className="text-[9px] text-gray-500 font-mono">{currentUser.email}</div>
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-50/10 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Stats Widgets */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Alerts</div>
            <div className="text-2xl font-black mt-1 text-cyan-600 dark:text-cyan-400">{activeIncidents.length}</div>
          </div>
          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Reports</div>
            <div className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">{incidents.length}</div>
          </div>
          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Verified Havens</div>
            <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{safeHavens.length}</div>
          </div>
          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Registered Accounts</div>
            <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">{adminUsers.length}</div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-200 dark:border-zinc-850">
          <button
            onClick={() => setActiveSubTab('incidents')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeSubTab === 'incidents'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Incident Reports ({filteredIncidents.length})
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeSubTab === 'users'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Registered Users ({adminUsers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('havens')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeSubTab === 'havens'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Safe Havens ({safeHavens.length})
          </button>
        </div>

        {/* Incidents Moderation Tab */}
        {activeSubTab === 'incidents' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search description or location..."
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-white border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                    }`}
                />
              </div>

              <div className="flex gap-2.5">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-white border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                    }`}
                >
                  <option value="ALL">All Categories</option>
                  <option value="ACCIDENT">Accident</option>
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="ROAD_BLOCKAGE">Road Blockage</option>
                  <option value="STREETLIGHT">Streetlight Failure</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className={`border rounded-3xl overflow-hidden overflow-x-auto ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-850'
              }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={isLight ? 'bg-slate-100 border-b border-slate-200' : 'bg-zinc-900/60 border-b border-zinc-850'}>
                    <th className="p-3.5 font-bold">Category</th>
                    <th className="p-3.5 font-bold">Description</th>
                    <th className="p-3.5 font-bold">Location</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                  {filteredIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                      <td className="p-3.5 whitespace-nowrap font-bold text-cyan-600 dark:text-cyan-400">
                        {inc.category.replace('_', ' ')}
                      </td>
                      <td className="p-3.5">{inc.description}</td>
                      <td className="p-3.5 whitespace-nowrap">{inc.location.name}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inc.isResolved
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                          {inc.isResolved ? 'Resolved' : 'Active'}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap flex gap-2">
                        {!inc.isResolved && (
                          <button
                            onClick={() => handleDeactivateReport(inc.id)}
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          onClick={() => handleDeactivateReport(inc.id)}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50/10 transition-colors cursor-pointer"
                          title="Remove / Expire"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-zinc-500 font-medium">
                        No incident reports found matching the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Management Tab */}
        {activeSubTab === 'users' && (
          <div className={`border rounded-3xl overflow-hidden overflow-x-auto ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={isLight ? 'bg-slate-100 border-b border-slate-200' : 'bg-zinc-900/60 border-b border-zinc-850'}>
                  <th className="p-3.5 font-bold">User Name</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">Role</th>
                  <th className="p-3.5 font-bold">Status</th>
                  <th className="p-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {adminUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                    <td className="p-3.5 whitespace-nowrap font-bold">{user.name}</td>
                    <td className="p-3.5 whitespace-nowrap font-mono">{user.email}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400' : 'bg-slate-100 text-slate-800 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {user.id !== 'usr_admin_sathvika' && (
                        <button
                          onClick={() => handleToggleUserStatus(user.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${user.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                            }`}
                        >
                          {user.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Safe Havens Tab */}
        {activeSubTab === 'havens' && (
          <div className={`border rounded-3xl overflow-hidden overflow-x-auto ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={isLight ? 'bg-slate-100 border-b border-slate-200' : 'bg-zinc-900/60 border-b border-zinc-850'}>
                  <th className="p-3.5 font-bold">Haven Name</th>
                  <th className="p-3.5 font-bold">Address</th>
                  <th className="p-3.5 font-bold">Contact</th>
                  <th className="p-3.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {safeHavens.map((haven) => (
                  <tr key={haven.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                    <td className="p-3.5 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">{haven.name}</td>
                    <td className="p-3.5">{haven.address}</td>
                    <td className="p-3.5 whitespace-nowrap font-mono">{haven.phone || 'N/A'}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        Open 24/7
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
