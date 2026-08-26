# SafeRoute Backend Integration & Deployment Guide

This document outlines the complete backend architecture, API reference, Firebase Firestore schema, real-time listener setups, security rules, and frontend integration code for **SafeRoute**.

---

## 1. Tech Stack & Directory Structure

- **Backend Platform**: Firebase (Cloud Firestore, Cloud Functions v2, Firebase Authentication, FCM Push Notifications)
- **Local Bridge**: Node.js + Express API bridge (`src/server/firebaseBridge.ts`) for zero-setup local testing
- **Language**: TypeScript (Node 20 / ES2022)

```
.
├── firebase.json                   # Firebase deployment configuration
├── firestore.rules                 # Firestore security & privacy enforcement rules
├── firestore.indexes.json          # Geohash and composite query indexes
├── functions/                      # Firebase Cloud Functions package
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Exports 10 Cloud Functions + 1 Scheduled Cron Job
│       ├── types.ts                # Shared data model definitions & API types
│       └── services/
│           ├── safetyPulseEngine.ts # Corroboration, time decay, pulse scoring, route comparison
│           └── emergencyServices.ts# Extensible country emergency numbers lookup table
├── scripts/
│   └── seedMockData.ts             # Demo data seeding script for hackathon setup
├── src/
│   ├── services/
│   │   └── firebaseClient.ts       # Frontend Firebase SDK & real-time listener helpers
│   ├── server/
│   │   └── firebaseBridge.ts       # Express router mounting HTTP endpoints locally
│   └── utils/
│       └── geolocation.ts          # Browser Geolocation API continuous tracker & fallback
```

---

## 2. Firestore Data Models

### `users`
- **`uid`**: string (Firebase Auth UID)
- **`displayName`**: string
- **`phone`** / **`email`**: string
- **`homeCountryCode`**: string (e.g. `"IN"`, `"US"`, `"UK"`)
- **`createdAt`**: number (timestamp ms)
- **`privacySettings`**: `{ discreetMode: boolean }`

### `trustedContacts`
- **`id`**: string
- **`userId`**: string
- **`contactPhone`**: string
- **`relationshipLabel`**: string (`"Parent"`, `"Partner"`, `"Friend"`)
- **`permissionLevel`**: `"view_location"` | `"full_sos_alerts"`
- **`status`**: `"pending"` | `"accepted"`

### `incidentReports`
- **`id`**: string
- **`reporterId`**: string (`"ANONYMOUS_PROTECTED"` when `sensitiveCategory: true`)
- **`type`**: `"accident"` | `"harassment"` | `"suspicious_activity"` | `"road_blockage"` | `"streetlight_failure"` | `"fire"` | `"medical_emergency"` | `"unsafe_infrastructure"`
- **`geopoint`**: `{ latitude: number, longitude: number }`
- **`geohash`**: string (geohash bucket precision 6)
- **`description`**: string (optional)
- **`timestamp`**: number
- **`corroborationCount`**: number
- **`confidenceScore`**: number (0.0 to 1.0)
- **`status`**: `"unverified"` | `"corroborated"` | `"expired"`
- **`sensitiveCategory`**: boolean (harassment/stalking flag)

### `safetyZones`
- **`geohash`**: string
- **`currentSafetyLevel`**: `"green"` | `"yellow"` | `"red"`
- **`contributingFactors`**: `{ activeIncidentCount, avgLightingScore, pedestrianActivityLevel, timeOfDay }`

### `activeTrips`
- **`id`**: string
- **`userId`**: string
- **`routeCoordinates`**: `Array<{ latitude, longitude }>`
- **`status`**: `"active"` | `"completed"` | `"deviated"` | `"sos_triggered"`
- **`sharedWithContactIds`**: string[]
- **`currentLocation`**: `{ latitude, longitude }`

### `sosEvents`
- **`id`**: string
- **`userId`**: string
- **`triggeredAt`**: number
- **`mode`**: `"standard_sos"` | `"being_followed"` | `"medical"` | `"accident"`
- **`lastKnownLocation`**: `{ latitude, longitude }`
- **`status`**: `"active"` | `"resolved"` | `"false_alarm"`
- **`silentMode`**: boolean
- **`audioRecordingRequested`**: boolean

---

## 3. Cloud Functions & API Reference

| Endpoint / Function Name | Method / Type | Description |
| :--- | :--- | :--- |
| `submitIncidentReport` | Callable / POST | Writes report, runs corroboration against reports within ~200m/45m, computes confidence, triggers FCM |
| `getAreaSafetyStatus` | Callable / POST / GET | Returns live point-in-time safety pulse (`green`/`yellow`/`red`), time-of-day risk, active signals |
| `getRouteSafetyComparison` | Callable / POST | Aggregates safety pulse along candidate route waypoints, returns safety score + travel time |
| `startTrip` | Callable / POST | Registers active trip, sets up shared location view for trusted contacts |
| `updateTripLocation` | Callable / POST | Updates current position, checks route deviation (>150m off route), flags ahead hazards (400m) |
| `endTrip` | Callable / POST | Marks trip as completed |
| `triggerSOS` | Callable / POST | Creates SOS event, fans out FCM alerts, returns live tracking URL & emergency number |
| `triggerBeingFollowed` | Callable / POST | Silent SOS mode: returns top 3 nearby safe havens, enables silent live tracking & audio clip request |
| `resolveSOS` | Callable / POST | Closes active SOS event safely, notifies trusted contacts |
| `getEmergencyNumbers` | Callable / GET | Returns location-aware dispatch numbers by country code (India 112/108/1091, US 911, UK 999, etc.) |
| `getSafeHavensNearby` | Callable / GET / POST | Returns verified 24/7 pharmacies, cafes, police booths, gas stations sorted by distance |
| `manageTrustedContacts` | Callable / POST | CRUD & invitation acceptance for trusted circle |
| `decayIncidentConfidenceAndPulse` | Scheduled Cron | Runs every 15 mins to decay report confidence scores & expire old incidents |

---

## 4. Frontend Integration Guide

### Step 1: Initialize API Service
Use `safeRouteApi` from [`src/services/firebaseClient.ts`](file:///c:/Users/prati/OneDrive/Desktop/new%20hack/src/services/firebaseClient.ts):

```typescript
import { safeRouteApi, subscribeToActiveTrip } from './services/firebaseClient';

// Submit incident
const response = await safeRouteApi.submitReport({
  type: 'harassment',
  geopoint: { latitude: 28.6139, longitude: 77.209 },
  description: 'Unlit walkway near subway exit',
  sensitiveCategory: true,
});

// Trigger Being Followed (Silent Mode)
const followedResp = await safeRouteApi.triggerBeingFollowed(
  'user_123',
  { latitude: 28.6139, longitude: 77.209 }
);
console.log('Top 3 Safe Havens:', followedResp.top3SafeHavens);
```

### Step 2: Real-time Live Location Tracking for Trusted Contacts
```typescript
// On Trusted Contact screen: listen to active trip updates in real-time
const unsubscribe = subscribeToActiveTrip('trip_id_123', (trip) => {
  console.log('User Current Location:', trip.currentLocation);
  if (trip.status === 'deviated') {
    alert('Warning: Traveller has deviated from their route!');
  }
});
```

---

## 5. Browser Geolocation Access Code Snippet

The browser Geolocation API helper ([`src/utils/geolocation.ts`](file:///c:/Users/prati/OneDrive/Desktop/new%20hack/src/utils/geolocation.ts)) requests location permissions on load, watches position continuously during trips, and falls back gracefully if denied:

```typescript
import {
  getCurrentUserPosition,
  startContinuousLocationTracker,
  stopLocationTracker,
  DEFAULT_FALLBACK_LOCATION,
} from './utils/geolocation';

// Request location permission & watch live position
export function initLocationTracking(onLocationUpdate, onPermissionDenied) {
  // 1. One-shot location request
  getCurrentUserPosition()
    .then((coords) => {
      onLocationUpdate(coords);

      // 2. Start continuous tracker for navigation
      const watchId = startContinuousLocationTracker(
        (updatedCoords) => onLocationUpdate(updatedCoords),
        (err) => console.warn('GPS signal update warning:', err.message)
      );
    })
    .catch((err) => {
      // Permission denied or unavailable: use fallback location & let user search manually
      console.log('Using manual fallback location:', err.message);
      onPermissionDenied(DEFAULT_FALLBACK_LOCATION);
    });
}
```

---

## 6. How to Run & Deploy

### A. Run Express Local API Server (For Instant Hackathon Testing)
```bash
npm run dev
# Express API server starts at http://localhost:3000
# SafeRoute endpoints mounted at http://localhost:3000/api/saferoute/*
```

### B. Seed Mock Demo Data
```bash
npx tsx scripts/seedMockData.ts
```

### C. Deploy to Firebase
```bash
# 1. Install functions dependencies
cd functions && npm install && npm run build && cd ..

# 2. Deploy rules, indexes, and Cloud Functions to GCP/Firebase
firebase deploy --only firestore:rules,firestore:indexes,functions
```
