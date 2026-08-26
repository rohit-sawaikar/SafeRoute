/**
 * SafeRoute Mock Data Seeder Script for Hackathon Demos
 *
 * Usage:
 *   npx tsx scripts/seedMockData.ts
 *
 * Populates sample incidents, safe havens, demo users, and active trips.
 */

import admin from '../functions/node_modules/firebase-admin/lib/index.js';
import {
  IncidentReport,
  SafeHaven,
  UserProfile,
  TrustedContact,
} from '../functions/src/types';
import { encodeGeohash } from '../functions/src/services/safetyPulseEngine';

// Sample coordinates centered around Delhi NCR / Connaught Place (demo area)
const CENTER_LAT = 28.6139;
const CENTER_LNG = 77.209;

const SAMPLE_USERS: UserProfile[] = [
  {
    uid: 'user_priya_01',
    displayName: 'Priya Sharma',
    phone: '+91 98765 11111',
    homeCountryCode: 'IN',
    createdAt: Date.now() - 30 * 86400000,
    privacySettings: { discreetMode: true },
  },
  {
    uid: 'user_rohit_02',
    displayName: 'Rohit Verma',
    phone: '+91 98765 22222',
    homeCountryCode: 'IN',
    createdAt: Date.now() - 60 * 86400000,
    privacySettings: { discreetMode: false },
  },
];

const SAMPLE_INCIDENTS: Partial<IncidentReport>[] = [
  {
    type: 'harassment',
    geopoint: { latitude: CENTER_LAT + 0.001, longitude: CENTER_LNG - 0.001 },
    description: 'Catcalling and suspicious group near Metro Gate 3 entrance',
    corroborationCount: 3,
    confidenceScore: 0.94,
    status: 'corroborated',
    sensitiveCategory: true,
  },
  {
    type: 'streetlight_failure',
    geopoint: { latitude: CENTER_LAT - 0.002, longitude: CENTER_LNG + 0.001 },
    description: 'Entire dark stretch along Kasturba Gandhi Marg lane',
    corroborationCount: 2,
    confidenceScore: 0.88,
    status: 'corroborated',
    sensitiveCategory: false,
  },
  {
    type: 'suspicious_activity',
    geopoint: { latitude: CENTER_LAT + 0.003, longitude: CENTER_LNG + 0.002 },
    description: 'Unattended parked vehicle blocking pedestrian passage',
    corroborationCount: 1,
    confidenceScore: 0.5,
    status: 'unverified',
    sensitiveCategory: false,
  },
  {
    type: 'road_blockage',
    geopoint: { latitude: CENTER_LAT - 0.003, longitude: CENTER_LNG - 0.002 },
    description: 'Roadwork excavation lacking safety barriers or lights',
    corroborationCount: 4,
    confidenceScore: 0.98,
    status: 'corroborated',
    sensitiveCategory: false,
  },
];

const SAMPLE_SAFE_HAVENS: Partial<SafeHaven>[] = [
  {
    name: 'Apollo 24/7 Pharmacy & First Aid',
    address: 'Block B, Connaught Place, New Delhi',
    geopoint: { latitude: CENTER_LAT + 0.0005, longitude: CENTER_LNG - 0.0005 },
    category: 'pharmacy',
    verifiedStatus: true,
    hoursOpen: '24/7',
    phone: '+91 11 2341 5678',
  },
  {
    name: 'Police Emergency Help Booth #4',
    address: 'Outer Circle, Near Rajiv Chowk Metro',
    geopoint: { latitude: CENTER_LAT - 0.001, longitude: CENTER_LNG - 0.001 },
    category: 'police_station',
    verifiedStatus: true,
    hoursOpen: '24/7',
    phone: '100',
  },
  {
    name: 'Café Coffee Day - Verified Safe Haven',
    address: 'Inner Circle, F-Block, CP',
    geopoint: { latitude: CENTER_LAT + 0.002, longitude: CENTER_LNG + 0.001 },
    category: 'cafe',
    verifiedStatus: true,
    hoursOpen: '08:00 - 23:30',
    phone: '+91 11 4321 8765',
  },
  {
    name: 'HP Petrol Pump Safe Spot',
    address: 'Janpath Road Crossing',
    geopoint: { latitude: CENTER_LAT - 0.0025, longitude: CENTER_LNG + 0.002 },
    category: 'gas_station',
    verifiedStatus: true,
    hoursOpen: '24/7',
    phone: '+91 11 2332 9999',
  },
];

export async function seedMockData() {
  console.log('🌱 Starting SafeRoute Mock Data Seeding...');

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GCP_PROJECT || 'saferoute-demo',
      });
    }

    const db = admin.firestore();

    // 1. Seed Users
    for (const u of SAMPLE_USERS) {
      await db.collection('users').doc(u.uid).set(u);
      console.log(`  ✓ User seeded: ${u.displayName}`);
    }

    // 2. Seed Incidents
    for (const inc of SAMPLE_INCIDENTS) {
      const id = db.collection('incidentReports').doc().id;
      const gHash = encodeGeohash(inc.geopoint!, 6);
      const fullReport: IncidentReport = {
        id,
        reporterId: inc.sensitiveCategory ? 'ANONYMOUS_PROTECTED' : 'user_priya_01',
        type: inc.type!,
        geopoint: inc.geopoint!,
        geohash: gHash,
        description: inc.description || '',
        timestamp: Date.now() - Math.floor(Math.random() * 60) * 60000,
        corroborationCount: inc.corroborationCount || 1,
        confidenceScore: inc.confidenceScore || 0.8,
        status: inc.status || 'corroborated',
        sensitiveCategory: Boolean(inc.sensitiveCategory),
      };
      await db.collection('incidentReports').doc(id).set(fullReport);
      console.log(`  ✓ Incident seeded: ${inc.type} (${gHash})`);
    }

    // 3. Seed Safe Havens
    for (const haven of SAMPLE_SAFE_HAVENS) {
      const id = db.collection('safeHavens').doc().id;
      const gHash = encodeGeohash(haven.geopoint!, 6);
      const fullHaven: SafeHaven = {
        id,
        name: haven.name!,
        address: haven.address!,
        geopoint: haven.geopoint!,
        geohash: gHash,
        category: haven.category!,
        verifiedStatus: haven.verifiedStatus!,
        hoursOpen: haven.hoursOpen!,
        phone: haven.phone,
      };
      await db.collection('safeHavens').doc(id).set(fullHaven);
      console.log(`  ✓ Safe Haven seeded: ${haven.name}`);
    }

    // 4. Seed Trusted Contacts
    const tc: TrustedContact = {
      id: 'tc_demo_priya',
      userId: 'user_priya_01',
      contactUserId: 'user_rohit_02',
      contactPhone: '+91 98765 22222',
      relationshipLabel: 'Brother',
      permissionLevel: 'full_sos_alerts',
      status: 'accepted',
      createdAt: Date.now() - 7 * 86400000,
    };
    await db.collection('trustedContacts').doc(tc.id).set(tc);
    console.log(`  ✓ Trusted contact seeded: ${tc.relationshipLabel}`);

    console.log('✅ SafeRoute Mock Data Seeding Complete!');
  } catch (err: any) {
    console.warn('⚠️ Seeding note: If running locally without GCP credentials, demo data is also live in Express server memory.');
    console.log('Details:', err?.message || err);
  }
}

if (process.argv[1]?.includes('seedMockData')) {
  seedMockData();
}
