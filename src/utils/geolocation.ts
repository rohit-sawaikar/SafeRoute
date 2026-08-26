/**
 * SafeRoute Browser Geolocation API Service & Continuous Tracker
 * Handles location permissions, live trip position watching, high accuracy GPS,
 * and graceful fallback to manual location search if permission is denied.
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  heading: number | null; // degrees
  speed: number | null; // m/s
  timestamp: number;
}

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'fallback';

export interface LocationState {
  status: GeolocationStatus;
  coords: LocationCoordinates | null;
  errorMessage: string | null;
  usingManualFallback: boolean;
  manualLocationName?: string;
}

// Fallback Default Location (e.g. Connaught Place, New Delhi) if permission is denied or manual search is used
export const DEFAULT_FALLBACK_LOCATION: LocationCoordinates = {
  latitude: 28.6139,
  longitude: 77.209,
  accuracy: 10,
  heading: null,
  speed: null,
  timestamp: Date.now(),
};

/**
 * Request high accuracy current location (one-shot)
 */
export async function getCurrentUserPosition(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser. Please select a location manually.'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. You can still search locations manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location signal unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      options
    );
  });
}

/**
 * Continuously watch position (for active navigation and SOS continuous tracking)
 */
export function startContinuousLocationTracker(
  onPositionUpdate: (coords: LocationCoordinates) => void,
  onError: (errorState: { code: number; message: string }) => void
): number | null {
  if (!navigator.geolocation) {
    onError({ code: 0, message: 'Geolocation API unavailable on this browser.' });
    return null;
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0, // Force fresh pings for trip tracking
  };

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onPositionUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      });
    },
    (err) => {
      onError({ code: err.code, message: err.message });
    },
    options
  );

  return watchId;
}

/**
 * Stop active location watcher
 */
export function stopLocationTracker(watchId: number | null): void {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Code snippet ready for insertion into React components or plain JS frontend
 */
export const GEOLOCATION_USAGE_SNIPPET = `
import { useState, useEffect } from 'react';
import {
  getCurrentUserPosition,
  startContinuousLocationTracker,
  stopLocationTracker,
  DEFAULT_FALLBACK_LOCATION,
} from './utils/geolocation';

export function useLiveSafetyLocation() {
  const [locationState, setLocationState] = useState({
    coords: null,
    status: 'idle',
    error: null,
    isManual: false,
  });

  useEffect(() => {
    let watchId = null;

    async function initLocation() {
      try {
        setLocationState(s => ({ ...s, status: 'requesting' }));
        const initialCoords = await getCurrentUserPosition();
        setLocationState({
          coords: initialCoords,
          status: 'granted',
          error: null,
          isManual: false,
        });

        // Start continuous live tracking
        watchId = startContinuousLocationTracker(
          (updatedCoords) => {
            setLocationState({
              coords: updatedCoords,
              status: 'granted',
              error: null,
              isManual: false,
            });
          },
          (err) => {
            console.warn('Location watch error:', err.message);
          }
        );
      } catch (err) {
        // Fallback to manual mode if user denies permission
        setLocationState({
          coords: DEFAULT_FALLBACK_LOCATION,
          status: 'denied',
          error: err.message,
          isManual: true,
        });
      }
    }

    initLocation();

    return () => {
      if (watchId !== null) stopLocationTracker(watchId);
    };
  }, []);

  return locationState;
}
`;
