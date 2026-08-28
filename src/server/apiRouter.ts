/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import express from 'express';
import { requestOtp, verifyOtpCode, getUserByToken } from './authProvider.ts';
import {
  submitIncidentReport,
  voteOnIncident,
  getNearbyIncidents,
  calculateRouteCautions,
  getAdminIncidents,
  moderateIncident,
} from './incidentVerificationService.ts';
import {
  computeSafetyPulse,
  classifyIncident,
  detectDuplicates,
  calculateSeverityDecay,
  scoreSaferRoutes,
  activateFollowedMode,
  rankSafeHavens,
  analyzeCrossSignalRisk,
  generateAreaSummary,
  verifyCommunityReport,
  generateSafetyNotification,
} from './geminiSafetyEngine.ts';

export const safetyApiRouter = Router();

safetyApiRouter.use(express.json({ limit: '10mb' }));

// REAL AUTHENTICATION ENDPOINTS
safetyApiRouter.post('/auth/send-otp', async (req, res) => {
  try {
    const { name, phoneNumber, countryCode } = req.body;
    const result = await requestOtp(name, phoneNumber, countryCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to send OTP' });
  }
});

safetyApiRouter.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, name, countryCode } = req.body;
    const result = await verifyOtpCode(phoneNumber, otp, name, countryCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'OTP verification failed' });
  }
});

safetyApiRouter.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized session' });
  }
  res.json({ success: true, user });
});

// REAL INCIDENT REPORTING & VERIFICATION ENDPOINTS
safetyApiRouter.post('/incidents/submit', async (req, res) => {
  try {
    const result = await submitIncidentReport(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to submit incident report' });
  }
});

safetyApiRouter.get('/incidents/nearby', (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 21.1458;
    const lng = parseFloat(req.query.lng as string) || 79.0882;
    const radius = parseInt(req.query.radius as string) || 5000;
    const incidents = getNearbyIncidents(lat, lng, radius);
    res.json({ success: true, count: incidents.length, incidents });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch nearby incidents' });
  }
});

safetyApiRouter.post('/incidents/vote', async (req, res) => {
  try {
    const { incidentId, userId, voteType } = req.body;
    const result = await voteOnIncident({ incidentId, userId, voteType });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Voting failed' });
  }
});

safetyApiRouter.post('/incidents/route-cautions', (req, res) => {
  try {
    const { routeCoordinates } = req.body;
    const cautions = calculateRouteCautions(routeCoordinates || []);
    res.json({ success: true, cautionsCount: cautions.length, cautions });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to compute route cautions' });
  }
});

safetyApiRouter.get('/admin/incidents', (req, res) => {
  try {
    const data = getAdminIncidents();
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch admin moderation data' });
  }
});

safetyApiRouter.post('/admin/incidents/:id/moderate', (req, res) => {
  try {
    const incidentId = req.params.id;
    const { action, notes } = req.body;
    const report = moderateIncident(incidentId, action, notes);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Moderation action failed' });
  }
});

// 1. SAFETY PULSE
safetyApiRouter.post('/pulse', async (req, res) => {
  try {
    const result = await computeSafetyPulse(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to compute safety pulse' });
  }
});

// 2. INCIDENT CLASSIFICATION
safetyApiRouter.post('/classify-incident', async (req, res) => {
  try {
    const result = await classifyIncident(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to classify incident' });
  }
});

// 3. DUPLICATE DETECTION
safetyApiRouter.post('/detect-duplicates', async (req, res) => {
  try {
    const result = await detectDuplicates(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to detect duplicates' });
  }
});

// 4. REPORT SEVERITY DECAY
safetyApiRouter.post('/severity-decay', async (req, res) => {
  try {
    const result = await calculateSeverityDecay(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to calculate severity decay' });
  }
});

// 5. SAFER ROUTE SCORING
safetyApiRouter.post('/route-scoring', async (req, res) => {
  try {
    const { routes, timeOfDay, travelMode } = req.body;
    const result = await scoreSaferRoutes(routes || [], timeOfDay || '22:30', travelMode || 'WALKING');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to score routes' });
  }
});

// 6. FOLLOWED MODE
safetyApiRouter.post('/followed-mode', async (req, res) => {
  try {
    const result = await activateFollowedMode(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to activate followed mode' });
  }
});

// 7. SAFE HAVEN RANKING
safetyApiRouter.post('/rank-safe-havens', async (req, res) => {
  try {
    const { havens, timeOfDay } = req.body;
    const result = await rankSafeHavens(havens || [], timeOfDay || '23:00');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to rank safe havens' });
  }
});

// 8. CROSS-SIGNAL RISK
safetyApiRouter.post('/cross-signal-risk', async (req, res) => {
  try {
    const result = await analyzeCrossSignalRisk(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to analyze cross-signal risk' });
  }
});

// 9. AREA SUMMARY
safetyApiRouter.post('/area-summary', async (req, res) => {
  try {
    const result = await generateAreaSummary(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate area summary' });
  }
});

// 10. COMMUNITY REPORT VERIFICATION
safetyApiRouter.post('/verify-community-report', async (req, res) => {
  try {
    const result = await verifyCommunityReport(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to verify community report' });
  }
});

// 11. SAFETY NOTIFICATION
safetyApiRouter.post('/safety-notification', async (req, res) => {
  try {
    const result = await generateSafetyNotification(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate safety notification' });
  }
});

/**
 * Haversine formula calculation for distance in meters
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function mapOsmTagToType(tags?: Record<string, string>): string {
  if (!tags) return 'OPEN_COMMERCIAL';
  const amenity = tags.amenity?.toLowerCase() || '';
  const railway = tags.railway?.toLowerCase() || '';
  const highway = tags.highway?.toLowerCase() || '';
  const emergency = tags.emergency?.toLowerCase() || '';
  const healthcare = tags.healthcare?.toLowerCase() || '';

  if (amenity === 'police') return 'POLICE_STATION';
  if (amenity === 'fire_station' || emergency === 'fire_station' || emergency === 'yes') return 'FIRE_STATION';
  if (amenity === 'hospital' || amenity === 'clinic' || healthcare === 'hospital' || healthcare === 'clinic' || healthcare === 'centre' || amenity === 'doctors') return 'HOSPITAL';
  if (amenity === 'pharmacy' || amenity === 'chemist') return 'PHARMACY_24_7';
  if (railway || highway === 'bus_stop' || highway === 'platform' || amenity === 'bus_station' || amenity === 'ferry_terminal') return 'TRANSIT_HUB';

  return 'OPEN_COMMERCIAL';
}

function getCategoryDefaultName(tags?: Record<string, string>): string {
  if (!tags) return 'Emergency Sanctuary';
  const havenType = mapOsmTagToType(tags);
  switch (havenType) {
    case 'POLICE_STATION':
      return 'Public Police Station';
    case 'FIRE_STATION':
      return 'Emergency Fire Station';
    case 'HOSPITAL':
      return 'Community Medical Center';
    case 'PHARMACY_24_7':
      return 'Local Pharmacy';
    case 'TRANSIT_HUB':
      return 'Public Transit Hub';
    default:
      return 'Verified Public Facility';
  }
}

// RELIABLE OVERPASS API MIRRORS POOL (ORDERED BY SPEED & RELIABILITY)
const OVERPASS_SERVERS = [
  'https://overpass.freemap.sk/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// REAL BACKEND PROXY FOR OVERPASS NEARBY PLACES WITH MIRROR POOL & SAFE RESPONSE PARSING
safetyApiRouter.get('/nearby-places', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    let radius = parseInt(req.query.radius as string) || 3000;

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
      });
    }

    if (isNaN(radius) || radius < 500) radius = 500;
    if (radius > 10000) radius = 10000;

    // Fast, optimized Overpass QL query searching node/way/relation
    const overpassQuery = `[out:json][timeout:10];(nwr["amenity"~"police|fire_station|hospital|clinic|pharmacy|chemist|doctors|bus_station|bank|post_office"](around:${radius},${lat},${lng});nwr["railway"~"station|subway_entrance|halt|tram_stop"](around:${radius},${lat},${lng});nwr["highway"~"bus_stop|platform"](around:${radius},${lat},${lng});nwr["emergency"](around:${radius},${lat},${lng});nwr["healthcare"](around:${radius},${lat},${lng}););out center 40;`.trim();

    let elements: any[] = [];
    let fetchSuccess = false;
    let successfulServer = '';
    let lastErrorDetails = 'All Overpass mirrors failed or timed out';

    for (const serverUrl of OVERPASS_SERVERS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const overpassRes = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'SafeRoute-Backend/1.0 (https://saferoute-1-rues.onrender.com)',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const rawText = await overpassRes.text();

        if (!overpassRes.ok) {
          console.warn(`[Overpass Proxy] ${serverUrl} returned HTTP ${overpassRes.status}. Snippet: ${rawText.substring(0, 100)}`);
          lastErrorDetails = `${serverUrl} HTTP ${overpassRes.status}`;
          continue;
        }

        if (!rawText.trim().startsWith('{')) {
          console.warn(`[Overpass Proxy] ${serverUrl} returned non-JSON body. Snippet: ${rawText.substring(0, 100)}`);
          lastErrorDetails = `${serverUrl} returned non-JSON content`;
          continue;
        }

        const data = JSON.parse(rawText);
        elements = data?.elements || [];
        fetchSuccess = true;
        successfulServer = serverUrl;
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn(`[Overpass Proxy] ${serverUrl} failed: ${err.name === 'AbortError' ? 'Timeout (4s)' : err.message}`);
        lastErrorDetails = `${serverUrl} ${err.name === 'AbortError' ? 'Timeout' : err.message}`;
      }
    }

    if (!fetchSuccess) {
      return res.status(502).json({
        success: false,
        error: `Unable to fetch nearby places from OpenStreetMap Overpass API (${lastErrorDetails}).`,
      });
    }

    const realPlaces = elements
      .map((item: any, idx: number) => {
        const itemLat = item.lat ?? item.center?.lat;
        const itemLon = item.lon ?? item.center?.lon;
        if (!itemLat || !itemLon) return null;

        const tags = item.tags || {};
        const name = tags['name:en'] || tags.name || getCategoryDefaultName(tags);
        const distMeters = calculateDistanceMeters(lat, lng, itemLat, itemLon);
        const walkTime = Math.max(1, Math.round(distMeters / 75));
        const havenType = mapOsmTagToType(tags);

        const street = tags['addr:street'] || tags['addr:full'] || '';
        const houseNum = tags['addr:housenumber'] || '';
        const city = tags['addr:city'] || tags['addr:district'] || tags['addr:block'] || '';
        const address = [houseNum, street, city].filter(Boolean).join(', ') || `${itemLat.toFixed(4)}°, ${itemLon.toFixed(4)}°`;
        const openingHoursStr = tags.opening_hours || '';
        const isOpen247 = Boolean(openingHoursStr.includes('24/7')) || havenType === 'POLICE_STATION' || havenType === 'FIRE_STATION' || havenType === 'HOSPITAL';

        return {
          id: `osm_${item.type || 'node'}_${item.id || idx}`,
          name,
          type: havenType,
          distance_meters: distMeters,
          is_open_now: isOpen247,
          is_verified_partner: havenType === 'POLICE_STATION' || havenType === 'FIRE_STATION' || havenType === 'HOSPITAL',
          has_security_staff: havenType === 'POLICE_STATION' || havenType === 'FIRE_STATION' || havenType === 'HOSPITAL',
          has_well_lit_entrance: true,
          walk_time_minutes: walkTime,
          address: openingHoursStr ? `${address} (${openingHoursStr})` : address,
          latitude: itemLat,
          longitude: itemLon,
        };
      })
      .filter(Boolean);

    realPlaces.sort((a: any, b: any) => a.distance_meters - b.distance_meters);

    res.json({
      success: true,
      provider: successfulServer,
      count: realPlaces.length,
      places: realPlaces.slice(0, 30),
    });
  } catch (err: any) {
    console.error('Overpass Proxy fatal error:', err);
    res.status(502).json({ success: false, error: err?.message || 'Failed to process nearby places request' });
  }
});

// Health / Status endpoint
safetyApiRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    engine: 'SafeRoute AI Intelligence Core',
    model: 'gemini-3.7-flash',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    functionsCount: 11,
    timestamp: new Date().toISOString(),
  });
});
