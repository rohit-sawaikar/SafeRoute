/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SafeHavenCandidate, RouteOptionInput } from '../types/safety';

export interface UrbanZone {
  id: string;
  name: string;
  lightingIndex: 'WELL_LIT' | 'PARTIAL' | 'POOR' | 'BRIGHT_COMMERCIAL';
  pedestrianDensity: 'HIGH' | 'MODERATE' | 'LOW' | 'CROWDED';
  activeIncidentsCount: number;
  center: { x: number; y: number; lat: number; lng: number };
}

export const MOCK_ZONES: UrbanZone[] = [
  {
    id: 'zone_metro',
    name: 'Metro Center Plaza',
    lightingIndex: 'BRIGHT_COMMERCIAL',
    pedestrianDensity: 'HIGH',
    activeIncidentsCount: 0,
    center: { x: 420, y: 220, lat: 37.7749, lng: -122.4194 },
  },
  {
    id: 'zone_broadway',
    name: 'North Broadway Corridor',
    lightingIndex: 'WELL_LIT',
    pedestrianDensity: 'MODERATE',
    activeIncidentsCount: 1,
    center: { x: 260, y: 150, lat: 37.7785, lng: -122.4225 },
  },
  {
    id: 'zone_alleyway',
    name: 'Pine Alley Bypass',
    lightingIndex: 'POOR',
    pedestrianDensity: 'LOW',
    activeIncidentsCount: 1,
    center: { x: 380, y: 340, lat: 37.7712, lng: -122.4162 },
  },
  {
    id: 'zone_transit',
    name: 'South Intermodal Terminal',
    lightingIndex: 'WELL_LIT',
    pedestrianDensity: 'HIGH',
    activeIncidentsCount: 0,
    center: { x: 550, y: 390, lat: 37.7698, lng: -122.4121 },
  },
];

export const MOCK_SAFE_HAVENS: SafeHavenCandidate[] = [
  {
    id: 'haven_1',
    name: 'Walgreens 24/7 Pharmacy & First Aid',
    type: 'PHARMACY_24_7',
    distance_meters: 140,
    is_open_now: true,
    is_verified_partner: true,
    has_security_staff: true,
    has_well_lit_entrance: true,
    walk_time_minutes: 2,
    address: '450 Market Street (Corner of 5th)',
  },
  {
    id: 'haven_2',
    name: 'Central District Police Precinct',
    type: 'POLICE_STATION',
    distance_meters: 310,
    is_open_now: true,
    is_verified_partner: true,
    has_security_staff: true,
    has_well_lit_entrance: true,
    walk_time_minutes: 4,
    address: '766 Vallejo Street',
  },
  {
    id: 'haven_3',
    name: 'Metro Intermodal Transit Hub & Security Desk',
    type: 'TRANSIT_HUB',
    distance_meters: 420,
    is_open_now: true,
    is_verified_partner: true,
    has_security_staff: true,
    has_well_lit_entrance: true,
    walk_time_minutes: 5,
    address: '101 Transit Way (Staffed concourse)',
  },
  {
    id: 'haven_4',
    name: 'St. Jude Emergency Hospital Lobby',
    type: 'HOSPITAL',
    distance_meters: 580,
    is_open_now: true,
    is_verified_partner: true,
    has_security_staff: true,
    has_well_lit_entrance: true,
    walk_time_minutes: 7,
    address: '900 Hyde St (24/7 ER Entrance)',
  },
  {
    id: 'haven_5',
    name: 'Starbucks / QuickStop 24-Hour Mart',
    type: 'OPEN_COMMERCIAL',
    distance_meters: 210,
    is_open_now: true,
    is_verified_partner: false,
    has_security_staff: false,
    has_well_lit_entrance: true,
    walk_time_minutes: 3,
    address: '320 Post Street',
  },
];

export const MOCK_INCIDENTS = [
  {
    id: 'inc_101',
    category: 'INFRASTRUCTURE_LIGHTING',
    title: 'Street Lamp Fixture Outage',
    description: '3 consecutive streetlights malfunctioning between 6th & Pine St, creating low visibility section.',
    severity: 'MEDIUM' as const,
    reportedAt: new Date(Date.now() - 34 * 60000).toISOString(),
    minutesAgo: 34,
    confidence: 0.92,
    corroborations: 4,
    hasPhoto: true,
    location: { lat: 37.7715, lng: -122.4168, name: 'Pine St & 6th Ave', x: 380, y: 330 },
  },
  {
    id: 'inc_102',
    category: 'ROAD_BLOCKAGE',
    title: 'Temporary Sidewalk Scaffold Repair',
    description: 'Construction scaffolding narrowing pedestrian walkway to single-file queue.',
    severity: 'LOW' as const,
    reportedAt: new Date(Date.now() - 85 * 60000).toISOString(),
    minutesAgo: 85,
    confidence: 0.88,
    corroborations: 2,
    hasPhoto: false,
    location: { lat: 37.7778, lng: -122.4218, name: 'Broadway & Columbus', x: 280, y: 160 },
  },
  {
    id: 'inc_103',
    category: 'DISTURBANCE',
    title: 'Loud Altercation Cleared',
    description: 'Verbal dispute near transit shelter; dispersed 25 minutes ago.',
    severity: 'LOW' as const,
    reportedAt: new Date(Date.now() - 52 * 60000).toISOString(),
    minutesAgo: 52,
    confidence: 0.74,
    corroborations: 1,
    hasPhoto: false,
    location: { lat: 37.7735, lng: -122.4182, name: 'Mission & 4th Plaza', x: 440, y: 260 },
  },
];

export const MOCK_ROUTE_OPTIONS: RouteOptionInput[] = [
  {
    route_id: 'route_illuminated_corridor',
    name: 'Option A: Market Boulevard (Illuminated Commercial Artery)',
    distance_km: 1.2,
    est_time_min: 14,
    path_description: 'Follows continuous commercial avenue with open storefronts, municipal LED lamp posts, and transit patrol presence.',
    lighting_level: 'WELL_LIT',
    pedestrian_density: 'HIGH',
    nearby_incidents: [],
    emergency_services_proximity_min: 2,
  },
  {
    route_id: 'route_pine_shortcut',
    name: 'Option B: Pine Alley (Direct Shortcut)',
    distance_km: 0.9,
    est_time_min: 10,
    path_description: 'Shorter secondary street bypassing main boulevard. Passes through residential alley with reduced lighting and low foot traffic.',
    lighting_level: 'POOR',
    pedestrian_density: 'LOW',
    nearby_incidents: [
      {
        id: 'inc_101',
        category: 'INFRASTRUCTURE_LIGHTING',
        severity: 'MEDIUM',
        distance_from_path_meters: 15,
        reported_minutes_ago: 34,
      },
    ],
    emergency_services_proximity_min: 6,
  },
  {
    route_id: 'route_transit_concourse',
    name: 'Option C: 4th Street Transit Way (Staffed Corridor)',
    distance_km: 1.4,
    est_time_min: 16,
    path_description: 'Slightly wider loop along the active transit line corridor with CCTV cameras and 24/7 security kiosks.',
    lighting_level: 'WELL_LIT',
    pedestrian_density: 'MODERATE',
    nearby_incidents: [],
    emergency_services_proximity_min: 3,
  },
];

// Presets for the 11 AI Functions Testbench
export const AI_FUNCTION_PRESETS = {
  safetyPulse: {
    locationName: 'Metro Central & Broadway Commercial Corridor',
    timeOfDay: '23:15',
    pedestrianActivitySignal: 'MODERATE' as const,
    lightingSignal: 'WELL_LIT' as const,
    nearbyEmergencyServices: [
      { name: 'Station 4 Fire & Paramedics', type: 'FIRE_STATION', distanceMeters: 280, responseTimeEstMin: 3 },
      { name: 'Central Patrol Unit', type: 'POLICE_STATION', distanceMeters: 350, responseTimeEstMin: 4 },
    ],
    incidentReports: [
      {
        id: 'inc_101',
        category: 'INFRASTRUCTURE_LIGHTING',
        description: '3 streetlamps dark on Pine St near 6th Ave',
        timestamp: new Date(Date.now() - 34 * 60000).toISOString(),
        confidence: 0.92,
        distanceMeters: 240,
      },
    ],
    historicalPatternContext: 'High pedestrian volume until midnight on weekends; commercial storefronts provide ambient illumination.',
  },

  incidentClassification: {
    reportText: 'Scaffolding collapse hazard and flashing temporary barrier partially blocking north crosswalk on 4th Ave. Pedestrians stepping onto active road.',
    photoDescription: 'Night photo showing metal frame tilt on curb near crosswalk.',
    timestamp: '22:48',
    locationContext: 'Intersection of 4th Ave & Market St',
  },

  duplicateDetection: {
    newReport: {
      id: 'rep_new_88',
      category: 'INFRASTRUCTURE_LIGHTING',
      description: 'Street lights completely off on Pine St between 5th and 6th, very dark sidewalk.',
      location: { lat: 37.7716, lng: -122.4167, address: 'Pine St & 6th' },
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    existingReports: [
      {
        id: 'inc_101',
        category: 'INFRASTRUCTURE_LIGHTING',
        description: '3 consecutive streetlights malfunctioning between 6th & Pine St, creating low visibility section.',
        location: { lat: 37.7715, lng: -122.4168, address: 'Pine St & 6th' },
        timestamp: new Date(Date.now() - 34 * 60000).toISOString(),
      },
      {
        id: 'inc_102',
        category: 'ROAD_BLOCKAGE',
        description: 'Construction scaffolding narrowing walkway',
        location: { lat: 37.7778, lng: -122.4218, address: 'Broadway' },
        timestamp: new Date(Date.now() - 85 * 60000).toISOString(),
      },
    ],
  },

  severityDecay: {
    reportId: 'inc_103',
    category: 'DISTURBANCE',
    initialSeverity: 'MEDIUM' as const,
    initialConfidence: 0.85,
    reportedAt: new Date(Date.now() - 65 * 60000).toISOString(),
    currentTime: new Date().toISOString(),
    corroborationCount: 1,
    isInfrastructureFixedReported: false,
  },

  saferRouteScoring: {
    routes: MOCK_ROUTE_OPTIONS,
    timeOfDay: '23:30',
  },

  followedMode: {
    userLocation: { lat: 37.7749, lng: -122.4194, name: 'Market St & 5th Ave (Westbound Sidewalk)' },
    timeOfDay: '23:42',
    batteryLevel: 74,
    speedKmh: 4.5,
    movementMode: 'WALKING' as const,
    nearbyHavens: MOCK_SAFE_HAVENS,
    trustedContactsCount: 3,
  },

  safeHavenRanking: {
    havens: MOCK_SAFE_HAVENS,
    timeOfDay: '00:15',
  },

  crossSignalRisk: {
    activeSignals: [
      { type: 'INCIDENT' as const, description: 'Streetlamp blackout along 200m block', severity: 'MEDIUM' as const, timestamp: '23:10' },
      { type: 'ROAD_CLOSURE' as const, description: 'Sidewalk detour forcing pedestrians toward unlit lane', severity: 'MEDIUM' as const, timestamp: '23:18' },
      { type: 'WEATHER' as const, description: 'Heavy rainfall reducing vehicular stopping distance and visibility', severity: 'LOW' as const, timestamp: '23:25' },
    ],
    areaType: 'TRANSIT_CORRIDOR' as const,
    timeOfDay: '23:45',
  },

  areaSummary: {
    areaName: 'Metro Central Station & Surrounding Commerce Hub',
    currentObservedIncidents: [
      'Streetlight outage reported on secondary side street (Pine St)',
      'High foot traffic entering subway concourse',
    ],
    activeLightingSensors: '94% of municipal fixtures active on primary arterial streets',
    pedestrianTrafficRating: 'MODERATE to HIGH (evening commute & dining patrons)',
    weatherCondition: 'Clear skies, 14°C',
    timeOfDay: '22:30',
  },

  communityReportVerification: {
    reportId: 'rep_verified_303',
    anonymousReporterToken: 'anon_user_9f4b7a2c',
    reporterKarmaScore: 88,
    independentConfirmationsCount: 3,
    hasPhotoProof: true,
    timeSinceReportMinutes: 12,
    proximityVerifiedByGps: true,
    reportCategory: 'ROAD_BLOCKAGE',
  },

  safetyNotification: {
    incidentCategory: 'LIGHTING_OUTAGE',
    distanceMeters: 320,
    minutesAgo: 8,
    userCurrentRoute: 'Option A: Market Boulevard',
    suggestedDetourAvailable: true,
  },
};
