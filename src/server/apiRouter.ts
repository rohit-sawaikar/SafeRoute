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
