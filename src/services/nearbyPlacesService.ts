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
 * Fetch real nearby places around (latitude, longitude) using OpenStreetMap Overpass API.
 * Radius default is 3000m (3km).
 * Throws error if request fails or network drops.
 */
export async function fetchRealNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number = 3000
): Promise<SafeHavenCandidate[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"police|fire_station|hospital|clinic|pharmacy|doctors"](around:${radiusMeters},${latitude},${longitude});
      way["amenity"~"police|fire_station|hospital|clinic|pharmacy|doctors"](around:${radiusMeters},${latitude},${longitude});
      node["railway"~"station|subway_entrance"](around:${radiusMeters},${latitude},${longitude});
      node["amenity"~"bus_station|bank|post_office"](around:${radiusMeters},${latitude},${longitude});
      node["emergency"](around:${radiusMeters},${latitude},${longitude});
    );
    out center 25;
  `;

  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`POI Service HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const elements: OverpassElement[] = data?.elements || [];

  if (elements.length === 0) {
    return [];
  }

  const realPlaces: SafeHavenCandidate[] = elements
    .map((item, idx) => {
      const itemLat = item.lat ?? item.center?.lat;
      const itemLon = item.lon ?? item.center?.lon;
      if (!itemLat || !itemLon) return null;

      const tags = item.tags || {};
      const name = tags['name:en'] || tags.name || getCategoryDefaultName(tags);

      const distMeters = calculateDistanceMeters(latitude, longitude, itemLat, itemLon);
      const walkTime = Math.max(1, Math.round(distMeters / 75)); // ~4.5 km/h walking pace
      const havenType = mapOsmTagToType(tags);

      const street = tags['addr:street'] || '';
      const houseNum = tags['addr:housenumber'] || '';
      const city = tags['addr:city'] || '';
      const address = [houseNum, street, city].filter(Boolean).join(' ') || `${itemLat.toFixed(4)}°, ${itemLon.toFixed(4)}°`;

      const openingHoursStr = tags.opening_hours || '';
      const isOpen247 = Boolean(openingHoursStr.includes('24/7')) || havenType === 'POLICE_STATION' || havenType === 'FIRE_STATION' || havenType === 'HOSPITAL';

      return {
        id: `osm_${item.id || idx}`,
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
      } as SafeHavenCandidate;
    })
    .filter((place): place is SafeHavenCandidate => place !== null);

  // Sort by distance ascending
  realPlaces.sort((a, b) => a.distance_meters - b.distance_meters);

  return realPlaces.slice(0, 15);
}

