import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  updateIncidentInFirestore,
  subscribeToRegisteredUsers,
  subscribeToLoginActivity,
  updateUserStatusInFirestore,
  syncUserProfile,
  RegisteredUserDoc,
  LoginActivityDoc,
} from '../services/firebaseClient';
import {
  exportRegisteredUsersToExcel,
  exportLoginActivityToExcel,
  exportAllDataToExcel,
  filterByDateRange,
  DateFilterOption,
} from '../utils/exportUtils';
import {
  Shield,
  Users,
  Search,
  Trash2,
  Lock,
  ArrowLeft,
  Activity,
  UserCheck,
  LogIn,
  KeyRound,
  RefreshCw,
  Download,
  Calendar,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    incidents,
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
  const [activeSubTab, setActiveSubTab] = useState<'incidents' | 'users' | 'loginActivity' | 'havens'>('incidents');

  // Incident filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Real Firestore Data States
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserDoc[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginActivityDoc[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Export & Date Filtering State
  const [exportDateFilter, setExportDateFilter] = useState<DateFilterOption>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Search & Filter controls
  const [userSearch, setUserSearch] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [loginSearch, setLoginSearch] = useState<string>('');
  const [loginMethodFilter, setLoginMethodFilter] = useState<string>('ALL');

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    if (!currentUser || !currentUser.admin) return;

    setIsLoadingUsers(true);
    setIsLoadingLogs(true);

    // Sync current logged-in admin if missing in users collection (Backward compatibility)
    if (currentUser) {
      syncUserProfile({
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Admin User',
        email: currentUser.email,
        phone: currentUser.phone,
        admin: true,
      }).catch((err) => console.warn('Admin backward compatibility profile sync notice:', err));
    }

    const unsubUsers = subscribeToRegisteredUsers((users) => {
      setRegisteredUsers(users);
      setIsLoadingUsers(false);
    });

    const unsubLogs = subscribeToLoginActivity((logs) => {
      setLoginLogs(logs);
      setIsLoadingLogs(false);
    });

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [currentUser]);

  // Status Toggling Handler
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingUserId(userId);
    try {
      await updateUserStatusInFirestore(userId, newStatus);
    } catch (err) {
      console.error('Failed to update user status in Firestore:', err);
      alert('Failed to update user status. Please check Firestore security rules.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeactivateReport = async (id: string) => {
    resolveIncident(id);
    try {
      await updateIncidentInFirestore(id, {
        isResolved: true,
        status: 'RESOLVED',
      });
    } catch (err) {
      console.warn('Firestore incident resolution notice:', err);
    }
  };

  // Filtered Lists for UI
  const activeIncidents = incidents.filter((i) => !i.isResolved);

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || inc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredUsers = registeredUsers.filter((user) => {
    const searchLower = userSearch.toLowerCase();
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.phone && user.phone.includes(searchLower)) ||
      user.uid.toLowerCase().includes(searchLower);
    const matchesStatus = userStatusFilter === 'ALL' || user.status === userStatusFilter;

    // Apply date range filter if selected
    const passesDateFilter = filterByDateRange([user], exportDateFilter).length > 0;

    return matchesSearch && matchesStatus && passesDateFilter;
  });

  const filteredLoginLogs = loginLogs.filter((log) => {
    const searchLower = loginSearch.toLowerCase();
    const matchesSearch =
      log.displayName.toLowerCase().includes(searchLower) ||
      (log.email && log.email.toLowerCase().includes(searchLower)) ||
      (log.phone && log.phone.includes(searchLower)) ||
      log.uid.toLowerCase().includes(searchLower) ||
      log.providerId.toLowerCase().includes(searchLower);
    const matchesMethod = loginMethodFilter === 'ALL' || log.providerId.toLowerCase().includes(loginMethodFilter.toLowerCase());

    // Apply date range filter if selected
    const passesDateFilter = filterByDateRange([log], exportDateFilter).length > 0;

    return matchesSearch && matchesMethod && passesDateFilter;
  });

  // Calculate Metrics
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const newUsersToday = registeredUsers.filter((u) => u.createdAt >= startOfToday).length;
  const loginsToday = loginLogs.filter((l) => (l.loginTimestamp || (l as any).timestamp || 0) >= startOfToday).length;
  const activeUsersCount = registeredUsers.filter((u) => u.status === 'ACTIVE').length;

  // Date range filtered totals for Export Summary
  const exportUsersCount = filterByDateRange(registeredUsers, exportDateFilter).length;
  const exportLogsCount = filterByDateRange(loginLogs, exportDateFilter).length;

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Export Trigger Handlers
  const handleExportUsers = () => {
    setIsExporting(true);
    try {
      exportRegisteredUsersToExcel(registeredUsers, exportDateFilter);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export users data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportLogs = () => {
    setIsExporting(true);
    try {
      exportLoginActivityToExcel(loginLogs, exportDateFilter);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export login activity logs');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = () => {
    setIsExporting(true);
    try {
      exportAllDataToExcel(registeredUsers, loginLogs, exportDateFilter);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export full summary report');
    } finally {
      setIsExporting(false);
    }
  };

  // Access check: Only Firebase accounts with an actual ADMIN claim/role can access
  if (!currentUser || !currentUser.admin) {
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
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Registered Accounts</div>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
              {isLoadingUsers ? '...' : registeredUsers.length}
            </div>
            <div className="text-[10px] text-emerald-500 font-bold mt-0.5">
              +{newUsersToday} joined today
            </div>
          </div>

          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Logins Today</div>
              <LogIn className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
              {isLoadingLogs ? '...' : loginsToday}
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {loginLogs.length} total events logged
            </div>
          </div>

          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Alerts</div>
              <Activity className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-black mt-1 text-cyan-600 dark:text-cyan-400">{activeIncidents.length}</div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {incidents.length} total reports
            </div>
          </div>

          <div className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active User Status</div>
              <UserCheck className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
              {isLoadingUsers ? '...' : `${activeUsersCount}/${registeredUsers.length}`}
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {registeredUsers.length - activeUsersCount} suspended
            </div>
          </div>
        </div>

        {/* Excel Data Export & Date Range Filter Toolbar */}
        <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'
          }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>Excel Data Export Center</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  .XLSX / CSV Ready
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Export structured reports for Microsoft Excel with customizable date ranges.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Date Range Filter Selector */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={exportDateFilter}
                onChange={(e) => setExportDateFilter(e.target.value as DateFilterOption)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
              >
                <option value="ALL">All Available Data</option>
                <option value="LAST_15_DAYS">Last 15 Days Only</option>
                <option value="LAST_7_DAYS">Last 7 Days Only</option>
              </select>
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportUsers}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Export Users (${exportUsersCount} records in selected range)`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Users ({exportUsersCount})</span>
            </button>

            <button
              onClick={handleExportLogs}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Export Logins (${exportLogsCount} records in selected range)`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Logins ({exportLogsCount})</span>
            </button>

            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Export Full Summary Report (Users + Logins)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Full (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Tab Switchers */}
        <div className="flex flex-wrap border-b border-slate-200 dark:border-zinc-850">
          <button
            onClick={() => setActiveSubTab('incidents')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeSubTab === 'incidents'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Incident Reports ({filteredIncidents.length})
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'users'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Registered Users ({filteredUsers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('loginActivity')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'loginActivity'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Login Activity ({filteredLoginLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('havens')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeSubTab === 'havens'
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

        {/* Registered Users Tab (Real Firestore Persistence & Backward Compatibility) */}
        {activeSubTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name, email, phone, or UID..."
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-white border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                    }`}
                />
              </div>

              <div className="flex gap-2.5">
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-white border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                    }`}
                >
                  <option value="ALL">All Account Statuses</option>
                  <option value="ACTIVE">ACTIVE Only</option>
                  <option value="SUSPENDED">SUSPENDED Only</option>
                </select>
              </div>
            </div>

            <div className={`border rounded-3xl overflow-hidden overflow-x-auto ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-850'
              }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={isLight ? 'bg-slate-100 border-b border-slate-200' : 'bg-zinc-900/60 border-b border-zinc-850'}>
                    <th className="p-3.5 font-bold">User</th>
                    <th className="p-3.5 font-bold">Email / Phone</th>
                    <th className="p-3.5 font-bold">Auth Method</th>
                    <th className="p-3.5 font-bold">Created Date</th>
                    <th className="p-3.5 font-bold">Last Login</th>
                    <th className="p-3.5 font-bold">Role</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                        Loading registered users from Firestore...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                        No registered users found in Firestore matching active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div>{user.displayName || 'Registered User'}</div>
                              <div className="text-[9px] text-gray-500 font-mono">UID: {user.uid.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                          {user.email || user.phone || 'N/A'}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-900 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800">
                            {user.authProvider === 'google.com' ? 'Google OAuth' : user.authProvider === 'phone' ? 'Phone OTP' : 'Email/Pass'}
                          </span>
                        </td>

                        <td className="p-3.5 whitespace-nowrap text-gray-500 dark:text-zinc-400 text-[11px]">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="p-3.5 whitespace-nowrap text-gray-500 dark:text-zinc-400 text-[11px]">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-800/30' : 'bg-slate-100 text-slate-800 dark:bg-zinc-900 dark:text-zinc-400'
                            }`}>
                            {user.role}
                          </span>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-800/30'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-800/30'
                            }`}>
                            {user.status}
                          </span>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleUserStatus(user.uid, user.status)}
                              disabled={updatingUserId === user.uid}
                              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold text-white transition-all shadow-xs cursor-pointer ${user.status === 'ACTIVE'
                                  ? 'bg-rose-600 hover:bg-rose-500 active:scale-95'
                                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95'
                                } ${updatingUserId === user.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {updatingUserId === user.uid
                                ? 'Updating...'
                                : user.status === 'ACTIVE'
                                  ? 'Suspend Account'
                                  : 'Activate Account'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Login Activity Logs Tab */}
        {activeSubTab === 'loginActivity' && (
          <div className="space-y-4">
            {/* Search & Method Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={loginSearch}
                  onChange={(e) => setLoginSearch(e.target.value)}
                  placeholder="Search log by user name, email, phone, or method..."
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-white border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                    }`}
                />
              </div>

              <div className="flex gap-2.5">
                <select
                  value={loginMethodFilter}
                  onChange={(e) => setLoginMethodFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${isLight ? 'bg-white border-slate-350 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                    }`}
                >
                  <option value="ALL">All Login Methods</option>
                  <option value="password">Password / Email</option>
                  <option value="google">Google OAuth</option>
                  <option value="phone">Phone SMS OTP</option>
                </select>
              </div>
            </div>

            <div className={`border rounded-3xl overflow-hidden overflow-x-auto ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-850'
              }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={isLight ? 'bg-slate-100 border-b border-slate-200' : 'bg-zinc-900/60 border-b border-zinc-850'}>
                    <th className="p-3.5 font-bold">Timestamp</th>
                    <th className="p-3.5 font-bold">User</th>
                    <th className="p-3.5 font-bold">UID</th>
                    <th className="p-3.5 font-bold">Email / Contact</th>
                    <th className="p-3.5 font-bold">Login Method</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold">Device / Environment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                        Loading login activity logs from Firestore...
                      </td>
                    </tr>
                  ) : filteredLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                        No login activity logs recorded matching active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLoginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                        <td className="p-3.5 whitespace-nowrap text-gray-500 dark:text-zinc-400 font-mono text-[11px]">
                          {formatDate(log.loginTimestamp || log.timestamp || 0)}
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-bold">
                          {log.displayName}
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-mono text-[10px] text-gray-500 dark:text-zinc-400">
                          {log.uid ? `${log.uid.slice(0, 10)}...` : 'N/A'}
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                          {log.email || log.phone || 'N/A'}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <KeyRound className="h-3 w-3" />
                            {log.providerId === 'google.com' ? 'Google OAuth' : log.providerId === 'phone' ? 'Phone OTP' : 'Email/Password'}
                          </span>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-800/30">
                            {log.status}
                          </span>
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-mono text-[10px] text-gray-500 dark:text-zinc-400">
                          {log.userAgent || log.ipAddress || 'Web Client (Browser)'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
