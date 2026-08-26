/**
 * SafeHeaven Real Location Geocoding & Place Search Service
 * 
 * Provides real place search via OpenStreetMap Nominatim / Photon APIs
 * with debouncing, error handling, and structured location results.
 */

export interface GeocodedLocation {
  id: string;
  name: string;
  displayAddress: string;
  latitude: number;
  longitude: number;
  type?: string;
}

/**
 * Search locations using real OpenStreetMap Nominatim API with fallback to Photon
 */
export async function searchLocations(
  query: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<GeocodedLocation[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  try {
    // 1. Try Nominatim Search API
    const params = new URLSearchParams({
      q,
      format: 'json',
      addressdetails: '1',
      limit: '6',
    });

    if (userLocation) {
      // Add viewbox around user location to prioritize local results
      const delta = 0.5;
      params.append(
        'viewbox',
        `${userLocation.longitude - delta},${userLocation.latitude + delta},${userLocation.longitude + delta},${userLocation.latitude - delta}`
      );
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'SafeHeavenNavigation/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => ({
          id: `geo_nom_${item.place_id || idx}_${Date.now()}`,
          name: item.display_name.split(',')[0] || item.name || q,
          displayAddress: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          type: item.type || item.class || 'point',
        }));
      }
    }
  } catch (err) {
    console.warn('[GEOCODING] Nominatim query error:', err);
  }

  // 2. Fallback to Photon API
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`
    );
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      if (photonData?.features && Array.isArray(photonData.features)) {
        return photonData.features.map((feat: any, idx: number) => {
          const props = feat.properties || {};
          const coords = feat.geometry?.coordinates || [0, 0];
          const name = props.name || props.street || q;
          const address = [props.name, props.street, props.city, props.state, props.country]
            .filter(Boolean)
            .join(', ');
          return {
            id: `geo_pho_${props.osm_id || idx}_${Date.now()}`,
            name,
            displayAddress: address || name,
            latitude: coords[1],
            longitude: coords[0],
            type: props.osm_value || 'point',
          };
        });
      }
    }
  } catch (err) {
    console.warn('[GEOCODING] Photon fallback error:', err);
  }

  return [];
}

/**
 * Reverse Geocode coordinates to place name
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: { 'User-Agent': 'SafeHeavenNavigation/1.0' },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        return data.display_name;
      }
    }
  } catch (e) {
    console.warn('[GEOCODING] Reverse geocode error:', e);
  }

  return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
}
