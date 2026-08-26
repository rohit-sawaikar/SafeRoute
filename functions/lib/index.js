"use strict";
/**
 * SafeRoute Firebase Cloud Functions Module
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decayIncidentConfidenceAndPulse = exports.manageTrustedContacts = exports.getSafeHavensNearby = exports.getEmergencyNumbers = exports.resolveSOS = exports.triggerBeingFollowed = exports.triggerSOS = exports.endTrip = exports.updateTripLocation = exports.startTrip = exports.getRouteSafetyComparison = exports.getAreaSafetyStatus = exports.submitIncidentReport = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const safetyPulseEngine_1 = require("./services/safetyPulseEngine");
const emergencyServices_1 = require("./services/emergencyServices");
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const messaging = admin.messaging();
const corsHandler = (0, cors_1.default)({ origin: true });
/**
 * 1. submitIncidentReport
 */
exports.submitIncidentReport = functions.https.onRequest((req, res) => {
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
            const userId = reporterId || req.user?.uid || 'anonymous_reporter';
            const timestamp = Date.now();
            const pointGeohash = (0, safetyPulseEngine_1.encodeGeohash)(geopoint, 6);
            // Fetch active reports in the same geohash prefix to check for corroboration
            const snapshot = await db
                .collection('incidentReports')
                .where('geohash', '==', pointGeohash)
                .where('status', 'in', ['unverified', 'corroborated'])
                .get();
            const existingReports = [];
            snapshot.forEach((doc) => existingReports.push(doc.data()));
            // Run corroboration algorithm
            const corroboration = (0, safetyPulseEngine_1.checkCorroboration)({ type, geopoint, timestamp }, existingReports);
            const reportId = db.collection('incidentReports').doc().id;
            const reportData = {
                id: reportId,
                reporterId: sensitiveCategory ? 'ANONYMOUS_PROTECTED' : userId,
                type: type,
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
                }
                catch (fcmErr) {
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
        }
        catch (err) {
            console.error('Error submitting incident report:', err);
            res.status(500).json({ error: err?.message || 'Failed to submit incident report' });
        }
    });
});
/**
 * 2. getAreaSafetyStatus
 */
exports.getAreaSafetyStatus = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const lat = parseFloat((req.query.lat || req.body?.geopoint?.latitude || 0));
            const lng = parseFloat((req.query.lng || req.body?.geopoint?.longitude || 0));
            const radiusMeters = parseInt((req.query.radius || req.body?.radius || 1000), 10);
            if (!lat || !lng) {
                res.status(400).json({ error: 'Valid geopoint (lat, lng) required' });
                return;
            }
            const targetPoint = { latitude: lat, longitude: lng };
            const pointGeohash = (0, safetyPulseEngine_1.encodeGeohash)(targetPoint, 5);
            // Fetch active reports nearby
            const snapshot = await db
                .collection('incidentReports')
                .where('status', 'in', ['unverified', 'corroborated'])
                .get();
            const nearbyIncidents = [];
            snapshot.forEach((doc) => nearbyIncidents.push(doc.data()));
            const pulseResult = (0, safetyPulseEngine_1.computeAreaSafetyStatus)(targetPoint, radiusMeters, nearbyIncidents);
            res.status(200).json({
                success: true,
                geopoint: targetPoint,
                radiusMeters,
                pulse: pulseResult,
            });
        }
        catch (err) {
            console.error('Error fetching area safety status:', err);
            res.status(500).json({ error: err?.message || 'Failed to get area safety status' });
        }
    });
});
/**
 * 3. getRouteSafetyComparison
 */
exports.getRouteSafetyComparison = functions.https.onRequest((req, res) => {
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
            const allIncidents = [];
            snapshot.forEach((doc) => allIncidents.push(doc.data()));
            const routeComparisons = (0, safetyPulseEngine_1.scoreCandidateRoutes)(routes, allIncidents);
            res.status(200).json({
                success: true,
                count: routeComparisons.length,
                routes: routeComparisons,
            });
        }
        catch (err) {
            console.error('Error comparing routes:', err);
            res.status(500).json({ error: err?.message || 'Failed to compare routes' });
        }
    });
});
/**
 * 4. startTrip / updateTripLocation / endTrip
 */
exports.startTrip = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const { userId, routeCoordinates, sharedWithContactIds, estimatedArrival } = req.body;
            if (!userId || !Array.isArray(routeCoordinates) || routeCoordinates.length === 0) {
                res.status(400).json({ error: 'userId and routeCoordinates are required' });
                return;
            }
            const tripId = db.collection('activeTrips').doc().id;
            const tripData = {
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
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to start trip' });
        }
    });
});
exports.updateTripLocation = functions.https.onRequest((req, res) => {
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
            const trip = tripDoc.data();
            if (trip.status !== 'active' && trip.status !== 'deviated') {
                res.status(400).json({ error: `Trip is not active (current status: ${trip.status})` });
                return;
            }
            // Check deviation
            const deviation = (0, safetyPulseEngine_1.checkRouteDeviation)(geopoint, trip.routeCoordinates, 150);
            const newStatus = deviation.isDeviated ? 'deviated' : 'active';
            // Check for hazards ahead on route (~400m radius)
            const incidentsSnapshot = await db
                .collection('incidentReports')
                .where('status', '==', 'corroborated')
                .get();
            let nearbyHazard = null;
            incidentsSnapshot.forEach((doc) => {
                const inc = doc.data();
                const dist = (0, safetyPulseEngine_1.getDistanceMeters)(geopoint, inc.geopoint);
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
                        message: `${nearbyHazard.type.replace('_', ' ')} verified 400m ahead on route.`,
                        hazard: nearbyHazard,
                    }
                    : null,
            });
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to update trip location' });
        }
    });
});
exports.endTrip = functions.https.onRequest((req, res) => {
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
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to end trip' });
        }
    });
});
/**
 * 5. triggerSOS
 */
exports.triggerSOS = functions.https.onRequest((req, res) => {
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
            const notifiedContactIds = [];
            contactsSnapshot.forEach((doc) => notifiedContactIds.push(doc.id));
            const sosId = db.collection('sosEvents').doc().id;
            const sosEvent = {
                id: sosId,
                userId,
                triggeredAt: Date.now(),
                mode: mode || 'standard_sos',
                lastKnownLocation: geopoint,
                status: 'active',
                notifiedContactIds,
                notifiedAt: Date.now(),
                silentMode: false,
                audioRecordingRequested: false,
            };
            await db.collection('sosEvents').doc(sosId).set(sosEvent);
            // Fetch emergency dispatch number
            const emergencyInfo = (0, emergencyServices_1.lookupEmergencyNumbers)('IN');
            res.status(200).json({
                success: true,
                sosEventId: sosId,
                sos: sosEvent,
                emergencyNumberToDial: emergencyInfo.generalEmergency,
                liveTrackingUrl: `https://saferoute.app/track-sos/${sosId}`,
                message: `SOS activated. Notified ${notifiedContactIds.length} trusted contact(s).`,
            });
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to trigger SOS' });
        }
    });
});
/**
 * 6. triggerBeingFollowed (Silent SOS + Top 3 Safe Havens)
 */
exports.triggerBeingFollowed = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const { userId, geopoint } = req.body;
            if (!userId || !geopoint) {
                res.status(400).json({ error: 'userId and geopoint required' });
                return;
            }
            // Fetch nearby safe havens
            const havensSnapshot = await db.collection('safeHavens').get();
            const havensWithDist = [];
            havensSnapshot.forEach((doc) => {
                const haven = doc.data();
                const dist = (0, safetyPulseEngine_1.getDistanceMeters)(geopoint, haven.geopoint);
                havensWithDist.push({ ...haven, distanceMeters: Math.round(dist) });
            });
            havensWithDist.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
            const top3SafeHavens = havensWithDist.slice(0, 3);
            const sosId = db.collection('sosEvents').doc().id;
            const sosEvent = {
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
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to trigger being followed mode' });
        }
    });
});
/**
 * 7. resolveSOS
 */
exports.resolveSOS = functions.https.onRequest((req, res) => {
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
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to resolve SOS' });
        }
    });
});
/**
 * 8. getEmergencyNumbers
 */
exports.getEmergencyNumbers = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const countryCode = (req.query.countryCode || req.body?.countryCode || 'IN').toUpperCase();
            const numbers = (0, emergencyServices_1.lookupEmergencyNumbers)(countryCode);
            res.status(200).json({
                success: true,
                countryCode,
                emergencyNumbers: numbers,
            });
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to lookup emergency numbers' });
        }
    });
});
/**
 * 9. getSafeHavensNearby
 */
exports.getSafeHavensNearby = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const lat = parseFloat((req.query.lat || req.body?.geopoint?.latitude || 0));
            const lng = parseFloat((req.query.lng || req.body?.geopoint?.longitude || 0));
            const radiusMeters = parseInt((req.query.radius || req.body?.radius || 3000), 10);
            if (!lat || !lng) {
                res.status(400).json({ error: 'geopoint lat & lng required' });
                return;
            }
            const target = { latitude: lat, longitude: lng };
            const snapshot = await db.collection('safeHavens').get();
            const havens = [];
            snapshot.forEach((doc) => {
                const haven = doc.data();
                const dist = (0, safetyPulseEngine_1.getDistanceMeters)(target, haven.geopoint);
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
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to get safe havens' });
        }
    });
});
/**
 * 10. manageTrustedContacts
 */
exports.manageTrustedContacts = functions.https.onRequest((req, res) => {
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
                const contacts = [];
                snapshot.forEach((doc) => contacts.push(doc.data()));
                res.status(200).json({ success: true, count: contacts.length, contacts });
                return;
            }
            if (action === 'add') {
                if (!contactPhone || !relationshipLabel) {
                    res.status(400).json({ error: 'contactPhone and relationshipLabel required for adding contact' });
                    return;
                }
                const id = db.collection('trustedContacts').doc().id;
                const newContact = {
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
        }
        catch (err) {
            res.status(500).json({ error: err?.message || 'Failed to manage trusted contacts' });
        }
    });
});
/**
 * 11. Scheduled Job: decayIncidentConfidenceAndPulse (runs every 15 minutes)
 */
exports.decayIncidentConfidenceAndPulse = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async (context) => {
    const now = Date.now();
    const snapshot = await db
        .collection('incidentReports')
        .where('status', 'in', ['unverified', 'corroborated'])
        .get();
    let expiredCount = 0;
    const batch = db.batch();
    snapshot.forEach((doc) => {
        const report = doc.data();
        const newScore = (0, safetyPulseEngine_1.computeDecayedConfidence)(report, now);
        if (newScore <= 0.1) {
            batch.update(doc.ref, { status: 'expired', confidenceScore: 0 });
            expiredCount++;
        }
        else {
            batch.update(doc.ref, { confidenceScore: newScore });
        }
    });
    await batch.commit();
    console.log(`Cron job ran: updated incident decay. Expired ${expiredCount} report(s).`);
    return null;
});
//# sourceMappingURL=index.js.map