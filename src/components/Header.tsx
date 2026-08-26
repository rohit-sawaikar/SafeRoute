/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Shield,
  AlertTriangle,
  PlusCircle,
  Activity,
  Navigation,
  User,
  LogIn,
  Car,
  Footprints,
  History,
  Sun,
  Moon,
  ArrowLeft,
  Heart,
  HelpCircle,
} from 'lucide-react';
import { useApp, AppTab } from '../context/AppContext';
import { UserAuthProfile } from './AuthModal';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  currentUser?: UserAuthProfile | null;
  onOpenAuthModal?: () => void;
  onOpenAdminModal?: () => void;
  onOpenTripHistory?: () => void;
  onOpenEmergencyContact?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser: propCurrentUser,
  onOpenAuthModal: propOnOpenAuthModal,
  onOpenAdminModal,
  onOpenTripHistory,
  onOpenEmergencyContact,
}) => {
  const {
    pulseData,
    navigation,
    openFollowedMode,
    openReportModal,
    travelMode,
    setTravelMode,
    theme,
    toggleTheme,
    navigateBack,
    canNavigateBack,
    emergencyContact,
    currentUser,
    openAuthModal,
  } = useApp();

  const safetyStatus = pulseData?.safety_status || 'NORMAL';
  const isLight = theme === 'light';

  const statusBadge = {
    NORMAL: {
      text: 'Safe Conditions',
      classes: isLight
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
      dot: 'bg-emerald-500',
    },
    CAUTION: {
      text: 'Be Careful Nearby',
      classes: isLight
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-amber-950/60 text-amber-300 border-amber-800/60',
      dot: 'bg-amber-500',
    },
    HIGH_ALERT: {
      text: 'Caution Advised',
      classes: isLight
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-rose-950/60 text-rose-300 border-rose-800/60',
      dot: 'bg-rose-500',
    },
  }[safetyStatus] || {
    text: 'Safe Conditions',
    classes: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    dot: 'bg-emerald-500',
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${isLight
          ? 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-md shadow-xs'
          : 'bg-zinc-950/95 border-zinc-800 text-zinc-100 backdrop-blur-md'
        }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 gap-2">
        {/* Left: Back Button & Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Upper-Left Back Navigation Button */}
          {canNavigateBack && (
            <button
              onClick={navigateBack}
              title="Go back to previous page"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 shadow-xs ${isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div
            onClick={() => onSelectTab('map')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-base sm:text-lg">SafeHeaven</span>
          </div>

          {/* Quick Travel Mode Selector (Desktop) */}
          <div
            className={`hidden md:flex items-center p-0.5 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-zinc-900 border-zinc-800'
              }`}
          >
            <button
              onClick={() => setTravelMode('WALKING')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${travelMode === 'WALKING'
                  ? isLight
                    ? 'bg-white text-cyan-700 shadow-xs border border-slate-200'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              <Footprints className="h-3.5 w-3.5" />
              <span>Walk</span>
            </button>
            <button
              onClick={() => setTravelMode('VEHICLE')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${travelMode === 'VEHICLE'
                  ? isLight
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              <Car className="h-3.5 w-3.5" />
              <span>Drive</span>
            </button>
          </div>

          {/* Status Indicator */}
          <div
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.classes}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusBadge.dot} animate-pulse`} />
            <span>{statusBadge.text}</span>
          </div>
        </div>

        {/* Center: Main Navigation Tabs (Desktop) */}
        <nav
          className={`hidden lg:flex items-center gap-1 p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
            }`}
        >
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'dashboard'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'bg-zinc-800 text-white shadow-xs font-bold'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('map')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'map'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'bg-zinc-800 text-white shadow-xs font-bold'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Live Map
          </button>
          <button
            onClick={() => onSelectTab('routes')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'routes'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'bg-zinc-800 text-white shadow-xs font-bold'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Safer Routes
          </button>
          <button
            onClick={() => onSelectTab('havens')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'havens'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'bg-zinc-800 text-white shadow-xs font-bold'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Nearby Help
          </button>
          <button
            onClick={() => onSelectTab('signals')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'signals'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'bg-zinc-800 text-white shadow-xs font-bold'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Recent Reports
          </button>
          <button
            onClick={() => onSelectTab('ai-engine')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'ai-engine'
                ? isLight
                  ? 'bg-white text-cyan-700 shadow-xs font-bold'
                  : 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-xs font-bold'
                : isLight
                  ? 'text-slate-600 hover:text-cyan-700'
                  : 'text-zinc-400 hover:text-cyan-300'
              }`}
          >
            <Activity className="h-3.5 w-3.5 text-cyan-500" />
            <span>Safety Tools</span>
          </button>
        </nav>

        {/* Right: Actions, Theme Toggle & Emergency Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Day / Night Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Switch to Night Mode (Dark)' : 'Switch to Day Mode (Light)'}
            aria-label="Toggle theme"
            className={`p-2 rounded-xl border transition-all duration-200 active:scale-90 ${isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-amber-600'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-amber-300'
              }`}
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* Emergency Contact Profile Trigger */}
          {onOpenEmergencyContact && (
            <button
              onClick={() => currentUser ? onOpenEmergencyContact() : openAuthModal()}
              title={emergencyContact ? `Emergency Contact: ${emergencyContact.name}` : 'Add Emergency Contact'}
              aria-label="Emergency contact"
              className={`p-2 rounded-xl border transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${emergencyContact
                  ? isLight
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                    : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-800 text-rose-300'
                  : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
            >
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="hidden xl:inline text-xs font-semibold">
                {emergencyContact ? emergencyContact.name.split(' ')[0] : 'Contact'}
              </span>
            </button>
          )}

          {/* Trip History */}
          {onOpenTripHistory && (
            <button
              onClick={() => currentUser ? onOpenTripHistory() : openAuthModal()}
              title="View Safety Trip History"
              aria-label="Trip history"
              className={`p-2 rounded-xl border transition-colors ${isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
            >
              <History className="h-4 w-4" />
            </button>
          )}

          {/* Admin Dashboard Panel */}
          {currentUser && currentUser.email === 'erumallasathvika2677@gmail.com' && onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className="inline-flex whitespace-nowrap items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-transform active:scale-95"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* Report an Issue Button */}
          <button
            onClick={() => currentUser ? openReportModal() : openAuthModal()}
            className="hidden sm:inline-flex whitespace-nowrap items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-transform active:scale-95"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Report Issue</span>
          </button>

          {/* User Sign In / Profile */}
          <button
            onClick={openAuthModal}
            className={`inline-flex whitespace-nowrap items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-cyan-300'
              }`}
          >
            {currentUser ? (
              <>
                <User className="h-3.5 w-3.5 text-cyan-500" />
                <span>{currentUser.displayName.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5 text-cyan-500" />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Followed Mode SOS */}
          <button
            onClick={() => currentUser ? openFollowedMode() : openAuthModal()}
            className="whitespace-nowrap relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40 transition-transform active:scale-95"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Followed Mode</span>
            <span className="sm:hidden">Help</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div
        className={`flex lg:hidden overflow-x-auto border-t px-3 py-2 gap-1.5 scrollbar-none items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
          }`}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-lg ${activeTab === 'dashboard'
                ? isLight
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-zinc-800 text-white font-bold'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('map')}
            className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-lg ${activeTab === 'map'
                ? isLight
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-zinc-800 text-white font-bold'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            Map
          </button>
          <button
            onClick={() => onSelectTab('routes')}
            className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-lg ${activeTab === 'routes'
                ? isLight
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-zinc-800 text-white font-bold'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            Routes
          </button>
          <button
            onClick={() => onSelectTab('havens')}
            className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-lg ${activeTab === 'havens'
                ? isLight
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-zinc-800 text-white font-bold'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            Help
          </button>
          <button
            onClick={() => onSelectTab('signals')}
            className={`whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-lg ${activeTab === 'signals'
                ? isLight
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-zinc-800 text-white font-bold'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            Reports
          </button>
        </div>

        {/* Mobile Quick Travel Mode */}
        <div
          className={`flex items-center p-0.5 rounded-lg border text-[11px] ${isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-zinc-900 border-zinc-800'
            }`}
        >
          <button
            onClick={() => setTravelMode('WALKING')}
            className={`px-2 py-0.5 rounded font-semibold ${travelMode === 'WALKING'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-cyan-950 text-cyan-300'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            🚶 Walk
          </button>
          <button
            onClick={() => setTravelMode('VEHICLE')}
            className={`px-2 py-0.5 rounded font-semibold ${travelMode === 'VEHICLE'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-indigo-950 text-indigo-300'
                : isLight
                  ? 'text-slate-600'
                  : 'text-zinc-400'
              }`}
          >
            🚗 Drive
          </button>
        </div>
      </div>
    </header>
  );
};
