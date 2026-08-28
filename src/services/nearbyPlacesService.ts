/**
 * Safe Route Real Nearby Places Service
 * 
 * Dynamically fetches REAL safety-relevant places (pharmacies, hospitals, police stations, transit hubs)
 * based on the user's actual GPS coordinates using OpenStreetMap Overpass API.
 */

import { SafeHavenCandidate, SafeHavenType } from '../types/safety';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    'name:en'?: string;
    amenity?: string;
    healthcare?: string;
    highway?: string;
    railway?: string;
    building?: string;
    emergency?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    opening_hours?: string;
  };
}

/**
 * Calculates distance in meters between two lat/lng points using Haversine formula
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
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

/**
 * Map OpenStreetMap amenity/tags to SafeHavenType
 */
function mapOsmTagToType(tags?: Record<string, string>): SafeHavenType {
  if (!tags) return 'OPEN_COMMERCIAL';
  const amenity = tags.amenity?.toLowerCase() || '';
  const railway = tags.railway?.toLowerCase() || '';
  const highway = tags.highway?.toLowerCase() || '';
  const emergency = tags.emergency?.toLowerCase() || '';

  if (amenity === 'police') return 'POLICE_STATION';
  if (amenity === 'fire_station' || emergency === 'fire_station') return 'FIRE_STATION';
  if (amenity === 'hospital' || amenity === 'clinic' || tags.healthcare || amenity === 'doctors') return 'HOSPITAL';
  if (amenity === 'pharmacy' || amenity === 'chemist') return 'PHARMACY_24_7';
  if (railway || highway === 'bus_stop' || amenity === 'bus_station' || amenity === 'ferry_terminal') return 'TRANSIT_HUB';

  return 'OPEN_COMMERCIAL';
}

/**
 * Graceful default name provider for unnamed facilities
 */
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

/**
 * Fetch real nearby places around (latitude, longitude) via the Safe Route backend proxy endpoint.
 * Throws clean errors if backend or Overpass fails.
 */
export async function fetchRealNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number = 3000
): Promise<SafeHavenCandidate[]> {
  const backendUrl =
    (import.meta as any).env?.VITE_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const endpoint = `${backendUrl}/api/safety/nearby-places?lat=${latitude}&lng=${longitude}&radius=${radiusMeters}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMsg = `Unable to load nearby places (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMsg = errData.error;
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data?.success || !Array.isArray(data?.places)) {
    throw new Error(data?.error || 'Invalid nearby places data received from server');
  }

  return data.places;
}


