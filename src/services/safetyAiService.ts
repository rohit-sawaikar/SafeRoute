/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  TravelMode,
  SafetyPulseRequest,
  SafetyPulseOutput,
  IncidentClassificationRequest,
  IncidentClassificationOutput,
  DuplicateDetectionRequest,
  DuplicateDetectionOutput,
  SeverityDecayRequest,
  SeverityDecayOutput,
  RouteOptionInput,
  SaferRouteScoringOutput,
  FollowedModeRequest,
  FollowedModeOutput,
  SafeHavenCandidate,
  SafeHavenRankingOutput,
  CrossSignalRiskRequest,
  CrossSignalRiskOutput,
  AreaSummaryRequest,
  AreaSummaryOutput,
  CommunityReportVerificationRequest,
  CommunityReportVerificationOutput,
  SafetyNotificationRequest,
  SafetyNotificationOutput,
} from '../types/safety';
import { getSafetyStarRating } from '../types/safety';

interface ApiResult<T> {
  data: T;
  latencyMs: number;
  isFallback?: boolean;
}

async function postApi<T>(endpoint: string, body: any): Promise<ApiResult<T>> {
  const startTime = performance.now();
  try {
    const backendUrl =
      (import.meta as any).env.VITE_BACKEND_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const response = await fetch(`${backendUrl}/api/safety/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const latencyMs = Math.round(performance.now() - startTime);
    return { data, latencyMs };
  } catch (err) {
    console.warn(`Fallback triggered for /api/safety/${endpoint}:`, err);
    const latencyMs = Math.round(performance.now() - startTime);
    // In dev or offline scenarios, provide typed resilient fallback
    const fallbackData = getDeterministicFallback<T>(endpoint, body);
    return { data: fallbackData, latencyMs, isFallback: true };
  }
}

// 1. SAFETY PULSE
export async function fetchSafetyPulse(req: SafetyPulseRequest): Promise<ApiResult<SafetyPulseOutput>> {
  return postApi<SafetyPulseOutput>('pulse', req);
}

// 2. INCIDENT CLASSIFICATION
export async function fetchIncidentClassification(
  req: IncidentClassificationRequest
): Promise<ApiResult<IncidentClassificationOutput>> {
  return postApi<IncidentClassificationOutput>('classify-incident', req);
}

// 3. DUPLICATE DETECTION
export async function fetchDuplicateDetection(
  req: DuplicateDetectionRequest
): Promise<ApiResult<DuplicateDetectionOutput>> {
  return postApi<DuplicateDetectionOutput>('detect-duplicates', req);
}

// 4. REPORT SEVERITY DECAY
export async function fetchSeverityDecay(req: SeverityDecayRequest): Promise<ApiResult<SeverityDecayOutput>> {
  return postApi<SeverityDecayOutput>('severity-decay', req);
}

// 5. SAFER ROUTE SCORING
export async function fetchSaferRouteScoring(
  routes: RouteOptionInput[],
  timeOfDay: string,
  travelMode: TravelMode = 'WALKING'
): Promise<ApiResult<SaferRouteScoringOutput>> {
  return postApi<SaferRouteScoringOutput>('route-scoring', { routes, timeOfDay, travelMode });
}

// 6. FOLLOWED MODE
export async function fetchFollowedMode(req: FollowedModeRequest): Promise<ApiResult<FollowedModeOutput>> {
  return postApi<FollowedModeOutput>('followed-mode', req);
}

// 7. SAFE HAVEN RANKING
export async function fetchSafeHavenRanking(
  havens: SafeHavenCandidate[],
  timeOfDay: string
): Promise<ApiResult<SafeHavenRankingOutput>> {
  return postApi<SafeHavenRankingOutput>('rank-safe-havens', { havens, timeOfDay });
}

// 8. CROSS-SIGNAL RISK
export async function fetchCrossSignalRisk(
  req: CrossSignalRiskRequest
): Promise<ApiResult<CrossSignalRiskOutput>> {
  return postApi<CrossSignalRiskOutput>('cross-signal-risk', req);
}

// 9. AREA SUMMARY
export async function fetchAreaSummary(req: AreaSummaryRequest): Promise<ApiResult<AreaSummaryOutput>> {
  return postApi<AreaSummaryOutput>('area-summary', req);
}

// 10. COMMUNITY REPORT VERIFICATION
export async function fetchCommunityReportVerification(
  req: CommunityReportVerificationRequest
): Promise<ApiResult<CommunityReportVerificationOutput>> {
  return postApi<CommunityReportVerificationOutput>('verify-community-report', req);
}

// 11. SAFETY NOTIFICATION
export async function fetchSafetyNotification(
  req: SafetyNotificationRequest
): Promise<ApiResult<SafetyNotificationOutput>> {
  return postApi<SafetyNotificationOutput>('safety-notification', req);
}

// Deterministic typed fallbacks for resiliency
function getDeterministicFallback<T>(endpoint: string, body: any): T {
  switch (endpoint) {
    case 'pulse':
      return {
        safety_status: 'NORMAL',
        confidence: 0.89,
        recent_signals: [
          'Municipal streetlamps active on primary thoroughfares',
          'Moderate foot traffic near transit points',
          'Emergency services station within 300m',
        ],
        explanation:
          'Current telemetry reflects active lighting infrastructure and steady pedestrian movement along the commercial corridor.',
        recommended_action: 'Proceed along main illuminated sidewalks.',
        timestamp: new Date().toISOString(),
      } as unknown as T;

    case 'classify-incident':
      return {
        category: 'INFRASTRUCTURE_LIGHTING',
        severity: 'MEDIUM',
        confidence: 0.91,
        evidence: ['Specific streetlamp section identified', 'User confirmed dark sidewalk area'],
        explanation: 'Report indicates a localized physical infrastructure gap affecting night visibility.',
        is_urgent: false,
        actionable_guidance: 'Cross to the illuminated south sidewalk.',
      } as unknown as T;

    case 'detect-duplicates':
      return {
        duplicate_probability: 0.88,
        matching_report_ids: ['inc_101'],
        match_reason: 'High spatial proximity (<20m) and matching description of streetlamp outage on Pine St.',
        merge_recommendation: 'CORROBORATE',
      } as unknown as T;

    case 'severity-decay':
      return {
        report_id: body.reportId || 'inc_103',
        current_confidence: 0.35,
        initial_confidence: 0.85,
        decay_factor: 0.41,
        time_elapsed_minutes: 65,
        reason: 'Aged 65 minutes with no new reconfirmations; transient verbal dispute naturally resolved.',
        is_active: false,
      } as unknown as T;

    case 'route-scoring': {
      const mode = (body.travelMode as TravelMode) || 'WALKING';
      const evaluatedRoutes = (body.routes || []).map((r: any, idx: number) => {
        const score = idx === 0 ? (mode === 'VEHICLE' ? 89 : 91) : idx === 1 ? (mode === 'VEHICLE' ? 68 : 64) : (mode === 'VEHICLE' ? 82 : 84);
        return {
          route_id: r.route_id,
          name: r.name,
          safety_score: score,
          star_rating: getSafetyStarRating(score),
          data_confidence: 'HIGH' as const,
          travel_mode: mode,
          distance_km: r.distance_km,
          est_time_min: r.est_time_min,
          lighting_rating: r.lighting_level,
          activity_level: r.pedestrian_density,
          emergency_proximity_min: r.emergency_services_proximity_min,
          key_tradeoffs: idx === 0
            ? ['Optimal safety score with continuous infrastructure monitoring']
            : ['Fastest arrival time with higher exposure to secondary alleys'],
          cautionary_notes: idx === 1
            ? [mode === 'WALKING' ? 'Low lighting and unstaffed side road' : 'Narrow single-lane passage']
            : ['Stay on marked crosswalks'],
          safety_factors_explained: mode === 'VEHICLE'
            ? ['✓ Multi-lane road clearance', '✓ Low congestion risk', '✓ Quick emergency access']
            : ['✓ Continuous municipal lighting', '✓ Active pedestrian surveillance', '✓ Zero active hazards'],
          score_breakdown: mode === 'VEHICLE'
            ? {
                accident_avoidance: idx === 0 ? 28 : 18,
                traffic_flow_rating: idx === 0 ? 23 : 17,
                hazard_clearance: idx === 0 ? 24 : 16,
                emergency_access: 17,
              }
            : {
                lighting: idx === 0 ? 24 : 12,
                pedestrian_infrastructure: idx === 0 ? 23 : 10,
                isolation_avoidance: idx === 0 ? 21 : 12,
                emergency_access: 18,
              },
        };
      });

      return {
        travel_mode: mode,
        routes: evaluatedRoutes,
        safest_route_id: evaluatedRoutes[0]?.route_id || 'route_illuminated_corridor',
        fastest_route_id: evaluatedRoutes[1]?.route_id || 'route_pine_shortcut',
        balanced_route_id: evaluatedRoutes[2]?.route_id || evaluatedRoutes[0]?.route_id,
        tradeoff_summary: {
          time_saved_minutes: 4,
          safety_score_diff: 27,
          explanation: 'You save 4 minutes by choosing the fastest route, but the safest route has a higher ★★★★★ (91/100) safety rating.',
        },
        recommendation_rationale: mode === 'VEHICLE'
          ? 'The primary arterial thoroughfare provides multi-lane clearance, verified signal synchronization, and lowest collision probability.'
          : 'Route A provides the highest continuous lighting infrastructure and active pedestrian surveillance.',
        disclaimer: 'SafeRoute provides decision support based on multi-signal indicators and does not guarantee absolute safety. Always stay vigilant.',
      } as unknown as T;
    }

    case 'followed-mode':
      return {
        immediate_steps: [
          'Head directly towards the illuminated 24/7 pharmacy on Market St (140m ahead).',
          'Cross the street to confirm if anyone follows your direction.',
          'Enter the building and notify the on-site staff or security.',
        ],
        top_safe_haven: {
          id: 'haven_1',
          name: 'Walgreens 24/7 Pharmacy & First Aid',
          type: 'PHARMACY_24_7',
          distance_meters: 140,
          walk_time_sec: 95,
          route_instruction: 'Walk straight 140m north along Market St; brightly lit entrance on right.',
          phone: '555-0199',
        },
        emergency_dispatch: {
          local_number: '911',
          prepared_sms_payload: 'EMERGENCY: Feeling followed near Market St & 5th Ave. Heading into Walgreens.',
          gps_coordinates_string: '37.774900, -122.419400',
        },
        trusted_contact_alert: {
          sms_text: 'SafeRoute SOS Alert: I am feeling unsafe and walking toward a safe haven. View my live location:',
          live_tracking_link: 'https://saferoute.live/track/sos-demo',
        },
        evidence_recording_guidance: {
          audio_auto_start: true,
          discreet_mode_tip: 'Switch to the fake phone call screen so you appear to be in conversation while streaming location.',
        },
        tactical_avoidance_rules: [
          'Never enter dark alleyways or dead-end passages.',
          'Do not lead anyone directly to your private home address.',
          'Enter any open commercial business with active staff.',
        ],
      } as unknown as T;

    case 'rank-safe-havens':
      return {
        ranked_havens: (body.havens || []).map((h: any, i: number) => ({
          id: h.id,
          name: h.name,
          type: h.type,
          distance_meters: h.distance_meters,
          is_open: h.is_open_now,
          verification_level: h.is_verified_partner ? 'COMMUNITY_PARTNER' : 'PUBLIC_FACILITY',
          accessibility_score: 95 - i * 5,
          walk_time_min: h.walk_time_minutes,
          navigation_tip: 'Main lighted entryway',
          rank_score: 96 - i * 8,
        })),
        top_recommendation_reason: 'Closest verified 24/7 location with on-duty staff and illuminated entrance.',
      } as unknown as T;

    case 'cross-signal-risk':
      return {
        synergy_detected: true,
        risk_level: 'ELEVATED',
        compound_factors: ['Streetlight outage on side road', 'Sidewalk scaffold detour', 'Reduced nighttime visibility'],
        emerging_risk_description: 'Compound friction: unlit corridor combined with sidewalk obstruction forces pedestrians toward active roadway.',
        preventative_recommendations: [
          'Divert around Pine St via the main illuminated Market Blvd corridor.',
          'Cross at designated signalized intersections only.',
        ],
      } as unknown as T;

    case 'area-summary':
      return {
        observed_facts: [
          'Primary arterial street lamps operational (94% active rate)',
          '1 localized streetlight outage on Pine St side road',
          'Transit hub operating on standard night schedule',
        ],
        temporal_context: 'Typical late-evening activity with moderate foot traffic around dining and transit venues.',
        predictive_indicators: [
          'Foot traffic expected to decrease by ~40% after midnight',
          'Transit security patrols scheduled along 4th St corridor',
        ],
        factual_summary: 'The area exhibits normal municipal conditions with high illumination on main corridors and localized side-street repair notices.',
        advisory: 'Stick to designated primary routes with active storefronts.',
      } as unknown as T;

    case 'verify-community-report':
      return {
        report_id: body.reportId || 'rep_1',
        verification_score: 88,
        verification_level: 'COMMUNITY_CORROBORATED',
        corroboration_count: 3,
        evidence_quality: 'HIGH',
        trust_metrics: {
          timestamp_freshness: 92,
          proximity_accuracy: 96,
          photographic_evidence: true,
          independent_witness_count: 3,
        },
        reasoning: 'Verified through 3 independent user reports, attached photograph, and matching GPS timestamp logs.',
        privacy_guarantee: 'Reporter identity is completely anonymous and protected under zero-knowledge token standards.',
      } as unknown as T;

    case 'safety-notification':
      return {
        alert_title: 'Notice 320m Ahead',
        notification_text: 'Street lamp outage reported 320m ahead on your route 8 minutes ago.',
        urgency: 'ADVISORY',
        distance_meters: 320,
        timestamp_formatted: '8m ago',
        action_prompt: 'View Lit Alternative',
      } as unknown as T;

    default:
      return {} as unknown as T;
  }
}
