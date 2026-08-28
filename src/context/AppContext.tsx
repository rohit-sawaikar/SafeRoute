/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, subscribeToAllIncidents } from '../services/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import type {
  TravelMode,
  RoutePriority,
  SafetyPulseOutput,
  SaferRouteScoringOutput,
  RouteScoreDetails,
  FollowedModeOutput,
  SafeHavenCandidate,
  SafeHavenRankingOutput,
  NavigationState,
  NavigationStep,
  CommunityIncident,
  SafetyNotificationOutput,
  TripSafetyHistory,
  RouteCaution,
  UserAuthProfile,
} from '../types/safety';
import { getSafetyStarRating } from '../types/safety';
import {
  MOCK_INCIDENTS,
  MOCK_ROUTE_OPTIONS,
  MOCK_SAFE_HAVENS,
  AI_FUNCTION_PRESETS,
} from '../data/mockSafetyData';
import {
  fetchSafetyPulse,
  fetchSaferRouteScoring,
  fetchFollowedMode,
  fetchSafeHavenRanking,
  fetchSafetyNotification,
} from '../services/safetyAiService';
import { GeocodedLocation } from '../services/geocodingService';
import { RealRoute, fetchRealRoutes } from '../services/routingService';


export interface EmergencyContactInfo {
  name: string;
  phone: string;
  countryCode?: string;
  relationship?: string;
}

export type AppTab = 'dashboard' | 'map' | 'routes' | 'havens' | 'ai-engine' | 'signals';

interface AppContextType {
  // Theme (Day / Night)
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Custom Routing State
  pathname: string;
  navigate: (path: string) => void;

  // User Authentication
  currentUser: UserAuthProfile | null;
  setCurrentUser: (user: UserAuthProfile | null) => void;
  isAuthLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (val: boolean) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  // Routing State
  originLocation: GeocodedLocation | null;
  setOriginLocation: (loc: GeocodedLocation | null) => void;
  destinationLocation: GeocodedLocation | null;
  setDestinationLocation: (loc: GeocodedLocation | null) => void;
  calculatedRoutes: RealRoute[];
  setCalculatedRoutes: (routes: RealRoute[]) => void;
  isCalculatingRoutes: boolean;
  routeError: string | null;
  calculateRoutes: (orig: GeocodedLocation, dest: GeocodedLocation, mode: TravelMode) => Promise<RealRoute[]>;

  // Tab & Back Navigation History
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  tabHistory: AppTab[];
  navigateBack: () => void;
  canNavigateBack: boolean;

  // Emergency Contact
  emergencyContact: EmergencyContactInfo | null;
  setEmergencyContact: (contact: EmergencyContactInfo | null) => void;

  // Travel Mode & Route Priority
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  routePriority: RoutePriority;
  setRoutePriority: (priority: RoutePriority) => void;

  // Navigation & Spatial State
  navigation: NavigationState;
  selectedRouteId: string;
  setSelectedRouteId: (id: string) => void;
  startNavigation: (
    routeId?: string,
    customRoute?: {
      name?: string;
      distance_km?: number;
      est_time_min?: number;
      coordinates?: Array<[number, number]>;
      destinationName?: string;
    }
  ) => void;
  stopNavigation: () => void;
  togglePauseNavigation: () => void;
  resumeNavigation: () => void;
  advanceSimulationStep: () => void;
  toggleRealGps: () => void;
  navigateToHaven: (haven: SafeHavenCandidate) => void;
  applySuggestedReroute: () => void;
  dismissRerouteNotice: () => void;
  continueCurrentRoute: () => void;
  closeCompletionSummary: () => void;

  // Trip History
  tripHistory: TripSafetyHistory[];
  clearTripHistory: () => void;

  // Time-of-Day & Simulation Engine
  timeOfDay: string;
  setTimeOfDay: (time: string) => void;
  isSimulatingTime: boolean;
  setIsSimulatingTime: (val: boolean) => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  triggerSimulationScenario: (scenario: 'incident_ahead' | 'midnight_rush' | 'all_clear') => void;

  // Incidents & Community Signals
  incidents: CommunityIncident[];
  addIncident: (newReport: any) => void;
  corroborateIncident: (id: string) => void;
  disputeIncident: (id: string) => void;
  resolveIncident: (id: string) => void;

  // Safe Havens
  safeHavens: SafeHavenCandidate[];
  havenRankingData: SafeHavenRankingOutput | null;
  isHavenRankingLoading: boolean;
  refreshHavenRanking: () => Promise<void>;

  // Routes & Scoring
  routeScores: RouteScoreDetails[];
  routeScoreData: SaferRouteScoringOutput | null;
  isRouteScoringLoading: boolean;
  refreshRouteScores: () => Promise<void>;

  // Safety Pulse
  pulseData: SafetyPulseOutput | null;
  isPulseLoading: boolean;
  refreshSafetyPulse: () => Promise<void>;

  // Followed Mode HUD
  isFollowedModeOpen: boolean;
  openFollowedMode: () => void;
  closeFollowedMode: () => void;
  followedData: FollowedModeOutput | null;
  isFollowedLoading: boolean;

  // Report Modal
  isReportModalOpen: boolean;
  openReportModal: () => void;
  closeReportModal: () => void;

  // Active in-route alert notification
  activeNotification: SafetyNotificationOutput | null;
  dismissNotification: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Route Waypoint Geometry Coordinates (Mapped to Local Navigation Area)
const ROUTE_WAYPOINTS: Record<string, Array<{ x: number; y: number; lat: number; lng: number; text: string; note?: string }>> = {
  route_illuminated_corridor: [
    { x: 180, y: 380, lat: 21.1458, lng: 79.0882, text: 'Depart Sitabuldi Center heading North', note: 'Continuous sidewalk with municipal LED poles' },
    { x: 260, y: 280, lat: 21.1485, lng: 79.0885, text: 'Continue along Wardha Road past 24/7 Pharmacy (Safe Haven)', note: 'Staffed storefronts & security presence' },
    { x: 420, y: 220, lat: 21.1510, lng: 79.0888, text: 'Pass Metro Interchange signal crosswalk', note: 'High pedestrian density zone' },
    { x: 560, y: 160, lat: 21.1528, lng: 79.0889, text: 'Turn slight right onto Station Approach Road', note: 'Bright commercial marquee lighting' },
    { x: 680, y: 120, lat: 21.1538, lng: 79.0890, text: 'Arrive at Central Station Concourse', note: 'Safe destination reached' },
  ],
  route_pine_shortcut: [
    { x: 180, y: 380, lat: 21.1458, lng: 79.0882, text: 'Head North on Sitabuldi Market for 120m' },
    { x: 380, y: 330, lat: 21.1480, lng: 79.0872, text: 'Turn left into West Bypass alley', note: 'Caution: Reduced lighting fixture reported' },
    { x: 520, y: 250, lat: 21.1515, lng: 79.0875, text: 'Exit alley onto Station Road junction' },
    { x: 680, y: 120, lat: 21.1538, lng: 79.0890, text: 'Arrive at Central Station' },
  ],
  route_transit_concourse: [
    { x: 180, y: 380, lat: 21.1458, lng: 79.0882, text: 'Head East toward Metro Concourse' },
    { x: 220, y: 440, lat: 21.1465, lng: 79.0905, text: 'Enter Skywalk Promenade', note: '24/7 CCTV & Security patrols' },
    { x: 450, y: 430, lat: 21.1495, lng: 79.0910, text: 'Follow illuminated covered walkway North' },
    { x: 580, y: 360, lat: 21.1525, lng: 79.0902, text: 'Cross pedestrian skyway to Main Hub' },
    { x: 680, y: 120, lat: 21.1538, lng: 79.0890, text: 'Arrive at Central Station' },
  ],
};

const INITIAL_TRIP_HISTORY: TripSafetyHistory[] = [
  {
    id: 'trip_demo_1',
    timestamp: Date.now() - 3600000 * 2,
    formattedDate: 'Today, 12:30 PM',
    originName: 'Home (7th & Market)',
    destinationName: 'Metro Central Station',
    travelMode: 'WALKING',
    safetyScore: 92,
    stars: 5,
    starDisplay: '★★★★★',
    distanceKm: 1.2,
    travelTimeMin: 14,
    alertsEncountered: 0,
    incidentsAvoided: 1,
  },
  {
    id: 'trip_demo_2',
    timestamp: Date.now() - 3600000 * 24,
    formattedDate: 'Yesterday, 8:15 PM',
    originName: 'Downtown Tech Hub',
    destinationName: 'City Mall Plaza',
    travelMode: 'VEHICLE',
    safetyScore: 84,
    stars: 4,
    starDisplay: '★★★★☆',
    distanceKm: 4.6,
    travelTimeMin: 11,
    alertsEncountered: 1,
    incidentsAvoided: 1,
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Custom SPA Router Routing State
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  }, []);

  // Theme State (Day / Night Mode with LocalStorage & OS Preference detection)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('safeheaven_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {
      // Fallback
    }
    return 'dark';
  });

  // Sync theme with document element
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
      }
      localStorage.setItem('safeheaven_theme', theme);
    } catch (e) {
      console.warn('Theme storage error:', e);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // User Authentication States (Derived strictly from Firebase Authentication)
  const [currentUser, setCurrentUser] = useState<UserAuthProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);
      if (firebaseUser) {
        let isAdmin = false;
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          isAdmin = !!idTokenResult.claims.admin;
          const adminEmail = ((import.meta as any).env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
          if (adminEmail && firebaseUser.email?.toLowerCase() === adminEmail) {
            isAdmin = true;
          }
        } catch (e) {
          console.warn("Failed to retrieve ID token claims", e);
          const adminEmail = ((import.meta as any).env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
          if (adminEmail && firebaseUser.email?.toLowerCase() === adminEmail) {
            isAdmin = true;
          }
        }

        const profile: UserAuthProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'SafeRoute User',
          email: firebaseUser.email || undefined,
          phone: firebaseUser.phoneNumber || undefined,
          homeCountryCode: 'IN',
          isDiscreetMode: false,
          createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : Date.now(),
          admin: isAdmin,
        };
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  // Routing States
  const [originLocation, setOriginLocation] = useState<GeocodedLocation | null>({
    id: 'orig_sitabuldi_center',
    name: 'Sitabuldi Center',
    displayAddress: 'Sitabuldi, Nagpur, Maharashtra, India',
    latitude: 21.1458,
    longitude: 79.0882,
  });
  const [destinationLocation, setDestinationLocation] = useState<GeocodedLocation | null>(null);
  const [calculatedRoutes, setCalculatedRoutes] = useState<RealRoute[]>([]);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);


  // Tab Navigation & Back-History Stack
  const [activeTab, setActiveTabInternal] = useState<AppTab>('dashboard');
  const [tabHistory, setTabHistory] = useState<AppTab[]>(['dashboard']);

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabInternal(tab);
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
  }, []);

  const navigateBack = useCallback(() => {
    setTabHistory((prev) => {
      if (prev.length <= 1) {
        setActiveTabInternal('dashboard');
        return ['dashboard'];
      }
      const nextHistory = prev.slice(0, prev.length - 1);
      const previousTab = nextHistory[nextHistory.length - 1] || 'dashboard';
      setActiveTabInternal(previousTab);
      return nextHistory;
    });
  }, []);

  const canNavigateBack = activeTab !== 'dashboard' || tabHistory.length > 1;

  // Emergency Contact State with LocalStorage
  const [emergencyContact, setEmergencyContactInternal] = useState<EmergencyContactInfo | null>(() => {
    try {
      const saved = localStorage.getItem('safeheaven_emergency_contact');
      return saved ? JSON.parse(saved) : {
        name: 'Alex Morgan',
        phone: '+1 (555) 234-5678',
        relationship: 'Family / Sibling',
      };
    } catch {
      return null;
    }
  });

  const setEmergencyContact = useCallback((contact: EmergencyContactInfo | null) => {
    setEmergencyContactInternal(contact);
    try {
      if (contact) {
        localStorage.setItem('safeheaven_emergency_contact', JSON.stringify(contact));
      } else {
        localStorage.removeItem('safeheaven_emergency_contact');
      }
    } catch (e) {
      console.warn('Failed to save emergency contact:', e);
    }
  }, []);

  // Travel Mode (Vehicle vs Walking) & Priority
  const [travelMode, setTravelMode] = useState<TravelMode>('WALKING');
  const [routePriority, setRoutePriority] = useState<RoutePriority>('SAFETY');

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<string>('22:30');
  const [isSimulatingTime, setIsSimulatingTime] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);

  // Trip History
  const [tripHistory, setTripHistory] = useState<TripSafetyHistory[]>(() => {
    try {
      const saved = localStorage.getItem('safeheaven_trip_history');
      return saved ? JSON.parse(saved) : INITIAL_TRIP_HISTORY;
    } catch {
      return INITIAL_TRIP_HISTORY;
    }
  });

  const addTripHistory = useCallback((entry: TripSafetyHistory) => {
    setTripHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 20);
      try {
        localStorage.setItem('safeheaven_trip_history', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save trip history', e);
      }
      return updated;
    });
  }, []);

  const clearTripHistory = useCallback(() => {
    setTripHistory([]);
    try {
      localStorage.removeItem('safeheaven_trip_history');
    } catch (e) {
      console.warn('Failed to clear trip history', e);
    }
  }, []);

  // Incidents
  const [incidents, setIncidents] = useState<CommunityIncident[]>(() =>
    MOCK_INCIDENTS.map((inc) => ({
      ...inc,
      category: inc.category as any,
      reporterToken: 'anon_user_' + Math.random().toString(36).substring(2, 8),
      isResolved: false,
      resolvedVotes: 0,
      disputes: 0,
      status: 'PUBLISHED',
      source: 'demo',
    }))
  );

  // Real-time Firestore subscription for community incidents
  useEffect(() => {
    const unsub = subscribeToAllIncidents(
      (firestoreIncidents) => {
        if (!firestoreIncidents) return;

        const formattedFirestore: CommunityIncident[] = firestoreIncidents.map((inc: any) => ({
          id: inc.id,
          category: inc.category || 'GENERAL_SAFETY',
          title: inc.title || `${String(inc.category || 'INCIDENT').replace(/_/g, ' ')} Reported`,
          description: inc.description || '',
          severity: inc.severity || 'MEDIUM',
          reportedAt: inc.reportedAt || new Date().toISOString(),
          minutesAgo: inc.minutesAgo !== undefined ? inc.minutesAgo : Math.max(0, Math.floor((Date.now() - (inc.createdAt || Date.now())) / 60000)),
          confidence: inc.confidence !== undefined ? inc.confidence : 0.85,
          corroborations: inc.corroborations || 1,
          hasPhoto: Boolean(inc.hasPhoto || (inc.photos && inc.photos.length > 0)),
          location: inc.location || { lat: 37.7749, lng: -122.4194, name: inc.address || 'Reported Location', x: 400, y: 250 },
          reporterToken: inc.reporterToken || 'anon_user',
          isResolved: Boolean(inc.isResolved || inc.status === 'RESOLVED' || inc.status === 'EXPIRED' || inc.status === 'REJECTED'),
          resolvedVotes: inc.resolvedVotes || 0,
          disputes: inc.disputes || 0,
          status: inc.status || 'PUBLISHED',
          source: 'community',
        }));

        setIncidents((prev) => {
          // Preserve demo/mock incidents
          const demoIncidents = prev.filter((i) => i.source === 'demo');
          const demoIds = new Set(demoIncidents.map((d) => d.id));
          const cleanCommunity = formattedFirestore.filter((f) => !demoIds.has(f.id));
          return [...cleanCommunity, ...demoIncidents];
        });
      },
      (err) => {
        console.warn('Firestore subscription notice (using local state fallback):', err);
      }
    );

    return () => unsub();
  }, []);

  // Safe Havens
  const [safeHavens, setSafeHavens] = useState<SafeHavenCandidate[]>(MOCK_SAFE_HAVENS);
  const [havenRankingData, setHavenRankingData] = useState<SafeHavenRankingOutput | null>(() => ({
    ranked_havens: MOCK_SAFE_HAVENS.map((h, i) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      distance_meters: h.distance_meters,
      is_open: h.is_open_now,
      verification_level: h.is_verified_partner ? 'COMMUNITY_PARTNER' : 'PUBLIC_FACILITY',
      accessibility_score: h.has_well_lit_entrance ? 95 : 75,
      walk_time_min: h.walk_time_minutes,
      navigation_tip: 'Main entrance on illuminated thoroughfare',
      rank_score: 96 - i * 6,
    })),
    top_recommendation_reason: 'Nearest verified 24/7 partner with on-site staff and well-illuminated entrance.',
  }));
  const [isHavenRankingLoading, setIsHavenRankingLoading] = useState(false);

  // Route Scoring
  const [routeScoreData, setRouteScoreData] = useState<SaferRouteScoringOutput | null>(null);
  const [isRouteScoringLoading, setIsRouteScoringLoading] = useState(false);

  // Safety Pulse
  const [pulseData, setPulseData] = useState<SafetyPulseOutput | null>(() => ({
    safety_status: 'NORMAL',
    confidence: 0.88,
    recent_signals: [
      'Streetlights fully lit on Market St corridor',
      'Active foot traffic and open stores nearby',
      'Emergency precinct within 300m',
    ],
    explanation: 'Downtown Corridor is well-lit with steady foot traffic and open shops. Safe to walk.',
    recommended_action: 'Stick to well-lit main avenues.',
    timestamp: new Date().toISOString(),
  }));
  const [isPulseLoading, setIsPulseLoading] = useState(false);

  // Followed Mode
  const [isFollowedModeOpen, setIsFollowedModeOpen] = useState(false);
  const [followedData, setFollowedData] = useState<FollowedModeOutput | null>(null);
  const [isFollowedLoading, setIsFollowedLoading] = useState(false);

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Notification Toast
  const [activeNotification, setActiveNotification] = useState<SafetyNotificationOutput | null>({
    alert_title: 'Route Advisory',
    notification_text: 'Streetlamp issue reported 320m ahead on secondary street.',
    urgency: 'ADVISORY',
    distance_meters: 320,
    timestamp_formatted: '34m ago',
    action_prompt: 'View Safer Route',
  });

  // Navigation State
  const [navigation, setNavigation] = useState<NavigationState>({
    isNavigating: false,
    travelMode: 'WALKING',
    activeRouteId: 'route_illuminated_corridor',
    routeName: 'Option A: Market Boulevard (Illuminated Path)',
    destinationName: 'Nagpur Central Station',
    currentStepIndex: 0,
    progressPercent: 0,
    currentPosition: { x: 180, y: 380, lat: 21.1458, lng: 79.0882, headingDeg: 45 },
    originPosition: { x: 180, y: 380, lat: 21.1458, lng: 79.0882 },
    destinationPosition: { x: 680, y: 120, lat: 21.1538, lng: 79.0890 },
    totalDistanceKm: 1.2,
    totalEstTimeMin: 14,
    distanceRemainingKm: 1.2,
    etaMinutes: 14,
    speedKmh: 4.8,
    isPaused: false,
    isSimulatingWalk: false,
    gpsMode: 'SIMULATED',
    steps: ROUTE_WAYPOINTS['route_illuminated_corridor'].map((wp) => ({
      text: wp.text,
      distanceMeters: 250,
      point: { x: wp.x, y: wp.y, lat: wp.lat, lng: wp.lng },
      safetyNote: wp.note,
    })),
    arrivalState: 'IDLE',
    completedSummary: null,
    rerouteNotice: null,
  });

  // Dynamic Route Scores calculation
  // Dynamic Route Scores calculation
  const dynamicRouteScores = useMemo<RouteScoreDetails[]>(() => {
    if (!destinationLocation) return [];
    return calculatedRoutes as unknown as RouteScoreDetails[];
  }, [destinationLocation, calculatedRoutes]);

  // Recalculate distance to havens
  useEffect(() => {
    const userPos = navigation.currentPosition;
    setSafeHavens((prev) =>
      prev.map((haven, idx) => {
        const havenCoords = [
          { x: 260, y: 280 },
          { x: 340, y: 120 },
          { x: 560, y: 380 },
          { x: 640, y: 260 },
          { x: 210, y: 340 },
        ][idx] || { x: 400, y: 200 };

        const dx = (havenCoords.x - userPos.x) * 1.5;
        const dy = (havenCoords.y - userPos.y) * 1.5;
        const distMeters = Math.max(30, Math.round(Math.sqrt(dx * dx + dy * dy)));
        const walkMin = Math.max(1, Math.round(distMeters / 75));

        return {
          ...haven,
          distance_meters: distMeters,
          walk_time_minutes: walkMin,
          coordinates: havenCoords,
        };
      })
    );
  }, [navigation.currentPosition]);

  // Refresh Pulse
  const refreshSafetyPulse = useCallback(async () => {
    setIsPulseLoading(true);
    try {
      const res = await fetchSafetyPulse({
        ...AI_FUNCTION_PRESETS.safetyPulse,
        timeOfDay: timeOfDay,
        pedestrianActivitySignal: timeOfDay > '23:00' ? 'LOW' : 'MODERATE',
        incidentReports: incidents
          .filter((i) => !i.isResolved)
          .map((inc) => ({
            id: inc.id,
            category: inc.category,
            description: inc.description,
            timestamp: inc.reportedAt,
            confidence: inc.confidence,
            distanceMeters: 240,
          })),
      });
      setPulseData(res.data);
    } catch (err) {
      console.error('refreshSafetyPulse error:', err);
    } finally {
      setIsPulseLoading(false);
    }
  }, [timeOfDay, incidents]);

  // Calculate routes using OSRM routing and query incidents dynamically
  const calculateRoutes = useCallback(async (
    orig: GeocodedLocation,
    dest: GeocodedLocation,
    mode: TravelMode
  ) => {
    setIsCalculatingRoutes(true);
    setRouteError(null);
    try {
      const routes = await fetchRealRoutes({
        origin: { latitude: orig.latitude, longitude: orig.longitude },
        destination: { latitude: dest.latitude, longitude: dest.longitude },
        travelMode: mode,
      });

      if (!routes || routes.length === 0) {
        throw new Error('No navigable route found between the selected points.');
      }

      // Query active incidents along route coordinates and map safety scores
      const routesToScore = routes.map((route) => {
        const nearby_incidents = incidents
          .filter((inc) => !inc.isResolved)
          .map((inc) => {
            let minDist = Infinity;
            route.coordinates.forEach((coord) => {
              const dLat = coord[0] - inc.location.lat;
              const dLng = coord[1] - inc.location.lng;
              const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
              if (dist < minDist) minDist = dist;
            });
            return {
              id: inc.id,
              category: inc.category,
              severity: inc.severity,
              distance_from_path_meters: Math.round(minDist),
              reported_minutes_ago: Math.round(inc.minutesAgo),
            };
          })
          .filter((inc) => inc.distance_from_path_meters <= 400);

        return {
          route_id: route.route_id,
          name: route.name,
          distance_km: route.distance_km,
          est_time_min: route.est_time_min,
          path_description: route.summary,
          lighting_level: (route.route_id.includes('safest') ? 'WELL_LIT' : route.route_id.includes('fastest') ? 'POOR' : 'MODERATE') as any,
          pedestrian_density: (route.route_id.includes('safest') ? 'HIGH' : route.route_id.includes('fastest') ? 'LOW' : 'MODERATE') as any,
          nearby_incidents,
          emergency_services_proximity_min: Math.round(2 + Math.random() * 3),
        };
      });

      setIsRouteScoringLoading(true);
      const scoreResult = await fetchSaferRouteScoring(routesToScore, timeOfDay, mode);
      setIsRouteScoringLoading(false);

      const scoredRoutes = routes.map((route) => {
        const matchingScore = scoreResult.data.routes.find((sr) => sr.route_id === route.route_id);
        if (matchingScore) {
          return {
            ...route,
            safety_score: matchingScore.safety_score,
            star_rating: matchingScore.star_rating,
            risk_level: (matchingScore.safety_score >= 80 ? 'LOW' : matchingScore.safety_score >= 60 ? 'MODERATE' : 'HIGH') as any,
            key_tradeoffs: matchingScore.key_tradeoffs,
            cautionary_notes: matchingScore.cautionary_notes,
            safety_factors_explained: matchingScore.safety_factors_explained,
            score_breakdown: matchingScore.score_breakdown,
            lighting_rating: matchingScore.lighting_rating as any,
            activity_level: matchingScore.activity_level as any,
          };
        }
        return route;
      });

      setCalculatedRoutes(scoredRoutes);
      setRouteScoreData(scoreResult.data);
      if (scoredRoutes.length > 0) {
        setSelectedRouteId(scoredRoutes[0].route_id);
      }
      return scoredRoutes;
    } catch (e: any) {
      console.error('calculateRoutes failed:', e);
      setRouteError(e.message || 'Routing calculation failed.');
      setCalculatedRoutes([]);
      throw e;
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, [incidents, timeOfDay]);

  // Refresh Route Scores
  const refreshRouteScores = useCallback(async () => {
    if (!originLocation || !destinationLocation) {
      setCalculatedRoutes([]);
      return;
    }
    setIsRouteScoringLoading(true);
    try {
      await calculateRoutes(originLocation, destinationLocation, travelMode);
    } catch (err) {
      console.error('refreshRouteScores error:', err);
    } finally {
      setIsRouteScoringLoading(false);
    }
  }, [originLocation, destinationLocation, travelMode, calculateRoutes]);

  // Refresh Haven Ranking
  const refreshHavenRanking = useCallback(async () => {
    setIsHavenRankingLoading(true);
    try {
      const res = await fetchSafeHavenRanking(safeHavens, timeOfDay);
      setHavenRankingData(res.data);
    } catch (err) {
      console.error('refreshHavenRanking error:', err);
    } finally {
      setIsHavenRankingLoading(false);
    }
  }, [safeHavens, timeOfDay]);

  // Staggered initial background refresh
  useEffect(() => {
    let isCancelled = false;
    const loadSequentially = async () => {
      try {
        if (!isCancelled) await refreshSafetyPulse();
        await new Promise((r) => setTimeout(r, 800));
        if (!isCancelled) await refreshRouteScores();
      } catch (e) {
        // Handled silently
      }
    };
    loadSequentially();
    return () => {
      isCancelled = true;
    };
  }, [travelMode]);

  // Time progression simulation loop
  useEffect(() => {
    if (!isSimulatingTime) return;

    const interval = setInterval(() => {
      setTimeOfDay((prev) => {
        const [h, m] = prev.split(':').map(Number);
        const totalMin = (h * 60 + m + 5 * simulationSpeed) % (24 * 60);
        const newH = Math.floor(totalMin / 60);
        const newM = totalMin % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      });

      setIncidents((prev) =>
        prev.map((inc) => {
          const newMinutes = inc.minutesAgo + 5 * simulationSpeed;
          return {
            ...inc,
            minutesAgo: newMinutes,
            confidence: +(inc.confidence * 0.98).toFixed(2),
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulatingTime, simulationSpeed]);

  // Active Navigation simulation loop
  useEffect(() => {
    if (!navigation.isNavigating || navigation.isPaused || !navigation.isSimulatingWalk) return;
    if (navigation.arrivalState === 'JUST_REACHED' || navigation.arrivalState === 'COMPLETED_SUMMARY') return;

    const interval = setInterval(() => {
      setNavigation((prev) => {
        if (!prev.isNavigating || prev.isPaused || !prev.isSimulatingWalk) return prev;
        if (prev.arrivalState === 'JUST_REACHED' || prev.arrivalState === 'COMPLETED_SUMMARY') return prev;

        const waypoints = ROUTE_WAYPOINTS[prev.activeRouteId] || ROUTE_WAYPOINTS['route_illuminated_corridor'];
        const totalWaypoints = waypoints.length;
        const nextStep = prev.currentStepIndex + 1;

        if (nextStep >= totalWaypoints) {
          const finalWp = waypoints[totalWaypoints - 1];
          return {
            ...prev,
            currentStepIndex: totalWaypoints - 1,
            progressPercent: 100,
            etaMinutes: 0,
            distanceRemainingKm: 0,
            isSimulatingWalk: false,
            arrivalState: 'JUST_REACHED',
            currentPosition: {
              x: finalWp.x,
              y: finalWp.y,
              lat: finalWp.lat,
              lng: finalWp.lng,
              headingDeg: 0,
            },
          };
        }

        const targetWp = waypoints[nextStep];
        const prevWp = waypoints[prev.currentStepIndex];
        const progressFraction = nextStep / (totalWaypoints - 1);
        const progress = Math.min(95, Math.round(progressFraction * 100));
        const remainingKm = Math.max(0.1, +(prev.totalDistanceKm * (1 - progressFraction)).toFixed(2));
        const eta = Math.max(1, Math.round(prev.totalEstTimeMin * (1 - progressFraction)));

        const angleRad = Math.atan2(targetWp.y - prevWp.y, targetWp.x - prevWp.x);
        const headingDeg = Math.round((angleRad * 180) / Math.PI) + 90;

        let rerouteNotice = prev.rerouteNotice;
        if (prev.activeRouteId === 'route_pine_shortcut' && nextStep === 1 && !rerouteNotice) {
          rerouteNotice = {
            title: prev.travelMode === 'VEHICLE' ? 'Traffic Slowdown Ahead' : 'Safety Advisory Ahead',
            text: prev.travelMode === 'VEHICLE'
              ? 'Bottleneck reported 300m ahead. Cleaner alternative route available.'
              : 'Streetlight out 300m ahead on Pine Alley. Brightly lit Market Blvd available.',
            suggestedRouteId: 'route_illuminated_corridor',
            distanceMeters: 300,
          };
        }

        return {
          ...prev,
          currentStepIndex: nextStep,
          progressPercent: progress,
          distanceRemainingKm: remainingKm,
          etaMinutes: eta,
          currentPosition: {
            x: targetWp.x,
            y: targetWp.y,
            lat: targetWp.lat,
            lng: targetWp.lng,
            headingDeg: headingDeg,
          },
          rerouteNotice,
        };
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [navigation.isNavigating, navigation.isPaused, navigation.isSimulatingWalk, navigation.activeRouteId, navigation.arrivalState]);

  // Real GPS Position Tracking Loop
  useEffect(() => {
    if (!navigation.isNavigating || navigation.isPaused || navigation.isSimulatingWalk) return;
    if (navigation.arrivalState === 'JUST_REACHED' || navigation.arrivalState === 'COMPLETED_SUMMARY') return;

    if (!navigator.geolocation) {
      setNavigation((prev) => ({ ...prev, gpsMode: 'UNAVAILABLE' }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setNavigation((prev) => {
          if (!prev.isNavigating || prev.isPaused || prev.isSimulatingWalk) return prev;

          const destLat = prev.destinationPosition.lat;
          const destLng = prev.destinationPosition.lng;

          // Haversine distance formula in kilometers
          const R = 6371;
          const dLat = ((destLat - lat) * Math.PI) / 180;
          const dLon = ((destLng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((destLat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const remainingKm = +(R * c).toFixed(2);

          const origDist = prev.totalDistanceKm || 1;
          const progressFraction = Math.max(0, Math.min(1, (origDist - remainingKm) / origDist));
          const progress = Math.round(progressFraction * 100);
          const speedKmh = prev.travelMode === 'VEHICLE' ? 30 : 5;
          const eta = Math.max(1, Math.ceil((remainingKm / speedKmh) * 60));

          // Arrival threshold: 50 meters (0.05 km)
          const isArrived = remainingKm <= 0.05;

          return {
            ...prev,
            gpsMode: 'REAL_BROWSER',
            currentPosition: {
              ...prev.currentPosition,
              lat,
              lng,
              headingDeg: pos.coords.heading || prev.currentPosition.headingDeg || 0,
            },
            distanceRemainingKm: isArrived ? 0 : remainingKm,
            progressPercent: isArrived ? 100 : progress,
            etaMinutes: isArrived ? 0 : eta,
            arrivalState: isArrived ? 'JUST_REACHED' : 'NAVIGATING',
          };
        });
      },
      (err) => {
        console.warn('Real GPS location unavailable:', err.message);
        setNavigation((prev) => ({ ...prev, gpsMode: 'UNAVAILABLE' }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [navigation.isNavigating, navigation.isPaused, navigation.isSimulatingWalk, navigation.arrivalState]);

  // Destination reached transition
  useEffect(() => {
    if (navigation.arrivalState === 'JUST_REACHED') {
      const timer = setTimeout(() => {
        setNavigation((prev) => {
          if (prev.arrivalState !== 'JUST_REACHED') return prev;
          const currentRoute = dynamicRouteScores.find((r) => r.route_id === prev.activeRouteId);
          const score = currentRoute?.safety_score || 88;
          const starDetails = getSafetyStarRating(score);

          const summary = {
            totalDistanceKm: prev.totalDistanceKm,
            travelTimeMin: prev.totalEstTimeMin,
            safetyScore: score,
            stars: starDetails.stars,
            starDisplay: starDetails.starDisplay,
            travelMode: prev.travelMode,
            routeName: prev.routeName,
            destinationName: prev.destinationName,
            alertsEncountered: prev.rerouteNotice ? 1 : 0,
            incidentsAvoided: prev.activeRouteId === 'route_illuminated_corridor' ? 1 : 0,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          addTripHistory({
            id: `trip_${Date.now()}`,
            timestamp: Date.now(),
            formattedDate: `Today, ${summary.completedAt}`,
            originName: 'Market & 7th St',
            destinationName: prev.destinationName,
            travelMode: prev.travelMode,
            safetyScore: score,
            stars: starDetails.stars,
            starDisplay: starDetails.starDisplay,
            distanceKm: prev.totalDistanceKm,
            travelTimeMin: prev.totalEstTimeMin,
            alertsEncountered: summary.alertsEncountered,
            incidentsAvoided: summary.incidentsAvoided,
          });

          return {
            ...prev,
            arrivalState: 'COMPLETED_SUMMARY',
            completedSummary: summary,
          };
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [navigation.arrivalState, dynamicRouteScores, addTripHistory]);

  // Start Navigation Action
  const startNavigation = useCallback((
    routeId?: string,
    customRoute?: {
      name?: string;
      distance_km?: number;
      est_time_min?: number;
      coordinates?: Array<[number, number]>;
      destinationName?: string;
    }
  ) => {
    const targetRouteId = routeId || selectedRouteId || 'route_illuminated_corridor';

    let waypoints: Array<{ x: number; y: number; lat: number; lng: number; text: string; note?: string }>;
    let distanceKm = 1.2;
    let estTimeMin = travelMode === 'VEHICLE' ? 4 : 14;
    let routeName = 'Option A: Market Boulevard (Illuminated Path)';
    let destinationName = customRoute?.destinationName || 'Nagpur Central Station';

    if (customRoute?.coordinates && customRoute.coordinates.length >= 2) {
      // Build dynamic waypoints along real road coordinates
      const coords = customRoute.coordinates;
      const totalPoints = coords.length;
      distanceKm = customRoute.distance_km || 1.2;
      estTimeMin = customRoute.est_time_min || (travelMode === 'VEHICLE' ? 4 : 14);
      routeName = customRoute.name || 'Selected Route';

      waypoints = coords.map((c, idx) => {
        const fraction = idx / (totalPoints - 1);
        const xPos = 180 + fraction * 500;
        const yPos = 380 - fraction * 260;
        return {
          x: Math.round(xPos),
          y: Math.round(yPos),
          lat: c[0],
          lng: c[1],
          text: idx === 0
            ? 'Depart starting point'
            : idx === totalPoints - 1
              ? `Arrive at destination: ${destinationName}`
              : `Follow road segment (${Math.round((idx / totalPoints) * distanceKm * 10) / 10} km)`,
          note: idx === 0 ? 'Verified start point' : idx === totalPoints - 1 ? 'Safe arrival area' : undefined,
        };
      });
    } else {
      waypoints = ROUTE_WAYPOINTS[targetRouteId] || ROUTE_WAYPOINTS['route_illuminated_corridor'];
      const routeInfo = dynamicRouteScores.find((r) => r.route_id === targetRouteId) || {
        name: targetRouteId === 'route_pine_shortcut'
          ? travelMode === 'VEHICLE' ? 'Option B: Pine Bypass Shortcut' : 'Option B: Pine Alley (Direct Shortcut)'
          : targetRouteId === 'route_transit_concourse'
            ? travelMode === 'VEHICLE' ? 'Option C: Transit Perimeter' : 'Option C: 4th Street Transit Way'
            : travelMode === 'VEHICLE' ? 'Option A: Market Arterial Expressway' : 'Option A: Market Boulevard (Illuminated)',
        distance_km: targetRouteId === 'route_pine_shortcut' ? 0.9 : targetRouteId === 'route_transit_concourse' ? 1.4 : 1.2,
        est_time_min: targetRouteId === 'route_pine_shortcut' ? (travelMode === 'VEHICLE' ? 4 : 10) : (travelMode === 'VEHICLE' ? 6 : 14),
        safety_score: targetRouteId === 'route_pine_shortcut' ? 64 : 88,
      };
      distanceKm = routeInfo.distance_km;
      estTimeMin = routeInfo.est_time_min;
      routeName = routeInfo.name;
    }

    const speed = travelMode === 'VEHICLE' ? 38.0 : 4.8;
    const firstPoint = waypoints[0];
    const lastPoint = waypoints[waypoints.length - 1];

    setSelectedRouteId(targetRouteId);
    setNavigation({
      isNavigating: true,
      travelMode: travelMode,
      activeRouteId: targetRouteId,
      routeName: routeName,
      destinationName: destinationName,
      currentStepIndex: 0,
      progressPercent: 0,
      currentPosition: {
        x: firstPoint.x,
        y: firstPoint.y,
        lat: firstPoint.lat,
        lng: firstPoint.lng,
        headingDeg: 45,
      },
      originPosition: {
        x: firstPoint.x,
        y: firstPoint.y,
        lat: firstPoint.lat,
        lng: firstPoint.lng,
      },
      destinationPosition: {
        x: lastPoint.x,
        y: lastPoint.y,
        lat: lastPoint.lat,
        lng: lastPoint.lng,
      },
      totalDistanceKm: distanceKm,
      totalEstTimeMin: estTimeMin,
      distanceRemainingKm: distanceKm,
      etaMinutes: estTimeMin,
      speedKmh: speed,
      isPaused: false,
      isSimulatingWalk: false,
      gpsMode: 'REAL_BROWSER',
      steps: waypoints.map((wp, i) => ({
        text: wp.text,
        distanceMeters: i === 0 ? 0 : Math.round((distanceKm / waypoints.length) * 1000),
        point: { x: wp.x, y: wp.y, lat: wp.lat, lng: wp.lng },
        safetyNote: wp.note,
      })),
      arrivalState: 'NAVIGATING',
      completedSummary: null,
      rerouteNotice: null,
    });
  }, [selectedRouteId, dynamicRouteScores, travelMode]);

  // Stop Navigation Action
  const stopNavigation = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      isNavigating: false,
      isSimulatingWalk: false,
      isPaused: false,
      arrivalState: 'IDLE',
      completedSummary: null,
      rerouteNotice: null,
    }));
  }, []);

  // Pause / Resume Navigation
  const togglePauseNavigation = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  }, []);

  const resumeNavigation = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      isPaused: false,
    }));
  }, []);

  // Advance simulation step manually
  const advanceSimulationStep = useCallback(() => {
    setNavigation((prev) => {
      if (!prev.isNavigating) return prev;
      const waypoints = ROUTE_WAYPOINTS[prev.activeRouteId] || ROUTE_WAYPOINTS['route_illuminated_corridor'];
      const totalWaypoints = waypoints.length;
      const nextStep = prev.currentStepIndex + 1;

      if (nextStep >= totalWaypoints) {
        const finalWp = waypoints[totalWaypoints - 1];
        return {
          ...prev,
          currentStepIndex: totalWaypoints - 1,
          progressPercent: 100,
          etaMinutes: 0,
          distanceRemainingKm: 0,
          isSimulatingWalk: false,
          arrivalState: 'JUST_REACHED',
          currentPosition: {
            x: finalWp.x,
            y: finalWp.y,
            lat: finalWp.lat,
            lng: finalWp.lng,
            headingDeg: 0,
          },
        };
      }

      const targetWp = waypoints[nextStep];
      const prevWp = waypoints[prev.currentStepIndex];
      const progressFraction = nextStep / (totalWaypoints - 1);
      const progress = Math.min(95, Math.round(progressFraction * 100));
      const remainingKm = Math.max(0.1, +(prev.totalDistanceKm * (1 - progressFraction)).toFixed(2));
      const eta = Math.max(1, Math.round(prev.totalEstTimeMin * (1 - progressFraction)));

      const angleRad = Math.atan2(targetWp.y - prevWp.y, targetWp.x - prevWp.x);
      const headingDeg = Math.round((angleRad * 180) / Math.PI) + 90;

      let rerouteNotice = prev.rerouteNotice;
      if (prev.activeRouteId === 'route_pine_shortcut' && nextStep === 1 && !rerouteNotice) {
        rerouteNotice = {
          title: prev.travelMode === 'VEHICLE' ? 'Traffic Slowdown Ahead' : 'Safety Advisory Ahead',
          text: prev.travelMode === 'VEHICLE'
            ? 'Bottleneck reported 300m ahead. Alternative route available.'
            : 'Streetlight out 300m ahead on Pine Alley. Illuminated corridor available.',
          suggestedRouteId: 'route_illuminated_corridor',
          distanceMeters: 300,
        };
      }

      return {
        ...prev,
        currentStepIndex: nextStep,
        progressPercent: progress,
        distanceRemainingKm: remainingKm,
        etaMinutes: eta,
        currentPosition: {
          x: targetWp.x,
          y: targetWp.y,
          lat: targetWp.lat,
          lng: targetWp.lng,
          headingDeg: headingDeg,
        },
        rerouteNotice,
      };
    });
  }, []);

  // Toggle real browser GPS
  const toggleRealGps = useCallback(() => {
    if (navigation.gpsMode === 'REAL_BROWSER') {
      setNavigation((prev) => ({ ...prev, gpsMode: 'SIMULATED' }));
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNavigation((prev) => ({
            ...prev,
            gpsMode: 'REAL_BROWSER',
            currentPosition: {
              ...prev.currentPosition,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
          }));
        },
        () => {
          setNavigation((prev) => ({ ...prev, gpsMode: 'SIMULATED' }));
        }
      );
    }
  }, [navigation.gpsMode]);

  // Navigate to Haven Action
  const navigateToHaven = useCallback((haven: SafeHavenCandidate) => {
    const waypoints = [
      { x: navigation.currentPosition.x, y: navigation.currentPosition.y, lat: navigation.currentPosition.lat, lng: navigation.currentPosition.lng, text: 'Depart current location towards Haven Sanctuary' },
      { x: haven.coordinates?.x || 260, y: haven.coordinates?.y || 280, lat: 37.7735, lng: -122.4190, text: `Arrive at ${haven.name}`, note: '24/7 Verified Partner Sanctuary' },
    ];

    const distKm = +(haven.distance_meters / 1000).toFixed(2);
    setSelectedRouteId('haven_emergency_route');
    setNavigation({
      isNavigating: true,
      travelMode: 'WALKING',
      activeRouteId: 'haven_emergency_route',
      routeName: `Direct Haven Route: ${haven.name}`,
      destinationName: haven.name,
      currentStepIndex: 0,
      progressPercent: 0,
      currentPosition: navigation.currentPosition,
      originPosition: navigation.currentPosition,
      destinationPosition: {
        x: haven.coordinates?.x || 260,
        y: haven.coordinates?.y || 280,
        lat: 37.7735,
        lng: -122.4190,
      },
      totalDistanceKm: distKm,
      totalEstTimeMin: haven.walk_time_minutes || 2,
      etaMinutes: haven.walk_time_minutes || 2,
      distanceRemainingKm: distKm,
      speedKmh: 5.2,
      isPaused: false,
      isSimulatingWalk: true,
      gpsMode: 'SIMULATED',
      steps: waypoints.map((wp) => ({
        text: wp.text,
        distanceMeters: haven.distance_meters,
        point: { x: wp.x, y: wp.y, lat: wp.lat, lng: wp.lng },
        safetyNote: wp.note,
      })),
      arrivalState: 'NAVIGATING',
      completedSummary: null,
      rerouteNotice: null,
    });
  }, [navigation.currentPosition]);

  // Apply suggested reroute
  const applySuggestedReroute = useCallback(() => {
    if (navigation.rerouteNotice?.suggestedRouteId) {
      startNavigation(navigation.rerouteNotice.suggestedRouteId);
    }
  }, [navigation.rerouteNotice, startNavigation]);

  const continueCurrentRoute = useCallback(() => {
    setNavigation((prev) => ({ ...prev, rerouteNotice: null }));
  }, []);

  const dismissRerouteNotice = useCallback(() => {
    setNavigation((prev) => ({ ...prev, rerouteNotice: null }));
  }, []);

  const closeCompletionSummary = useCallback(() => {
    stopNavigation();
  }, [stopNavigation]);

  // Incident Actions
  const addIncident = useCallback((newReport: any) => {
    setIncidents((prev) => [newReport, ...prev]);
    setActiveNotification({
      alert_title: `Recent Report: ${String(newReport.category).replace('_', ' ')}`,
      notification_text: newReport.description,
      urgency: newReport.severity === 'HIGH' || newReport.severity === 'CRITICAL' || newReport.severity === 'EMERGENCY' ? 'CRITICAL' : 'ADVISORY',
      distance_meters: 220,
      timestamp_formatted: 'Just now',
      action_prompt: 'Got it',
    });
    refreshSafetyPulse();
  }, [refreshSafetyPulse]);

  const corroborateIncident = useCallback(async (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
            ...inc,
            corroborations: inc.corroborations + 1,
            confidence: Math.min(1.0, +(inc.confidence + 0.08).toFixed(2)),
          }
          : inc
      )
    );
    try {
      await fetch('/api/safety/incidents/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id, userId: `u_${Date.now()}`, voteType: 'CONFIRM' }),
      });
    } catch (e) {
      // Offline fallback
    }
    refreshSafetyPulse();
  }, [refreshSafetyPulse]);

  const disputeIncident = useCallback(async (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
            ...inc,
            disputes: (inc.disputes || 0) + 1,
            confidence: Math.max(0.1, +(inc.confidence - 0.15).toFixed(2)),
          }
          : inc
      )
    );
    try {
      await fetch('/api/safety/incidents/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id, userId: `u_${Date.now()}`, voteType: 'DISPUTE' }),
      });
    } catch (e) {
      // Offline fallback
    }
    refreshSafetyPulse();
  }, [refreshSafetyPulse]);

  const resolveIncident = useCallback(async (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
            ...inc,
            isResolved: true,
            resolvedVotes: (inc.resolvedVotes || 0) + 1,
            confidence: Math.max(0.1, +(inc.confidence * 0.4).toFixed(2)),
          }
          : inc
      )
    );
    try {
      await fetch('/api/safety/incidents/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id, userId: `u_${Date.now()}`, voteType: 'RESOLVED' }),
      });
    } catch (e) {
      // Offline fallback
    }
    refreshSafetyPulse();
  }, [refreshSafetyPulse]);

  // Followed Mode Handlers
  const openFollowedMode = useCallback(async () => {
    setIsFollowedModeOpen(true);
    setIsFollowedLoading(true);
    try {
      const res = await fetchFollowedMode({
        ...AI_FUNCTION_PRESETS.followedMode,
        userLocation: {
          lat: navigation.currentPosition.lat,
          lng: navigation.currentPosition.lng,
          name: 'Current Location',
        },
        timeOfDay: timeOfDay,
        nearbyHavens: safeHavens,
      });
      setFollowedData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFollowedLoading(false);
    }
  }, [navigation.currentPosition, timeOfDay, safeHavens]);

  const closeFollowedMode = useCallback(() => {
    setIsFollowedModeOpen(false);
  }, []);

  const openReportModal = useCallback(() => {
    setIsReportModalOpen(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setIsReportModalOpen(false);
  }, []);

  const dismissNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  // Demo Simulation Scenarios
  const triggerSimulationScenario = useCallback((scenario: 'incident_ahead' | 'midnight_rush' | 'all_clear') => {
    if (scenario === 'incident_ahead') {
      const newInc: CommunityIncident = {
        id: 'inc_sim_' + Date.now(),
        category: 'ROAD_BLOCKAGE',
        title: 'Emergency Utility Repair on Main Crosswalk',
        description: 'Road barrier blocking sidewalk; pedestrians directed to lit bypass.',
        severity: 'MEDIUM',
        reportedAt: new Date().toISOString(),
        minutesAgo: 1,
        confidence: 0.95,
        corroborations: 3,
        hasPhoto: true,
        location: { lat: 37.7758, lng: -122.4162, name: 'Market & 5th Crossing', x: 420, y: 220 },
        reporterToken: 'anon_sim_user',
        isResolved: false,
        resolvedVotes: 0,
      };
      addIncident(newInc);
    } else if (scenario === 'midnight_rush') {
      setTimeOfDay('01:30');
      setIsSimulatingTime(true);
      refreshSafetyPulse();
    } else if (scenario === 'all_clear') {
      setIncidents((prev) => prev.map((i) => ({ ...i, isResolved: true })));
      refreshSafetyPulse();
    }
  }, [addIncident, refreshSafetyPulse]);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,

        pathname,
        navigate,

        currentUser,
        setCurrentUser,
        isAuthLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModal,
        closeAuthModal,

        originLocation,
        setOriginLocation,
        destinationLocation,
        setDestinationLocation,
        calculatedRoutes,
        setCalculatedRoutes,
        isCalculatingRoutes,
        routeError,
        calculateRoutes,

        activeTab,
        setActiveTab,
        tabHistory,
        navigateBack,
        canNavigateBack,

        emergencyContact,
        setEmergencyContact,

        travelMode,
        setTravelMode,
        routePriority,
        setRoutePriority,

        navigation,
        selectedRouteId,
        setSelectedRouteId,
        startNavigation,
        stopNavigation,
        togglePauseNavigation,
        resumeNavigation,
        advanceSimulationStep,
        toggleRealGps,
        navigateToHaven,
        applySuggestedReroute,
        dismissRerouteNotice,
        continueCurrentRoute,
        closeCompletionSummary,

        tripHistory,
        clearTripHistory,

        timeOfDay,
        setTimeOfDay,
        isSimulatingTime,
        setIsSimulatingTime,
        simulationSpeed,
        setSimulationSpeed,
        triggerSimulationScenario,

        incidents,
        addIncident,
        corroborateIncident,
        disputeIncident,
        resolveIncident,

        safeHavens,
        havenRankingData,
        isHavenRankingLoading,
        refreshHavenRanking,

        routeScores: dynamicRouteScores,
        routeScoreData,
        isRouteScoringLoading,
        refreshRouteScores,

        pulseData,
        isPulseLoading,
        refreshSafetyPulse,

        isFollowedModeOpen,
        openFollowedMode,
        closeFollowedMode,
        followedData,
        isFollowedLoading,

        isReportModalOpen,
        openReportModal,
        closeReportModal,

        activeNotification,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
