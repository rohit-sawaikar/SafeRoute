/**
 * SafeRoute Data Models & API Payload Types
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type IncidentType =
  | 'accident'
  | 'harassment'
  | 'suspicious_activity'
  | 'road_blockage'
  | 'streetlight_failure'
  | 'fire'
  | 'medical_emergency'
  | 'unsafe_infrastructure';

export type IncidentStatus = 'unverified' | 'corroborated' | 'expired';

export type SafetyLevel = 'green' | 'yellow' | 'red';

export type TripStatus = 'active' | 'completed' | 'deviated' | 'sos_triggered';

export type SOSMode = 'standard_sos' | 'being_followed' | 'medical' | 'accident';

export type SOSStatus = 'active' | 'resolved' | 'false_alarm';

export type HavenCategory = 'pharmacy' | 'convenience_store' | 'gas_station' | 'cafe' | 'police_station';

// 1. USERS
export interface UserProfile {
  uid: string;
  phone?: string;
  email?: string;
  displayName: string;
  homeCountryCode: string; // e.g. "IN", "US", "UK", "DE"
  createdAt: number; // epoch ms
  privacySettings?: {
    discreetMode?: boolean;
    anonymousReportingDefault?: boolean;
  };
}

// 2. TRUSTED CONTACTS
export interface TrustedContact {
  id: string;
  userId: string;
  contactUserId?: string;
  contactPhone?: string;
  relationshipLabel: string; // e.g., "Parent", "Partner", "Friend"
  permissionLevel: 'view_location' | 'full_sos_alerts';
  status: 'pending' | 'accepted';
  createdAt: number;
}

// 3. INCIDENT REPORTS
export interface IncidentReport {
  id: string;
  reporterId: string;
  type: IncidentType;
  geopoint: GeoPoint;
  geohash: string;
  description?: string;
  timestamp: number;
  corroborationCount: number;
  confidenceScore: number; // 0.0 to 1.0
  status: IncidentStatus;
  sensitiveCategory?: boolean; // harassment / stalking boolean flag
}

// 4. SAFETY ZONES
export interface SafetyZone {
  geohash: string;
  currentSafetyLevel: SafetyLevel;
  lastComputedAt: number;
  contributingFactors: {
    activeIncidentCount: number;
    avgLightingScore: number; // 0.0 (pitch black) to 1.0 (well lit)
    pedestrianActivityLevel: 'low' | 'moderate' | 'high';
    timeOfDay: string; // HH:mm
    timeOfDayRiskFactor: number; // multiplier e.g. 1.2
  };
}

// 5. ACTIVE TRIPS
export interface ActiveTrip {
  id: string;
  userId: string;
  routeCoordinates: GeoPoint[];
  startTime: number;
  estimatedArrival: number;
  status: TripStatus;
  sharedWithContactIds: string[];
  currentLocation?: GeoPoint;
  lastLocationUpdate?: number;
  deviationAlertTriggered?: boolean;
}

// 6. SOS EVENTS
export interface SOSEvent {
  id: string;
  userId: string;
  triggeredAt: number;
  mode: SOSMode;
  lastKnownLocation: GeoPoint;
  status: SOSStatus;
  notifiedContactIds: string[];
  notifiedAt: number;
  silentMode: boolean;
  audioRecordingRequested: boolean;
  resolvedAt?: number;
  outcome?: string;
}

// 7. SAFE HAVENS
export interface SafeHaven {
  id: string;
  name: string;
  address: string;
  geopoint: GeoPoint;
  geohash: string;
  category: HavenCategory;
  verifiedStatus: boolean;
  hoursOpen: string; // e.g. "24/7" or "06:00 - 23:00"
  phone?: string;
  distanceMeters?: number;
}

// EMERGENCY NUMBERS TABLE RESULT
export interface EmergencyNumbersResult {
  countryCode: string;
  countryName: string;
  police: string;
  ambulance: string;
  fire: string;
  womenHelpline: string;
  domesticViolenceHelpline: string;
  generalEmergency: string;
}

// ROUTE COMPARISON RESULT
export interface RouteSafetySignal {
  routeId: string;
  name: string;
  travelTimeMinutes: number;
  distanceKm: number;
  safetyScore: number; // 0 to 100 (higher is safer)
  safetyLevel: SafetyLevel;
  lightingPercentage: number;
  activeIncidentsCount: number;
  signals: string[];
  recommendedReason?: string;
}
