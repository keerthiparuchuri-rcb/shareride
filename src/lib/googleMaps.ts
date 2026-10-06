/**
 * Compatibility re-export from openStreetMap.ts.
 * Google Maps has been replaced with OpenStreetMap, Leaflet, Nominatim, and OSRM.
 */

export * from './openStreetMap';

// Google Maps API key is no longer required
export const isGoogleMapsConfigured: boolean = true;
export const isMapsConfigured: boolean = true;

export function loadGoogleMapsScript(): Promise<void> {
  return Promise.resolve();
}
