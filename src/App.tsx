/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { SafetyPulseBanner } from './components/SafetyPulseBanner';
import { RouteScoringView } from './components/RouteScoringView';
import { FollowedModeHud } from './components/FollowedModeHud';
import { AiFunctionWorkbench } from './components/AiFunctionWorkbench';
import { SafeHavensDirectory } from './components/SafeHavensDirectory';
import { SignalFeedView } from './components/SignalFeedView';
import { ReportIncidentModal } from './components/ReportIncidentModal';
import { NavigationHud } from './components/NavigationHud';

import { AuthModal, UserAuthProfile } from './components/AuthModal';
import { AdminModerationPortal } from './components/AdminModerationPortal';
import { TripHistoryModal } from './components/TripHistoryModal';
import { EmergencyContactModal } from './components/EmergencyContactModal';
import { Bell, Navigation, Shield, AlertTriangle, X } from 'lucide-react';

import { LandingPage } from './components/LandingPage';
import { AdminDashboard } from './components/AdminDashboard';
import { StartupScreen } from './components/StartupScreen';
import { UserDashboard } from './components/UserDashboard';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    navigation,
    setSelectedRouteId,
    activeNotification,
    dismissNotification,
    openFollowedMode,
    travelMode,
    theme,
    currentUser,
    setCurrentUser,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
  } = useApp();

  const isLight = theme === 'light';

  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isTripHistoryOpen, setIsTripHistoryOpen] = useState<boolean>(false);
  const [isEmergencyContactOpen, setIsEmergencyContactOpen] = useState<boolean>(false);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-cyan-500 selection:text-black ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-100'
        }`}
    >
      {/* Sticky Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuthModal={openAuthModal}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenTripHistory={() => setIsTripHistoryOpen(true)}
        onOpenEmergencyContact={() => setIsEmergencyContactOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Active Turn-by-Turn Navigation HUD */}
        {navigation.isNavigating && <NavigationHud />}

        {/* Real-Time Safety Pulse Banner */}
        {activeTab !== 'ai-engine' && <SafetyPulseBanner />}

        {/* In-Route Notification Toast */}
        {activeNotification && activeTab === 'map' && !navigation.isNavigating && (
          <div
            className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 shadow-md transition-colors ${isLight ? 'bg-cyan-50 border-cyan-200 text-slate-900' : 'bg-cyan-950/40 border-cyan-800/60 text-zinc-100'
              }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Bell className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold">{activeNotification.alert_title}:</span>{' '}
                <span>{activeNotification.notification_text}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedRouteId('route_illuminated_corridor');
                  setActiveTab('routes');
                  dismissNotification();
                }}
                className="whitespace-nowrap px-3 py-1 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-xs"
              >
                {activeNotification.action_prompt || 'View'}
              </button>
              <button
                onClick={dismissNotification}
                className={`p-1 rounded-md transition-colors ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}



        {/* TAB 0: USER DASHBOARD */}
        {activeTab === 'dashboard' && (
          <UserDashboard onOpenEmergencyContact={() => setIsEmergencyContactOpen(true)} />
        )}

        {/* TAB 1: LIVE MAP */}
        {activeTab === 'map' && (
          <div className="space-y-5 sm:space-y-6">
            <InteractiveMap
              onSelectRouteTab={() => setActiveTab('routes')}
              onSelectHavenTab={() => setActiveTab('havens')}
              onSelectSignalsTab={() => setActiveTab('signals')}
            />

            {/* Quick Action Navigation Cards below map */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('routes')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all duration-150 space-y-1.5 ${isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <Navigation className="h-3.5 w-3.5" /> Safer Route Scorer
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">5-Star Ratings</span>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Compare Safest vs Fastest routes for {travelMode} mode with clear tradeoff details.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('havens')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all duration-150 space-y-1.5 ${isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Shield className="h-3.5 w-3.5" /> Nearby Help & Havens
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">5 Open Sanctuaries</span>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Real-time distance tracking and one-tap emergency haven routing.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('signals')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all duration-150 space-y-1.5 ${isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Recent Community Reports
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">Verified Live</span>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Real-time incident reporting, community confirmations & dispute tracking.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROUTE SCORER */}
        {activeTab === 'routes' && <RouteScoringView onSelectRouteTab={() => setActiveTab('map')} />}

        {/* TAB 3: SAFE HAVENS */}
        {activeTab === 'havens' && <SafeHavensDirectory />}

        {/* TAB 4: SIGNAL FEED */}
        {activeTab === 'signals' && <SignalFeedView />}

        {/* TAB 5: AI ENGINE TOOLS */}
        {activeTab === 'ai-engine' && <AiFunctionWorkbench />}
      </main>

      {/* Footer */}
      <footer
        className={`border-t px-4 sm:px-6 py-6 mt-12 text-xs transition-colors duration-200 ${isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-zinc-950 border-zinc-800/80 text-zinc-500'
          }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-500" />
            <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>SafeHeaven Navigation</span>
            <span>—</span>
            <span>Safety-First Travel Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            <span>5-Star Safety Ratings</span>
            <span>•</span>
            <span>Zero Discrimination Standard</span>
            <span>•</span>
            <span>In emergency call local emergency services</span>
          </div>
        </div>
      </footer>

      {/* Persistent Modals */}
      <FollowedModeHud />
      <ReportIncidentModal />
      <TripHistoryModal
        isOpen={isTripHistoryOpen}
        onClose={() => setIsTripHistoryOpen(false)}
      />
      <EmergencyContactModal
        isOpen={isEmergencyContactOpen}
        onClose={() => setIsEmergencyContactOpen(false)}
      />
      <AdminModerationPortal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onLoginSuccess={setCurrentUser}
        onTriggerEmergencyBypass={() => openFollowedMode()}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { pathname, currentUser, navigate, openAuthModal, isAuthLoading } = useApp();
  const [showStartup, setShowStartup] = useState<boolean>(true);

  // Redirect logic
  React.useEffect(() => {
    if (showStartup || isAuthLoading) return;

    if (pathname === '/app' && !currentUser) {
      // Redirect to landing if not logged in
      navigate('/');
      openAuthModal();
    } else if ((pathname === '/' || pathname === '') && currentUser) {
      // Redirect to app if logged in
      navigate('/app');
    }
  }, [pathname, currentUser, navigate, openAuthModal, showStartup, isAuthLoading]);

  if (showStartup || isAuthLoading) {
    return <StartupScreen onComplete={() => setShowStartup(false)} />;
  }

  if (pathname === '/admin') {
    return <AdminDashboard />;
  }

  if (pathname === '/app') {
    return <MainAppContent />;
  }

  // Default to landing page
  return <LandingPage />;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
