/**
 * SafeRoute Local Express API Bridge
 * Exposes all 10 SafeRoute Cloud Functions via standard HTTP REST endpoints for fast local testing and hackathon demos.
 */

import { Router } from 'express';
import express from 'express';
import {
  IncidentReport,
  GeoPoint,
  ActiveTrip,
  SOSEvent,
  SafeHaven,
  TrustedContact,
} from '../../functions/src/types';
import {
  encodeGeohash,
  getDistanceMeters,
  checkCorroboration,
  computeAreaSafetyStatus,
  scoreCandidateRoutes,
  checkRouteDeviation,
  computeDecayedConfidence,
} from '../../functions/src/services/safetyPulseEngine';
import { lookupEmergencyNumbers } from '../../functions/src/services/emergencyServices';

export const firebaseBridgeRouter = Router();
firebaseBridgeRouter.use(express.json());

// In-Memory Data Store for express standalone mode (pre-seeded with demo data)
const dbMemory = {
  incidents: [
    {
      id: 'inc_demo_1',
      reporterId: 'ANONYMOUS_PROTECTED',
      type: 'harassment',
      geopoint: { latitude: 28.6139, longitude: 77.209 },
      geohash: 'ttnf2',
      description: 'Poor lighting near alley behind Metro exit',
      timestamp: Date.now() - 25 * 60 * 1000, // 25m ago
      corroborationCount: 3,
      confidenceScore: 0.92,
      status: 'corroborated',
      sensitiveCategory: true,
    },
    {
      id: 'inc_demo_2',
      reporterId: 'user_456',
      type: 'streetlight_failure',
      geopoint: { latitude: 28.6152, longitude: 77.211 },
      geohash: 'ttnf2',
      description: '3 consecutive streetlights powered down along main walkway',
      timestamp: Date.now() - 40 * 60 * 1000,
      corroborationCount: 2,
      confidenceScore: 0.88,
      status: 'corroborated',
      sensitiveCategory: false,
    },
    {
      id: 'inc_demo_3',
      reporterId: 'user_789',
      type: 'road_blockage',
      geopoint: { latitude: 28.618, longitude: 77.215 },
      geohash: 'ttnf3',
      description: 'Construction debris blocking pedestrian sidewalk',
      timestamp: Date.now() - 10 * 60 * 1000,
      corroborationCount: 1,
      confidenceScore: 0.45,
      status: 'unverified',
      sensitiveCategory: false,
    },
  ] as IncidentReport[],

  safeHavens: [
    {
      id: 'haven_1',
      name: 'Apollo Pharmacy (24/7)',
      address: 'Block B, Connaught Place, New Delhi',
      geopoint: { latitude: 28.6145, longitude: 77.2095 },
      geohash: 'ttnf2',
      category: 'pharmacy',
      verifiedStatus: true,
      hoursOpen: '24/7',
      phone: '+91 11 2341 5678',
    },
    {
      id: 'haven_2',
      name: 'Central Police Assistance Booth',
      address: 'Outer Circle, Near Metro Gate 2',
      geopoint: { latitude: 28.6132, longitude: 77.208 },
      geohash: 'ttnf2',
      category: 'police_station',
      verifiedStatus: true,
      hoursOpen: '24/7',
      phone: '100',
    },
    {
      id: 'haven_3',
      name: 'Starbucks Safe Space Partner',
      address: 'Inner Circle, F-Block',
      geopoint: { latitude: 28.616, longitude: 77.212 },
      geohash: 'ttnf2',
      category: 'cafe',
      verifiedStatus: true,
      hoursOpen: '07:00 - 23:00',
      phone: '+91 11 4567 8900',
    },
  ] as SafeHaven[],

  activeTrips: {} as Record<string, ActiveTrip>,
  sosEvents: {} as Record<string, SOSEvent>,
  trustedContacts: [
    {
      id: 'tc_1',
      userId: 'user_demo',
      contactPhone: '+91 98765 43210',
      relationshipLabel: 'Sister',
      permissionLevel: 'full_sos_alerts',
      status: 'accepted',
      createdAt: Date.now() - 86400000,
    },
  ] as TrustedContact[],
};

// 1. Submit Incident Report
firebaseBridgeRouter.post('/submit-report', (req, res) => {
  try {
    const { type, geopoint, description, sensitiveCategory, reporterId } = req.body;
    if (!type || !geopoint) {
      return res.status(400).json({ error: 'type and geopoint are required' });
    }

    const timestamp = Date.now();
    const pointGeohash = encodeGeohash(geopoint, 6);

    const corroboration = checkCorroboration(
      { type, geopoint, timestamp },
      dbMemory.incidents
    );

    const reportId = `report_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newReport: IncidentReport = {
      id: reportId,
      reporterId: sensitiveCategory ? 'ANONYMOUS_PROTECTED' : reporterId || 'demo_user',
      type,
      geopoint,
      geohash: pointGeohash,
      description: description || '',
      timestamp,
      corroborationCount: corroboration.corroborationCount,
      confidenceScore: corroboration.confidenceScore,
      status: corroboration.isCorroborated ? 'corroborated' : 'unverified',
      sensitiveCategory: Boolean(sensitiveCategory || type === 'harassment'),
    };

    dbMemory.incidents.unshift(newReport);

    res.json({
      success: true,
      report: newReport,
      message: corroboration.isCorroborated
        ? 'Report submitted & corroborated by nearby reports!'
        : 'Report submitted. Waiting for community corroboration.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to submit report' });
  }
});

// 2. Get Area Safety Status
firebaseBridgeRouter.all('/area-status', (req, res) => {
  try {
    const lat = parseFloat((req.query.lat || req.body?.geopoint?.latitude || 28.6139) as string);
    const lng = parseFloat((req.query.lng || req.body?.geopoint?.longitude || 77.209) as string);
    const radiusMeters = parseInt((req.query.radius || req.body?.radius || 1000) as string, 10);

    const targetPoint: GeoPoint = { latitude: lat, longitude: lng };
    const pulse = computeAreaSafetyStatus(targetPoint, radiusMeters, dbMemory.incidents);

    res.json({
      success: true,
      geopoint: targetPoint,
      radiusMeters,
      pulse,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get area safety status' });
  }
});

// 3. Get Route Safety Comparison
firebaseBridgeRouter.post('/route-comparison', (req, res) => {
  try {
    const { routes } = req.body;
    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'routes array required' });
    }

    const scoredRoutes = scoreCandidateRoutes(routes, dbMemory.incidents);
    res.json({
      success: true,
      count: scoredRoutes.length,
      routes: scoredRoutes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to compare routes' });
  }
});

// 4. Start Trip / Update Trip / End Trip
firebaseBridgeRouter.post('/start-trip', (req, res) => {
  try {
    const { userId, routeCoordinates, sharedWithContactIds, estimatedArrival } = req.body;
    const tripId = `trip_${Date.now()}`;
    const trip: ActiveTrip = {
      id: tripId,
      userId: userId || 'user_demo',
      routeCoordinates: routeCoordinates || [],
      startTime: Date.now(),
      estimatedArrival: estimatedArrival || Date.now() + 25 * 60 * 1000,
      status: 'active',
      sharedWithContactIds: sharedWithContactIds || ['tc_1'],
      currentLocation: routeCoordinates?.[0] || { latitude: 28.6139, longitude: 77.209 },
      lastLocationUpdate: Date.now(),
    };

    dbMemory.activeTrips[tripId] = trip;
    res.json({ success: true, tripId, trip });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to start trip' });
  }
});

firebaseBridgeRouter.post('/update-trip-location', (req, res) => {
  try {
    const { tripId, geopoint } = req.body;
    if (!tripId || !geopoint) {
      return res.status(400).json({ error: 'tripId and geopoint required' });
    }

    const trip = dbMemory.activeTrips[tripId];
    if (!trip) {
      return res.status(404).json({ error: 'Active trip not found' });
    }

    const deviation = checkRouteDeviation(geopoint, trip.routeCoordinates, 150);
    trip.currentLocation = geopoint;
    trip.lastLocationUpdate = Date.now();
    trip.status = deviation.isDeviated ? 'deviated' : 'active';

    // Find nearby hazard
    const hazard = dbMemory.incidents.find(
      (inc) => inc.status === 'corroborated' && getDistanceMeters(geopoint, inc.geopoint) <= 400
    );

    res.json({
      success: true,
      tripId,
      status: trip.status,
      deviation,
      hazardAlert: hazard
        ? {
            alertTitle: 'Hazard Ahead Detected',
            message: `${hazard.type.replace('_', ' ')} reported 400m ahead`,
            hazard,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update location' });
  }
});

firebaseBridgeRouter.post('/end-trip', (req, res) => {
  try {
    const { tripId } = req.body;
    if (dbMemory.activeTrips[tripId]) {
      dbMemory.activeTrips[tripId].status = 'completed';
    }
    res.json({ success: true, tripId, status: 'completed' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to end trip' });
  }
});

// 5. Trigger SOS
firebaseBridgeRouter.post('/trigger-sos', (req, res) => {
  try {
    const { userId, mode, geopoint } = req.body;
    const sosId = `sos_${Date.now()}`;
    const sos: SOSEvent = {
      id: sosId,
      userId: userId || 'user_demo',
      triggeredAt: Date.now(),
      mode: mode || 'standard_sos',
      lastKnownLocation: geopoint || { latitude: 28.6139, longitude: 77.209 },
      status: 'active',
      notifiedContactIds: ['tc_1'],
      notifiedAt: Date.now(),
      silentMode: false,
      audioRecordingRequested: false,
    };

    dbMemory.sosEvents[sosId] = sos;
    const emergencyInfo = lookupEmergencyNumbers('IN');

    res.json({
      success: true,
      sosEventId: sosId,
      sos,
      emergencyNumberToDial: emergencyInfo.generalEmergency,
      liveTrackingUrl: `https://saferoute.app/track-sos/${sosId}`,
      message: 'SOS triggered! Emergency services dialed & trusted contacts notified.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to trigger SOS' });
  }
});

// 6. Trigger Being Followed (Silent SOS + Top 3 Safe Havens)
firebaseBridgeRouter.post('/being-followed', (req, res) => {
  try {
    const { userId, geopoint } = req.body;
    const targetPoint: GeoPoint = geopoint || { latitude: 28.6139, longitude: 77.209 };

    const sortedHavens = [...dbMemory.safeHavens]
      .map((h) => ({ ...h, distanceMeters: Math.round(getDistanceMeters(targetPoint, h.geopoint)) }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3);

    const sosId = `sos_silent_${Date.now()}`;
    const sos: SOSEvent = {
      id: sosId,
      userId: userId || 'user_demo',
      triggeredAt: Date.now(),
      mode: 'being_followed',
      lastKnownLocation: targetPoint,
      status: 'active',
      notifiedContactIds: ['tc_1'],
      notifiedAt: Date.now(),
      silentMode: true,
      audioRecordingRequested: true,
    };

    dbMemory.sosEvents[sosId] = sos;

    res.json({
      success: true,
      sosEventId: sosId,
      silentMode: true,
      audioRecordingRequested: true,
      top3SafeHavens: sortedHavens,
      message: 'Silent "Being Followed" mode engaged. Audio clip recording & live tracking active.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to trigger being followed mode' });
  }
});

// 7. Resolve SOS
firebaseBridgeRouter.post('/resolve-sos', (req, res) => {
  try {
    const { sosEventId, outcome } = req.body;
    if (dbMemory.sosEvents[sosEventId]) {
      dbMemory.sosEvents[sosEventId].status = 'resolved';
    }
    res.json({
      success: true,
      sosEventId,
      status: 'resolved',
      message: 'SOS resolved safely.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to resolve SOS' });
  }
});

// 8. Get Emergency Numbers
firebaseBridgeRouter.all('/emergency-numbers', (req, res) => {
  try {
    const countryCode = ((req.query.countryCode || req.body?.countryCode || 'IN') as string).toUpperCase();
    const numbers = lookupEmergencyNumbers(countryCode);
    res.json({ success: true, countryCode, emergencyNumbers: numbers });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to lookup emergency numbers' });
  }
});

// 9. Get Safe Havens Nearby
firebaseBridgeRouter.all('/safe-havens', (req, res) => {
  try {
    const lat = parseFloat((req.query.lat || req.body?.geopoint?.latitude || 28.6139) as string);
    const lng = parseFloat((req.query.lng || req.body?.geopoint?.longitude || 77.209) as string);

    const target: GeoPoint = { latitude: lat, longitude: lng };
    const havensWithDist = dbMemory.safeHavens.map((h) => ({
      ...h,
      distanceMeters: Math.round(getDistanceMeters(target, h.geopoint)),
    }));
    havensWithDist.sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({ success: true, count: havensWithDist.length, safeHavens: havensWithDist });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get safe havens' });
  }
});

// 10. Manage Trusted Contacts
firebaseBridgeRouter.post('/trusted-contacts', (req, res) => {
  try {
    const { action, userId, contactPhone, relationshipLabel, permissionLevel, contactId } = req.body;

    if (action === 'list') {
      return res.json({ success: true, count: dbMemory.trustedContacts.length, contacts: dbMemory.trustedContacts });
    }

    if (action === 'add') {
      const newContact: TrustedContact = {
        id: `tc_${Date.now()}`,
        userId: userId || 'user_demo',
        contactPhone: contactPhone || '+91 98765 00000',
        relationshipLabel: relationshipLabel || 'Contact',
        permissionLevel: permissionLevel || 'full_sos_alerts',
        status: 'pending',
        createdAt: Date.now(),
      };
      dbMemory.trustedContacts.push(newContact);
      return res.json({ success: true, contact: newContact });
    }

    if (action === 'accept' && contactId) {
      const match = dbMemory.trustedContacts.find((c) => c.id === contactId);
      if (match) match.status = 'accepted';
      return res.json({ success: true, contactId, status: 'accepted' });
    }

    res.json({ success: true, message: 'Action executed' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to manage trusted contacts' });
  }
});
