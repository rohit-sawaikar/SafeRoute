/**
 * SafeRoute Frontend Client SDK & Firestore Real-Time Listener Helper
 *
 * Provides real-time subscriptions and HTTP API calls to SafeRoute backend functions.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import {
  GeoPoint,
  IncidentReport,
  ActiveTrip,
  SOSEvent,
  SafeHaven,
  EmergencyNumbersResult,
  RouteSafetySignal,
} from '../../functions/src/types';

// Pull Firebase config from standard env variables
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || ""
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

const BACKEND_BASE_URL =
  (import.meta as any).env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * ----------------------------------------------------
 * REAL-TIME LISTENERS (Firestore Subscriptions)
 * ----------------------------------------------------
 */

/**
 * 1. Subscribe to Live Active Trip (used by Trusted Contacts & Navigating Users)
 */
export function subscribeToActiveTrip(
  tripId: string,
  onUpdate: (trip: ActiveTrip) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const tripRef = doc(db, 'activeTrips', tripId);
  return onSnapshot(
    tripRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as ActiveTrip);
      }
    },
    onError
  );
}

/**
 * 2. Subscribe to Nearby Incident Alerts (geohash bucket query for active navigation)
 */
export function subscribeToNearbyIncidents(
  geohashPrefix: string,
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const reportsRef = collection(db, 'incidentReports');
  const q = query(
    reportsRef,
    where('geohash', '>=', geohashPrefix),
    where('geohash', '<=', geohashPrefix + '\uf8ff'),
    where('status', 'in', ['unverified', 'corroborated'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports: IncidentReport[] = [];
      snapshot.forEach((d) => reports.push({ id: d.id, ...d.data() } as IncidentReport));
      onUpdate(reports);
    },
    onError
  );
}

/**
 * Real-time Subscription to ALL Community Incident Reports in Firestore
 */
export function subscribeToAllIncidents(
  onUpdate: (reports: any[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const reportsRef = collection(db, 'incidentReports');
  return onSnapshot(
    reportsRef,
    (snapshot) => {
      const reports: any[] = [];
      snapshot.forEach((d) => {
        reports.push({ id: d.id, ...d.data() });
      });
      onUpdate(reports);
    },
    (err) => {
      console.warn('Firestore incident reports subscription notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Submit / Persist a new Incident Report directly to Firestore
 */
export async function submitIncidentToFirestore(incidentData: any): Promise<void> {
  const docId = incidentData.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, 'incidentReports', docId);
  const payload = {
    ...incidentData,
    id: docId,
    source: 'community',
    updatedAt: Date.now(),
  };
  await setDoc(docRef, payload);
}

/**
 * Update an existing Incident Report in Firestore (e.g. Admin Moderation / Resolution)
 */
export async function updateIncidentInFirestore(incidentId: string, updates: Record<string, any>): Promise<void> {
  const docRef = doc(db, 'incidentReports', incidentId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Delete an Incident Report from Firestore
 */
export async function deleteIncidentFromFirestore(incidentId: string): Promise<void> {
  const docRef = doc(db, 'incidentReports', incidentId);
  await deleteDoc(docRef);
}

/**
 * 3. Subscribe to SOS Status Updates
 */
export function subscribeToSosStatus(
  sosEventId: string,
  onUpdate: (sos: SOSEvent) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const sosRef = doc(db, 'sosEvents', sosEventId);
  return onSnapshot(
    sosRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as SOSEvent);
      }
    },
    onError
  );
}

/**
 * ----------------------------------------------------
 * API CALLABLE FUNCTIONS / HTTP REQUEST HELPERS
 * ----------------------------------------------------
 */

async function safeParseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
  }
}

async function postApi<T>(endpoint: string, body: any): Promise<T> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/saferoute${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await safeParseJson<{ error?: string }>(res).catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return safeParseJson<T>(res);
}

async function getApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BACKEND_BASE_URL}/api/saferoute${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await safeParseJson<{ error?: string }>(res).catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return safeParseJson<T>(res);
}

export const safeRouteApi = {
  // 1. Submit Incident Report
  submitReport: (params: {
    type: string;
    geopoint: GeoPoint;
    description?: string;
    sensitiveCategory?: boolean;
    reporterId?: string;
  }) => postApi<{ success: boolean; report: IncidentReport; message: string }>('/submit-report', params),

  // 2. Get Area Safety Status
  getAreaSafetyStatus: (geopoint: GeoPoint, radius: number = 1000) =>
    postApi<{ success: boolean; pulse: any }>('/area-status', { geopoint, radius }),

  // 3. Compare Route Safety
  getRouteSafetyComparison: (routes: Array<{ id: string; name: string; waypoints: GeoPoint[]; travelTimeMinutes: number; distanceKm: number }>) =>
    postApi<{ success: boolean; count: number; routes: RouteSafetySignal[] }>('/route-comparison', { routes }),

  // 4. Trip Lifecycle
  startTrip: (params: { userId: string; routeCoordinates: GeoPoint[]; sharedWithContactIds?: string[]; estimatedArrival?: number }) =>
    postApi<{ success: boolean; tripId: string; trip: ActiveTrip }>('/start-trip', params),

  updateTripLocation: (tripId: string, geopoint: GeoPoint) =>
    postApi<{ success: boolean; tripId: string; status: string; deviation: any; hazardAlert: any }>('/update-trip-location', { tripId, geopoint }),

  endTrip: (tripId: string) => postApi<{ success: boolean; tripId: string; status: string }>('/end-trip', { tripId }),

  // 5. Trigger Standard SOS
  triggerSOS: (userId: string, geopoint: GeoPoint, mode: string = 'standard_sos') =>
    postApi<{ success: boolean; sosEventId: string; sos: SOSEvent; emergencyNumberToDial: string; liveTrackingUrl: string }>('/trigger-sos', { userId, mode, geopoint }),

  // 6. Trigger Being Followed (Silent SOS)
  triggerBeingFollowed: (userId: string, geopoint: GeoPoint) =>
    postApi<{ success: boolean; sosEventId: string; silentMode: boolean; audioRecordingRequested: boolean; top3SafeHavens: SafeHaven[] }>('/being-followed', { userId, geopoint }),

  // 7. Resolve SOS
  resolveSOS: (sosEventId: string, outcome?: string) =>
    postApi<{ success: boolean; sosEventId: string; status: string }>('/resolve-sos', { sosEventId, outcome }),

  // 8. Emergency Numbers Lookup
  getEmergencyNumbers: (countryCode: string = 'IN') =>
    getApi<{ success: boolean; countryCode: string; emergencyNumbers: EmergencyNumbersResult }>('/emergency-numbers', { countryCode }),

  // 9. Safe Havens Nearby
  getSafeHavensNearby: (geopoint: GeoPoint, radius: number = 3000) =>
    getApi<{ success: boolean; count: number; safeHavens: SafeHaven[] }>('/safe-havens', { lat: String(geopoint.latitude), lng: String(geopoint.longitude), radius: String(radius) }),

  // 10. Manage Trusted Contacts
  manageTrustedContacts: (params: { action: 'list' | 'add' | 'accept' | 'remove'; userId: string; contactPhone?: string; relationshipLabel?: string; contactId?: string }) =>
    postApi<{ success: boolean; contacts?: any[]; contact?: any }>('/trusted-contacts', params),
};
