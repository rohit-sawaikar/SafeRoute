/**
 * Core Safety Pulse, Corroboration, Time-Decay & Geofencing Engine
 */

import geohash from 'ngeohash';
import {
  GeoPoint,
  IncidentReport,
  IncidentType,
  SafetyLevel,
  SafetyZone,
  RouteSafetySignal,
} from '../types';

// Haversine distance in meters
export function getDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Encode lat/lng to Geohash (precision 6 is ~1.2km x 0.6km)
export function encodeGeohash(point: GeoPoint, precision: number = 6): string {
  return geohash.encode(point.latitude, point.longitude, precision);
}

// Get half life / max lifetime of an incident type in minutes
export function getIncidentTypeMaxLifetimeMinutes(type: IncidentType): number {
  switch (type) {
    case 'accident':
    case 'fire':
    case 'medical_emergency':
      return 120; // 2 hours
    case 'harassment':
    case 'suspicious_activity':
      return 240; // 4 hours
    case 'road_blockage':
      return 480; // 8 hours
    case 'streetlight_failure':
    case 'unsafe_infrastructure':
      return 20160; // 14 days
    default:
      return 180;
  }
}

// Calculate decayed confidence score based on age and corroborations
export function computeDecayedConfidence(report: IncidentReport, now: number = Date.now()): number {
  const ageMinutes = (now - report.timestamp) / (1000 * 60);
  const maxLifetime = getIncidentTypeMaxLifetimeMinutes(report.type);

  if (ageMinutes >= maxLifetime) {
    return 0.0;
  }

  // Exponential decay formula: baseScore * e^(-k * age)
  const baseScore = 0.5 + Math.min(report.corroborationCount * 0.2, 0.45);
  const decayFactor = Math.log(2) / (maxLifetime / 2); // half-life at 50% max lifetime
  const decayedScore = baseScore * Math.exp(-decayFactor * ageMinutes);

  return Math.max(0, Math.min(1, Math.round(decayedScore * 100) / 100));
}

// Corroboration logic: Check if new report matches recent nearby reports
export function checkCorroboration(
  newReport: { type: IncidentType; geopoint: GeoPoint; timestamp: number },
  existingReports: IncidentReport[]
): { corroborationCount: number; isCorroborated: boolean; confidenceScore: number } {
  const CORROBORATION_RADIUS_METERS = 200; // ~200m
  const CORROBORATION_TIME_WINDOW_MS = 45 * 60 * 1000; // 45 mins

  let matchingCount = 0;

  for (const existing of existingReports) {
    if (existing.type !== newReport.type) continue;
    if (existing.status === 'expired') continue;

    const timeDiff = Math.abs(newReport.timestamp - existing.timestamp);
    if (timeDiff > CORROBORATION_TIME_WINDOW_MS) continue;

    const dist = getDistanceMeters(newReport.geopoint, existing.geopoint);
    if (dist <= CORROBORATION_RADIUS_METERS) {
      matchingCount++;
    }
  }

  const totalCorroboration = matchingCount + 1; // including current report
  const isCorroborated = totalCorroboration >= 2;
  const confidenceScore = isCorroborated
    ? Math.min(0.85 + (totalCorroboration - 2) * 0.05, 0.98)
    : 0.45;

  return {
    corroborationCount: totalCorroboration,
    isCorroborated,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
  };
}

// Compute live safety status for a target area (NEVER permanent, point-in-time aware)
export function computeAreaSafetyStatus(
  targetPoint: GeoPoint,
  radiusMeters: number,
  nearbyIncidents: IncidentReport[],
  currentTime: Date = new Date()
): {
  safetyLevel: SafetyLevel;
  overallScore: number; // 0 to 100
  humanReadableWhy: string;
  contributingFactors: {
    activeIncidentCount: number;
    corroboratedIncidentCount: number;
    avgLightingScore: number;
    pedestrianActivityLevel: 'low' | 'moderate' | 'high';
    timeOfDay: string;
    timeOfDayFactor: number;
  };
  recentSummary: string[];
} {
  // 1. Filter incidents within radius & compute active weight
  const now = currentTime.getTime();
  let activeCount = 0;
  let corroboratedCount = 0;
  let totalIncidentRiskScore = 0;
  const summaries: string[] = [];

  for (const inc of nearbyIncidents) {
    const dist = getDistanceMeters(targetPoint, inc.geopoint);
    if (dist > radiusMeters) continue;

    const confidence = computeDecayedConfidence(inc, now);
    if (confidence <= 0.1) continue; // ignore fully decayed reports

    activeCount++;
    if (inc.status === 'corroborated' || inc.corroborationCount > 1) {
      corroboratedCount++;
    }

    // Weight by incident type severity
    let typeWeight = 1.0;
    if (inc.type === 'harassment' || inc.type === 'fire' || inc.type === 'medical_emergency') {
      typeWeight = 2.0;
    } else if (inc.type === 'suspicious_activity' || inc.type === 'road_blockage') {
      typeWeight = 1.5;
    }

    totalIncidentRiskScore += confidence * typeWeight * 15;
    const ageMins = Math.round((now - inc.timestamp) / 60000);
    summaries.push(
      `${inc.type.replace('_', ' ').toUpperCase()} reported ${ageMins}m ago (${dist.toFixed(0)}m away, confidence ${Math.round(confidence * 100)}%)`
    );
  }

  // 2. Time of day risk factor
  const hour = currentTime.getHours();
  let timeOfDayFactor = 1.0;
  let pedestrianActivity: 'low' | 'moderate' | 'high' = 'moderate';
  let defaultLightingScore = 0.8; // default daytime lighting

  if (hour >= 22 || hour < 4) {
    timeOfDayFactor = 1.4; // Nighttime increases sensitivity
    pedestrianActivity = 'low';
    defaultLightingScore = 0.45;
  } else if (hour >= 18 || hour < 22) {
    timeOfDayFactor = 1.15;
    pedestrianActivity = 'moderate';
    defaultLightingScore = 0.65;
  } else {
    timeOfDayFactor = 1.0;
    pedestrianActivity = 'high';
    defaultLightingScore = 0.9;
  }

  // 3. Overall Safety Score calculation (100 = completely safe, 0 = high danger)
  const baseScore = 95;
  const riskPenalty = totalIncidentRiskScore * timeOfDayFactor;
  const finalScore = Math.max(10, Math.min(100, Math.round(baseScore - riskPenalty)));

  let safetyLevel: SafetyLevel = 'green';
  let humanReadableWhy = 'Area is currently clear with no active corroborated risk signals.';

  if (finalScore < 50 || corroboratedCount >= 2 || (activeCount >= 3 && hour >= 21)) {
    safetyLevel = 'red';
    humanReadableWhy = `${activeCount} recent active incidents (${corroboratedCount} corroborated) combined with nighttime conditions indicate elevated risk.`;
  } else if (finalScore < 75 || activeCount >= 1 || hour >= 23) {
    safetyLevel = 'yellow';
    humanReadableWhy = activeCount > 0
      ? `${activeCount} unverified/active report in vicinity. Exercise standard awareness.`
      : `Late night time window (${hour}:00) — lower pedestrian density detected.`;
  }

  // CRITICAL RULE: Do not immediately mark an area dangerous (red) from one uncorroborated report
  if (safetyLevel === 'red' && corroboratedCount === 0 && activeCount <= 1) {
    safetyLevel = 'yellow';
    humanReadableWhy = activeCount === 1
      ? `1 unverified report in vicinity. Exercise standard awareness.`
      : `Exercise standard awareness.`;
  }

  return {
    safetyLevel,
    overallScore: finalScore,
    humanReadableWhy,
    contributingFactors: {
      activeIncidentCount: activeCount,
      corroboratedIncidentCount: corroboratedCount,
      avgLightingScore: defaultLightingScore,
      pedestrianActivityLevel: pedestrianActivity,
      timeOfDay: `${String(hour).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`,
      timeOfDayFactor,
    },
    recentSummary: summaries,
  };
}

// Compare Candidate Routes
export function scoreCandidateRoutes(
  routes: Array<{ id: string; name: string; waypoints: GeoPoint[]; travelTimeMinutes: number; distanceKm: number }>,
  allIncidents: IncidentReport[],
  currentTime: Date = new Date()
): RouteSafetySignal[] {
  return routes.map((route) => {
    let activeIncidentsCount = 0;
    let totalRisk = 0;
    const signals: string[] = [];

    // Evaluate incidents along waypoints
    for (const waypoint of route.waypoints) {
      const areaStatus = computeAreaSafetyStatus(waypoint, 300, allIncidents, currentTime);
      if (areaStatus.contributingFactors.activeIncidentCount > 0) {
        activeIncidentsCount += areaStatus.contributingFactors.activeIncidentCount;
        totalRisk += (100 - areaStatus.overallScore);
      }
    }

    const avgRisk = route.waypoints.length > 0 ? totalRisk / route.waypoints.length : 0;
    const rawSafetyScore = Math.max(15, Math.min(98, Math.round(95 - avgRisk * 0.8)));

    let safetyLevel: SafetyLevel = 'green';
    if (rawSafetyScore < 60) safetyLevel = 'red';
    else if (rawSafetyScore < 80) safetyLevel = 'yellow';

    if (activeIncidentsCount === 0) {
      signals.push('Well-lit arterial corridor with high pedestrian activity');
      signals.push('No recent incident reports along path');
    } else {
      signals.push(`${activeIncidentsCount} active report(s) flagged within 300m of route`);
    }

    return {
      routeId: route.id,
      name: route.name,
      travelTimeMinutes: route.travelTimeMinutes,
      distanceKm: route.distanceKm,
      safetyScore: rawSafetyScore,
      safetyLevel,
      lightingPercentage: Math.round(rawSafetyScore * 0.9),
      activeIncidentsCount,
      signals,
      recommendedReason:
        safetyLevel === 'green'
          ? 'Recommended: Highest safety score and active street lighting coverage'
          : 'Alternative option: Direct path with moderate safety profile',
    };
  });
}

// Check route deviation for active trips
export function checkRouteDeviation(
  userPoint: GeoPoint,
  routeCoordinates: GeoPoint[],
  thresholdMeters: number = 150
): { isDeviated: boolean; distanceToRouteMeters: number } {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return { isDeviated: false, distanceToRouteMeters: 0 };
  }

  let minDistance = Infinity;
  for (const wp of routeCoordinates) {
    const dist = getDistanceMeters(userPoint, wp);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return {
    isDeviated: minDistance > thresholdMeters,
    distanceToRouteMeters: Math.round(minDistance),
  };
}
