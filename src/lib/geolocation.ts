// Geolocation utilities for GPS-based location verification

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationResult {
  coords: Coordinates;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Check if user is within allowed distance of a location
 */
export function isWithinRange(
  userCoords: Coordinates,
  targetCoords: Coordinates,
  maxDistanceMeters: number = 100
): boolean {
  const distance = calculateDistance(userCoords, targetCoords);
  return distance <= maxDistanceMeters;
}

/**
 * Get current position as a Promise
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser',
      } as GeolocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let message: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Konum izni reddedildi';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Konum bilgisi alınamadı';
            break;
          case error.TIMEOUT:
            message = 'Konum isteği zaman aşımına uğradı';
            break;
          default:
            message = 'Bilinmeyen bir hata oluştu';
        }
        reject({ code: error.code, message } as GeolocationError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Cache location for 30 seconds
        ...options,
      }
    );
  });
}

// Maximum distance allowed for check-in (in meters)
export const CHECK_IN_RADIUS_METERS = 500;

// Inactivity timeout (in milliseconds) - 15 minutes
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// Activity ping interval (in milliseconds) - 5 minutes
export const ACTIVITY_PING_INTERVAL_MS = 5 * 60 * 1000;
