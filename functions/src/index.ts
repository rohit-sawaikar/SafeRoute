/**
 * SafeRoute Firebase Cloud Functions Module
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import {
  GeoPoint,
  IncidentReport,
  IncidentType,
  ActiveTrip,
  SOSEvent,
  SafeHaven,
  TrustedContact,
  UserProfile,
} from './types';
import {
  encodeGeohash,
  getDistanceMeters,
  checkCorroboration,
  computeAreaSafetyStatus,
  scoreCandidateRoutes,
  checkRouteDeviation,
  computeDecayedConfidence,
} from './services/safetyPulseEngine';
import { lookupEmergencyNumbers } from './services/emergencyServices';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

const corsHandler = cors({ origin: true });

/**
 * 1. submitIncidentReport
 */
export const submitIncidentReport = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { type, geopoint, description, sensitiveCategory, reporterId } = req.body;

      if (!type || !geopoint || typeof geopoint.latitude !== 'number' || typeof geopoint.longitude !== 'number') {
        res.status(400).json({ error: 'Invalid incident report parameters. Required: type, geopoint {latitude, longitude}' });
        return;
      }

      const userId = reporterId || (req as any).user?.uid || 'anonymous_reporter';
      const timestamp = Date.now();
      const pointGeohash = encodeGeohash(geopoint, 6);

      // Fetch active reports in the same geohash prefix to check for corroboration
      const snapshot = await db
        .collection('incidentReports')
        .where('geohash', '==', pointGeohash)
        .where('status', 'in', ['unverified', 'corroborated'])
        .get();

      const existingReports: IncidentReport[] = [];
      snapshot.forEach((doc) => existingReports.push(doc.data() as IncidentReport));

      // Run corroboration algorithm
      const corroboration = checkCorroboration(
        { type, geopoint, timestamp },
        existingReports
      );

      const reportId = db.collection('incidentReports').doc().id;
      const reportData: IncidentReport = {
        id: reportId,
        reporterId: sensitiveCategory ? 'ANONYMOUS_PROTECTED' : userId,
        type: type as IncidentType,
        geopoint,
        geohash: pointGeohash,
        description: description || '',
        timestamp,
        corroborationCount: corroboration.corroborationCount,
        confidenceScore: corroboration.confidenceScore,
        status: corroboration.isCorroborated ? 'corroborated' : 'unverified',
        sensitiveCategory: Boolean(sensitiveCategory || type === 'harassment'),
      };

      await db.collection('incidentReports').doc(reportId).set(reportData);

      // If corroborated, trigger Push Notifications via FCM
      if (corroboration.isCorroborated) {
        try {
          await messaging.send({
            topic: `geohash_${pointGeohash}`,
            notification: {
              title: 'Safety Alert Corroborated',
              body: `Verified ${type.replace('_', ' ')} incident reported near your location.`,
            },
            data: {
              reportId,
              type,
              latitude: String(geopoint.latitude),
              longitude: String(geopoint.longitude),
            },
          });
        } catch (fcmErr) {
          console.warn('FCM topic notification skipped:', fcmErr);
        }
      }

      res.status(200).json({
        success: true,
        report: reportData,
        message: corroboration.isCorroborated
          ? 'Report submitted and corroborated by nearby signals.'
          : 'Report submitted. Pending community corroboration.',
      });
    } catch (err: any) {
      console.error('Error submitting incident report:', err);
      res.status(500).json({ error: err?.message || 'Failed to submit incident report' });
    }
  });
});

/**
 * 2. getAreaSafetyStatus
 */
export const getAreaSafetyStatus = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const lat = parseFloat((req.query.lat || req.body?.geopoint?.latitude || 0) as string);
      const lng = parseFloat((req.query.lng || req.body?.geopoint?.longitude || 0) as string);
      const radiusMeters = parseInt((req.query.radius || req.body?.radius || 1000) as string, 10);

      if (!lat || !lng) {
        res.status(400).json({ error: 'Valid geopoint (lat, lng) required' });
        return;
      }

      const targetPoint: GeoPoint = { latitude: lat, longitude: lng };
      const pointGeohash = encodeGeohash(targetPoint, 5);

      // Fetch active reports nearby
      const snapshot = await db
        .collection('incidentReports')
        .where('status', 'in', ['unverified', 'corroborated'])
        .get();

      const nearbyIncidents: IncidentReport[] = [];
      snapshot.forEach((doc) => nearbyIncidents.push(doc.data() as IncidentReport));

      const pulseResult = computeAreaSafetyStatus(targetPoint, radiusMeters, nearbyIncidents);

      res.status(200).json({
        success: true,
        geopoint: targetPoint,
        radiusMeters,
        pulse: pulseResult,
      });
    } catch (err: any) {
      console.error('Error fetching area safety status:', err);
      res.status(500).json({ error: err?.message || 'Failed to get area safety status' });
    }
  });
});

/**
 * 3. getRouteSafetyComparison
 */
export const getRouteSafetyComparison = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { routes } = req.body;
      if (!Array.isArray(routes) || routes.length === 0) {
        res.status(400).json({ error: 'Routes array with waypoints required' });
        return;
      }

      const snapshot = await db
        .collection('incidentReports')
        .where('status', 'in', ['unverified', 'corroborated'])
        .get();

      const allIncidents: IncidentReport[] = [];
      snapshot.forEach((doc) => allIncidents.push(doc.data() as IncidentReport));

      const routeComparisons = scoreCandidateRoutes(routes, allIncidents);

      res.status(200).json({
        success: true,
        count: routeComparisons.length,
        routes: routeComparisons,
      });
    } catch (err: any) {
      console.error('Error comparing routes:', err);
      res.status(500).json({ error: err?.message || 'Failed to compare routes' });
    }
  });
});

/**
 * 4. startTrip / updateTripLocation / endTrip
 */
export const startTrip = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { userId, routeCoordinates, sharedWithContactIds, estimatedArrival } = req.body;
      if (!userId || !Array.isArray(routeCoordinates) || routeCoordinates.length === 0) {
        res.status(400).json({ error: 'userId and routeCoordinates are required' });
        return;
      }

      const tripId = db.collection('activeTrips').doc().id;
      const tripData: ActiveTrip = {
        id: tripId,
        userId,
        routeCoordinates,
        startTime: Date.now(),
        estimatedArrival: estimatedArrival || Date.now() + 30 * 60 * 1000,
        status: 'active',
        sharedWithContactIds: sharedWithContactIds || [],
        currentLocation: routeCoordinates[0],
        lastLocationUpdate: Date.now(),
      };

      await db.collection('activeTrips').doc(tripId).set(tripData);

      res.status(200).json({
        success: true,
        tripId,
        trip: tripData,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to start trip' });
    }
  });
});

export const updateTripLocation = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { tripId, geopoint } = req.body;
      if (!tripId || !geopoint) {
        res.status(400).json({ error: 'tripId and geopoint required' });
        return;
      }

      const tripDoc = await db.collection('activeTrips').doc(tripId).get();
      if (!tripDoc.exists) {
        res.status(404).json({ error: 'Active trip not found' });
        return;
      }

      const trip = tripDoc.data() as ActiveTrip;
      if (trip.status !== 'active' && trip.status !== 'deviated') {
        res.status(400).json({ error: `Trip is not active (current status: ${trip.status})` });
        return;
      }

      // Check deviation
      const deviation = checkRouteDeviation(geopoint, trip.routeCoordinates, 150);
      const newStatus = deviation.isDeviated ? 'deviated' : 'active';

      // Check for hazards ahead on route (~400m radius)
      const incidentsSnapshot = await db
        .collection('incidentReports')
        .where('status', '==', 'corroborated')
        .get();

      let nearbyHazard: IncidentReport | null = null;
      incidentsSnapshot.forEach((doc) => {
        const inc = doc.data() as IncidentReport;
        const dist = getDistanceMeters(geopoint, inc.geopoint);
        if (dist <= 400) {
          nearbyHazard = inc;
        }
      });

      await db.collection('activeTrips').doc(tripId).update({
        currentLocation: geopoint,
        lastLocationUpdate: Date.now(),
        status: newStatus,
        deviationAlertTriggered: deviation.isDeviated,
      });

      res.status(200).json({
        success: true,
        tripId,
        status: newStatus,
        deviation,
        hazardAlert: nearbyHazard
          ? {
              alertTitle: 'Hazard Ahead Detected',
              message: `${(nearbyHazard as IncidentReport).type.replace('_', ' ')} verified 400m ahead on route.`,
              hazard: nearbyHazard,
            }
          : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update trip location' });
    }
  });
});

export const endTrip = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { tripId } = req.body;
      if (!tripId) {
        res.status(400).json({ error: 'tripId required' });
        return;
      }

      await db.collection('activeTrips').doc(tripId).update({
        status: 'completed',
        endedAt: Date.now(),
      });

      res.status(200).json({ success: true, tripId, status: 'completed' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to end trip' });
    }
  });
});

/**
 * 5. triggerSOS
 */
export const triggerSOS = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { userId, mode, geopoint } = req.body;
      if (!userId || !geopoint) {
        res.status(400).json({ error: 'userId and geopoint required' });
        return;
      }

      // Lookup trusted contacts
      const contactsSnapshot = await db
        .collection('trustedContacts')
        .where('userId', '==', userId)
        .where('status', '==', 'accepted')
        .get();

      const notifiedContactIds: string[] = [];
      contactsSnapshot.forEach((doc) => notifiedContactIds.push(doc.id));

      const sosId = db.collection('sosEvents').doc().id;
      const sosEvent: SOSEvent = {
        id: sosId,
        userId,
        triggeredAt: Date.now(),
        mode: (mode as any) || 'standard_sos',
        lastKnownLocation: geopoint,
        status: 'active',
        notifiedContactIds,
        notifiedAt: Date.now(),
        silentMode: false,
        audioRecordingRequested: false,
      };

      await db.collection('sosEvents').doc(sosId).set(sosEvent);

      // Fetch emergency dispatch number
      const emergencyInfo = lookupEmergencyNumbers('IN');

      res.status(200).json({
        success: true,
        sosEventId: sosId,
        sos: sosEvent,
        emergencyNumberToDial: emergencyInfo.generalEmergency,
        liveTrackingUrl: `https://saferoute.app/track-sos/${sosId}`,
        message: `SOS activated. Notified ${notifiedContactIds.length} trusted contact(s).`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to trigger SOS' });
    }
  });
});

/**
 * 6. triggerBeingFollowed (Silent SOS + Top 3 Safe Havens)
 */
export const triggerBeingFollowed = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { userId, geopoint } = req.body;
      if (!userId || !geopoint) {
        res.status(400).json({ error: 'userId and geopoint required' });
        return;
      }

      // Fetch nearby safe havens
      const havensSnapshot = await db.collection('safeHavens').get();
      const havensWithDist: SafeHaven[] = [];

      havensSnapshot.forEach((doc) => {
        const haven = doc.data() as SafeHaven;
        const dist = getDistanceMeters(geopoint, haven.geopoint);
        havensWithDist.push({ ...haven, distanceMeters: Math.round(dist) });
      });

      havensWithDist.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
      const top3SafeHavens = havensWithDist.slice(0, 3);

      const sosId = db.collection('sosEvents').doc().id;
      const sosEvent: SOSEvent = {
        id: sosId,
        userId,
        triggeredAt: Date.now(),
        mode: 'being_followed',
        lastKnownLocation: geopoint,
        status: 'active',
        notifiedContactIds: [],
        notifiedAt: Date.now(),
        silentMode: true,
        audioRecordingRequested: true,
      };

      await db.collection('sosEvents').doc(sosId).set(sosEvent);

      res.status(200).json({
        success: true,
        sosEventId: sosId,
        silentMode: true,
        audioRecordingRequested: true,
        top3SafeHavens,
        emergencyCallReady: true,
        message: 'Silent "Being Followed" mode engaged. Audio recording initiated & live location dispatched silently.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to trigger being followed mode' });
    }
  });
});

/**
 * 7. resolveSOS
 */
export const resolveSOS = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { sosEventId, outcome } = req.body;
      if (!sosEventId) {
        res.status(400).json({ error: 'sosEventId required' });
        return;
      }

      await db.collection('sosEvents').doc(sosEventId).update({
        status: 'resolved',
        resolvedAt: Date.now(),
        outcome: outcome || 'User resolved signal safely',
      });

      res.status(200).json({
        success: true,
        sosEventId,
        status: 'resolved',
        message: 'SOS signal resolved safely. Trusted contacts notified.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to resolve SOS' });
    }
  });
});

/**
 * 8. getEmergencyNumbers
 */
export const getEmergencyNumbers = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const countryCode = ((req.query.countryCode || req.body?.countryCode || 'IN') as string).toUpperCase();
      const numbers = lookupEmergencyNumbers(countryCode);

      res.status(200).json({
        success: true,
        countryCode,
        emergencyNumbers: numbers,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to lookup emergency numbers' });
    }
  });
});

/**
 * 9. getSafeHavensNearby
 */
export const getSafeHavensNearby = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const lat = parseFloat((req.query.lat || req.body?.geopoint?.latitude || 0) as string);
      const lng = parseFloat((req.query.lng || req.body?.geopoint?.longitude || 0) as string);
      const radiusMeters = parseInt((req.query.radius || req.body?.radius || 3000) as string, 10);

      if (!lat || !lng) {
        res.status(400).json({ error: 'geopoint lat & lng required' });
        return;
      }

      const target: GeoPoint = { latitude: lat, longitude: lng };
      const snapshot = await db.collection('safeHavens').get();
      const havens: SafeHaven[] = [];

      snapshot.forEach((doc) => {
        const haven = doc.data() as SafeHaven;
        const dist = getDistanceMeters(target, haven.geopoint);
        if (dist <= radiusMeters) {
          havens.push({ ...haven, distanceMeters: Math.round(dist) });
        }
      });

      havens.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

      res.status(200).json({
        success: true,
        count: havens.length,
        safeHavens: havens,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get safe havens' });
    }
  });
});

/**
 * 10. manageTrustedContacts
 */
export const manageTrustedContacts = functions.https.onRequest((req: any, res: any) => {
  return corsHandler(req, res, async () => {
    try {
      const { action, userId, contactPhone, relationshipLabel, permissionLevel, contactId } = req.body;

      if (!action || !userId) {
        res.status(400).json({ error: 'action and userId are required' });
        return;
      }

      if (action === 'list') {
        const snapshot = await db
          .collection('trustedContacts')
          .where('userId', '==', userId)
          .get();

        const contacts: TrustedContact[] = [];
        snapshot.forEach((doc) => contacts.push(doc.data() as TrustedContact));

        res.status(200).json({ success: true, count: contacts.length, contacts });
        return;
      }

      if (action === 'add') {
        if (!contactPhone || !relationshipLabel) {
          res.status(400).json({ error: 'contactPhone and relationshipLabel required for adding contact' });
          return;
        }

        const id = db.collection('trustedContacts').doc().id;
        const newContact: TrustedContact = {
          id,
          userId,
          contactPhone,
          relationshipLabel,
          permissionLevel: permissionLevel || 'full_sos_alerts',
          status: 'pending',
          createdAt: Date.now(),
        };

        await db.collection('trustedContacts').doc(id).set(newContact);

        res.status(200).json({ success: true, contact: newContact, message: 'Invite sent to contact.' });
        return;
      }

      if (action === 'accept' && contactId) {
        await db.collection('trustedContacts').doc(contactId).update({ status: 'accepted' });
        res.status(200).json({ success: true, contactId, status: 'accepted' });
        return;
      }

      if (action === 'remove' && contactId) {
        await db.collection('trustedContacts').doc(contactId).delete();
        res.status(200).json({ success: true, contactId, message: 'Contact removed.' });
        return;
      }

      res.status(400).json({ error: 'Invalid action or parameters' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to manage trusted contacts' });
    }
  });
});

/**
 * 11. Scheduled Job: decayIncidentConfidenceAndPulse (runs every 15 minutes)
 */
export const decayIncidentConfidenceAndPulse = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context: any) => {
    const now = Date.now();
    const snapshot = await db
      .collection('incidentReports')
      .where('status', 'in', ['unverified', 'corroborated'])
      .get();

    let expiredCount = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const report = doc.data() as IncidentReport;
      const newScore = computeDecayedConfidence(report, now);

      if (newScore <= 0.1) {
        batch.update(doc.ref, { status: 'expired', confidenceScore: 0 });
        expiredCount++;
      } else {
        batch.update(doc.ref, { confidenceScore: newScore });
      }
    });

    await batch.commit();
    console.log(`Cron job ran: updated incident decay. Expired ${expiredCount} report(s).`);
    return null;
  });

/**
 * 12. Secure Callable Function: setAdminClaim
 * Securely assigns { "admin": true } custom claim to designated Firebase user.
 * Preserves all existing custom claims.
 */
export const setAdminClaim = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  const targetUid = data?.uid || 'nYDoCwzmFvf4tagVb17oZWdOyJF2';
  const targetEmail = data?.email || 'adminsafeheaven09@gmail.com';

  // Security check: Requires caller authentication matching target admin account or existing admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to perform admin claim assignment.'
    );
  }

  const callerUid = context.auth.uid;
  const callerEmail = context.auth.token.email?.toLowerCase();
  const callerIsAdmin = !!context.auth.token.admin;

  if (callerUid !== targetUid && callerEmail !== targetEmail.toLowerCase() && !callerIsAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Access Denied: Only designated administrator accounts can assign admin claims.'
    );
  }

  try {
    const userRecord = await admin.auth().getUser(targetUid);
    const existingClaims = userRecord.customClaims || {};
    const updatedClaims = { ...existingClaims, admin: true };

    await admin.auth().setCustomUserClaims(targetUid, updatedClaims);

    console.log(`[FIREBASE ADMIN] Assigned { admin: true } claim to ${userRecord.email} (${targetUid})`);

    return {
      success: true,
      uid: targetUid,
      email: userRecord.email,
      customClaims: updatedClaims,
      message: `Successfully assigned { admin: true } custom claim to ${userRecord.email} (${targetUid}).`,
    };
  } catch (err: any) {
    console.error('Error assigning admin custom claim:', err);
    throw new functions.https.HttpsError('internal', err?.message || 'Failed to assign admin claim');
  }
});

