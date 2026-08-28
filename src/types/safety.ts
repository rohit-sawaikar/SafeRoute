/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Core Safety & Travel Mode Statuses
export type TravelMode = 'VEHICLE' | 'WALKING';
export type RoutePriority = 'SAFETY' | 'BALANCED' | 'TIME';
export type SafetyStatus = 'NORMAL' | 'CAUTION' | 'HIGH_ALERT';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VerificationLevel = 'UNVERIFIED' | 'COMMUNITY_CORROBORATED' | 'OFFICIALLY_CONFIRMED';
export type SafeHavenType = 'POLICE_STATION' | 'FIRE_STATION' | 'HOSPITAL' | 'PHARMACY_24_7' | 'TRANSIT_HUB' | 'OPEN_COMMERCIAL';

export type IncidentCategory =
  | 'ACCIDENT'
  | 'CONSTRUCTION'
  | 'ROAD_BLOCKAGE'
  | 'HARASSMENT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'FIRE'
  | 'MEDICAL_EMERGENCY'
  | 'STREETLIGHT'
  | 'UNSAFE_INFRASTRUCTURE'
  | 'OTHER';

export type IncidentStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'PUBLISHED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'FLAGGED';

export type UserSubmittedSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

// 5-Star Safety Rating Mapping
export interface SafetyRatingDetails {
  stars: 1 | 2 | 3 | 4 | 5;
  label: 'Very Safe' | 'Safer' | 'Moderate' | 'Higher Risk' | 'High Risk';
  starDisplay: '★★★★★' | '★★★★☆' | '★★★☆☆' | '★★☆☆☆' | '★☆☆☆☆';
  color: string;
  badgeClass: string;
}

export function getSafetyStarRating(score: number): SafetyRatingDetails {
  if (score >= 90) {
    return {
      stars: 5,
      label: 'Very Safe',
      starDisplay: '★★★★★',
      color: '#10b981', // emerald-500
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
    };
  }
  if (score >= 75) {
    return {
      stars: 4,
      label: 'Safer',
      starDisplay: '★★★★☆',
      color: '#34d399', // emerald-400
      badgeClass: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    };
  }
  if (score >= 60) {
    return {
      stars: 3,
      label: 'Moderate',
      starDisplay: '★★★☆☆',
      color: '#38bdf8', // sky-400 / cyan
      badgeClass: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
    };
  }
  if (score >= 40) {
    return {
      stars: 2,
      label: 'Higher Risk',
      starDisplay: '★★☆☆☆',
      color: '#f59e0b', // amber-500
      badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    };
  }
  return {
    stars: 1,
    label: 'High Risk',
    starDisplay: '★☆☆☆☆',
    color: '#f43f5e', // rose-500
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
  };
}

export interface LocationCoordinate {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

// REAL INCIDENT REPORT DATA MODEL
export interface IncidentReport {
  id: string;
  clusterId?: string;
  userId: string;
  userDisplayName?: string;
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  severitySubmitted: UserSubmittedSeverity;
  evaluatedSeverity: UserSubmittedSeverity;
  photos: string[]; // Base64 strings or URLs
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  status: IncidentStatus;
  verificationStatus: 'UNVERIFIED' | 'COMMUNITY_VERIFIED' | 'AI_VERIFIED' | 'ADMIN_APPROVED';
  confidenceScore: number; // 0.0 to 1.0 (0% to 100%)
  sourceCount: number;
  supportCount: number;
  contradictionCount: number;
  voterUserIds: string[];
  aiAnalysis?: {
    relevanceScore: number;
    detectedCategory: IncidentCategory;
    photoConsistent: boolean;
    flaggedSpam: boolean;
    reasoning: string;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  incidentId: string;
  action: string;
  actor: string; // 'SYSTEM_AI' | 'COMMUNITY_USER' | 'ADMIN'
  details: string;
}

export interface RouteCaution {
  incidentId: string;
  category: IncidentCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  distanceAheadMeters: number;
  distanceAlongRouteKm: number;
  confidenceScore: number;
  isHighImpact: boolean;
  recommendedAction?: string;
}

// TRIP SAFETY HISTORY
export interface TripSafetyHistory {
  id: string;
  timestamp: number;
  formattedDate: string;
  originName: string;
  destinationName: string;
  travelMode: TravelMode;
  safetyScore: number;
  stars: 1 | 2 | 3 | 4 | 5;
  starDisplay: string;
  distanceKm: number;
  travelTimeMin: number;
  alertsEncountered: number;
  incidentsAvoided: number;
}

// 1. SAFETY PULSE
export interface SafetyPulseRequest {
  incidentReports: Array<{
    id: string;
    category: string;
    description: string;
    timestamp: string; // ISO string
    confidence: number;
    distanceMeters: number;
  }>;
  pedestrianActivitySignal: 'LOW' | 'MODERATE' | 'HIGH' | 'CROWDED';
  lightingSignal: 'POOR' | 'PARTIAL' | 'WELL_LIT' | 'BRIGHT_COMMERCIAL';
  nearbyEmergencyServices: Array<{
    name: string;
    type: string;
    distanceMeters: number;
    responseTimeEstMin: number;
  }>;
  timeOfDay: string; // e.g. "23:45"
  historicalPatternContext?: string;
  locationName: string;
}

export interface SafetyPulseOutput {
  safety_status: SafetyStatus;
  confidence: number; // 0 to 1
  recent_signals: string[];
  explanation: string;
  recommended_action: string;
  timestamp: string;
}

// 2. INCIDENT CLASSIFICATION
export interface IncidentClassificationRequest {
  reportText: string;
  photoDescription?: string;
  photoBase64?: string;
  timestamp: string;
  locationContext?: string;
}

export interface IncidentClassificationOutput {
  category: IncidentCategory;
  severity: SeverityLevel;
  confidence: number;
  evidence: string[];
  explanation: string;
  is_urgent: boolean;
  actionable_guidance: string;
}

// 3. DUPLICATE DETECTION
export interface DuplicateDetectionRequest {
  newReport: {
    id: string;
    category: string;
    description: string;
    location: LocationCoordinate;
    timestamp: string;
    photoHash?: string;
  };
  existingReports: Array<{
    id: string;
    category: string;
    description: string;
    location: LocationCoordinate;
    timestamp: string;
    photoHash?: string;
  }>;
}

export interface DuplicateDetectionOutput {
  duplicate_probability: number; // 0 to 1
  matching_report_ids: string[];
  match_reason: string;
  merge_recommendation: 'MERGE' | 'SEPARATE' | 'CORROBORATE';
}

// 4. REPORT SEVERITY DECAY
export interface SeverityDecayRequest {
  reportId: string;
  category: string;
  initialSeverity: SeverityLevel;
  initialConfidence: number;
  reportedAt: string; // ISO
  currentTime: string; // ISO
  corroborationCount: number;
  isInfrastructureFixedReported?: boolean;
}

export interface SeverityDecayOutput {
  report_id: string;
  current_confidence: number;
  initial_confidence: number;
  decay_factor: number; // 0 to 1 multiplier applied
  time_elapsed_minutes: number;
  reason: string;
  is_active: boolean;
}

// 5. SAFER ROUTE SCORING & MODE-SPECIFIC EVALUATION
export interface RouteOptionInput {
  route_id: string;
  name: string;
  distance_km: number;
  est_time_min: number;
  path_description: string;
  lighting_level: 'POOR' | 'MODERATE' | 'WELL_LIT';
  pedestrian_density: 'LOW' | 'MODERATE' | 'HIGH';
  nearby_incidents: Array<{
    id: string;
    category: string;
    severity: SeverityLevel;
    distance_from_path_meters: number;
    reported_minutes_ago: number;
  }>;
  emergency_services_proximity_min: number;
}

export interface RouteScoreDetails {
  route_id: string;
  name: string;
  safety_score: number; // 0 to 100
  star_rating: SafetyRatingDetails;
  data_confidence: 'HIGH' | 'MODERATE' | 'PRELIMINARY';
  travel_mode: TravelMode;
  distance_km: number;
  est_time_min: number;
  lighting_rating: string;
  activity_level: string;
  emergency_proximity_min: number;
  key_tradeoffs: string[];
  cautionary_notes: string[];
  safety_factors_explained: string[];
  score_breakdown: {
    // Walking factors
    lighting?: number; // 0-25
    pedestrian_infrastructure?: number; // 0-25
    isolation_avoidance?: number; // 0-20
    crossing_safety?: number; // 0-10
    // Vehicle factors
    accident_avoidance?: number; // 0-30
    traffic_flow_rating?: number; // 0-25
    hazard_clearance?: number; // 0-25
    // Universal
    emergency_access: number; // 0-20
  };
}

export interface SaferRouteScoringOutput {
  travel_mode: TravelMode;
  routes: RouteScoreDetails[];
  safest_route_id: string;
  fastest_route_id: string;
  balanced_route_id: string;
  tradeoff_summary: {
    time_saved_minutes: number;
    safety_score_diff: number;
    explanation: string;
  };
  recommendation_rationale: string;
  disclaimer: string;
}

// 6. FOLLOWED MODE
export interface FollowedModeRequest {
  userLocation: LocationCoordinate;
  timeOfDay: string;
  batteryLevel?: number;
  speedKmh?: number;
  movementMode?: 'WALKING' | 'STATIONARY' | 'JOGGING';
  nearbyHavens: Array<{
    id: string;
    name: string;
    type: SafeHavenType;
    distance_meters: number;
    is_open?: boolean;
    is_open_now?: boolean;
    address: string;
  }>;
  trustedContactsCount: number;
}

export interface FollowedModeOutput {
  immediate_steps: string[];
  top_safe_haven: {
    id: string;
    name: string;
    type: string;
    distance_meters: number;
    walk_time_sec: number;
    route_instruction: string;
    phone?: string;
  };
  emergency_dispatch: {
    local_number: string;
    prepared_sms_payload: string;
    gps_coordinates_string: string;
  };
  trusted_contact_alert: {
    sms_text: string;
    live_tracking_link: string;
  };
  evidence_recording_guidance: {
    audio_auto_start: boolean;
    discreet_mode_tip: string;
  };
  tactical_avoidance_rules: string[];
}

// 7. SAFE HAVEN RANKING
export interface SafeHavenCandidate {
  id: string;
  name: string;
  type: SafeHavenType;
  distance_meters: number;
  is_open_now: boolean;
  is_verified_partner: boolean;
  has_security_staff: boolean;
  has_well_lit_entrance: boolean;
  walk_time_minutes: number;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: { x: number; y: number; lat: number; lng: number };
}

export interface SafeHavenRankingOutput {
  ranked_havens: Array<{
    id: string;
    name: string;
    type: string;
    distance_meters: number;
    is_open: boolean;
    verification_level: 'POLICE_VERIFIED' | 'COMMUNITY_PARTNER' | 'PUBLIC_FACILITY';
    accessibility_score: number; // 0-100
    walk_time_min: number;
    navigation_tip: string;
    rank_score: number;
  }>;
  top_recommendation_reason: string;
}

// 8. CROSS-SIGNAL RISK
export interface CrossSignalRiskRequest {
  activeSignals: Array<{
    type: 'INCIDENT' | 'WEATHER' | 'LIGHTING' | 'ROAD_CLOSURE' | 'TRANSIT_DELAY' | 'CROWD_DENSITY';
    description: string;
    severity: SeverityLevel;
    timestamp: string;
  }>;
  areaType: 'COMMERCIAL' | 'RESIDENTIAL' | 'TRANSIT_CORRIDOR' | 'PARK_ADJACENT';
  timeOfDay: string;
}

export interface CrossSignalRiskOutput {
  synergy_detected: boolean;
  risk_level: 'LOW' | 'ELEVATED' | 'HEIGHTENED';
  compound_factors: string[];
  emerging_risk_description: string;
  preventative_recommendations: string[];
}

// 9. AREA SUMMARY
export interface AreaSummaryRequest {
  areaName: string;
  currentObservedIncidents: string[];
  activeLightingSensors: string;
  pedestrianTrafficRating: string;
  weatherCondition: string;
  timeOfDay: string;
}

export interface AreaSummaryOutput {
  observed_facts: string[];
  temporal_context: string;
  predictive_indicators: string[];
  factual_summary: string;
  advisory: string;
}

// 10. COMMUNITY REPORT VERIFICATION
export interface CommunityReportVerificationRequest {
  reportId: string;
  anonymousReporterToken: string;
  reporterKarmaScore: number;
  independentConfirmationsCount: number;
  hasPhotoProof: boolean;
  timeSinceReportMinutes: number;
  proximityVerifiedByGps: boolean;
  reportCategory: string;
}

export interface CommunityReportVerificationOutput {
  report_id: string;
  verification_score: number; // 0 to 100
  verification_level: VerificationLevel;
  corroboration_count: number;
  evidence_quality: 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED_SATELLITE_OR_PHOTO';
  trust_metrics: {
    timestamp_freshness: number;
    proximity_accuracy: number;
    photographic_evidence: boolean;
    independent_witness_count: number;
  };
  reasoning: string;
  privacy_guarantee: string;
}

// 11. SAFETY NOTIFICATION
export interface SafetyNotificationRequest {
  incidentCategory: string;
  distanceMeters: number;
  minutesAgo: number;
  userCurrentRoute: string;
  suggestedDetourAvailable: boolean;
}

export interface SafetyNotificationOutput {
  alert_title: string;
  notification_text: string;
  urgency: 'INFO' | 'ADVISORY' | 'CRITICAL';
  distance_meters: number;
  timestamp_formatted: string;
  action_prompt: string;
}

// NAVIGATION & REAL-TIME STATE
export interface NavigationStep {
  text: string;
  distanceMeters: number;
  point: { x: number; y: number; lat: number; lng: number };
  safetyNote?: string;
}

export type NavigationArrivalState = 'IDLE' | 'NAVIGATING' | 'JUST_REACHED' | 'COMPLETED_SUMMARY';

export interface RouteCompletionSummary {
  totalDistanceKm: number;
  travelTimeMin: number;
  safetyScore: number;
  stars: 1 | 2 | 3 | 4 | 5;
  starDisplay: string;
  travelMode: TravelMode;
  routeName: string;
  destinationName: string;
  alertsEncountered: number;
  incidentsAvoided: number;
  completedAt: string;
}

export interface NavigationState {
  isNavigating: boolean;
  travelMode: TravelMode;
  activeRouteId: string;
  routeName: string;
  destinationName: string;
  currentStepIndex: number;
  progressPercent: number;
  currentPosition: { x: number; y: number; lat: number; lng: number; headingDeg: number };
  originPosition: { x: number; y: number; lat: number; lng: number };
  destinationPosition: { x: number; y: number; lat: number; lng: number };
  totalDistanceKm: number;
  totalEstTimeMin: number;
  distanceRemainingKm: number;
  etaMinutes: number;
  speedKmh: number;
  isPaused: boolean;
  isSimulatingWalk: boolean;
  gpsMode: 'SIMULATED' | 'REAL_BROWSER';
  steps: NavigationStep[];
  arrivalState: NavigationArrivalState;
  completedSummary: RouteCompletionSummary | null;
  rerouteNotice?: { title: string; text: string; suggestedRouteId: string; distanceMeters: number } | null;
  activeRouteCautions?: RouteCaution[];
}

export interface CommunityIncident {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  severity: SeverityLevel;
  reportedAt: string;
  minutesAgo: number;
  confidence: number;
  corroborations: number;
  disputes?: number;
  hasPhoto: boolean;
  photoUrl?: string;
  location: { lat: number; lng: number; name: string; x: number; y: number };
  reporterToken: string;
  isResolved?: boolean;
  resolvedVotes?: number;
  status?: IncidentStatus;
}

export interface UserAuthProfile {
  uid: string;
  displayName: string;
  phone?: string;
  email?: string;
  homeCountryCode: string;
  isDiscreetMode: boolean;
  trustedContactPhone?: string;
  createdAt: number;
  admin?: boolean;
}

