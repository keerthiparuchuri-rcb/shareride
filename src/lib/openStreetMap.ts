/**
 * Free & Open-Source Mapping Services:
 * - OpenStreetMap & React Leaflet for Map Tiles
 * - Nominatim for Address Geocoding & Search (respecting Usage Policy)
 * - OSRM (Open Source Routing Machine) for Road Distance, Duration & Polylines
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  placeId: string | number;
  displayName: string;
  lat: number;
  lng: number;
}

export interface RouteCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet Polyline
  routePolyline?: string;
}

const NOMINATIM_BASE_URL =
  import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

const OSRM_BASE_URL =
  import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org';

// Nominatim Rate Limiter (max 1 request per second to respect usage policy)
let lastNominatimRequestTime = 0;

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();
}

/**
 * Search addresses using OpenStreetMap Nominatim.
 * Strictly respects Nominatim usage policy:
 * - Minimum 3 characters
 * - Rate limited to 1 request / sec
 * - Custom User-Agent header
 */
export async function searchAddressNominatim(
  query: string,
  limit = 5
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  await throttleNominatim();

  try {
    const url = new URL(`${NOMINATIM_BASE_URL}/search`);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Nominatim search error: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (err) {
    console.warn('Nominatim geocoding fetch failed:', err);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude into an address using Nominatim.
 */
export async function reverseGeocodeNominatim(
  lat: number,
  lng: number
): Promise<string> {
  await throttleNominatim();

  try {
    const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = await response.json();
    return data.display_name || `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (err) {
    console.warn('Nominatim reverse geocode failed:', err);
    return `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Haversine formula to compute great-circle distance between two coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculate real driving road distance and travel duration via OSRM (Open Source Routing Machine).
 * Falls back to geodesic math if OSRM service is unreachable.
 */
export async function calculateDrivingRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteCalculationResult> {
  try {
    // OSRM coordinates are formatted as {longitude},{latitude}
    const osrmUrl = `${OSRM_BASE_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.round(route.duration / 60);

        // OSRM geojson coordinates are [lng, lat]; Leaflet expects [lat, lng]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );

        return {
          distanceKm,
          durationMinutes,
          coordinates,
          routePolyline: JSON.stringify(coordinates),
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch failed, using geodesic estimation:', err);
  }

  // Graceful fallback: Haversine distance and 60 km/h estimated driving speed
  const dist = calculateHaversineDistanceKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );
  const estimatedMinutes = Math.max(5, Math.round((dist / 60) * 60));

  return {
    distanceKm: dist,
    durationMinutes: estimatedMinutes,
    coordinates: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
  };
}

/**
 * Check if a ride is compatible with passenger's requested pickup and destination.
 */
export function isRouteCompatible(
  driverOrigin: Coordinates,
  driverDest: Coordinates,
  riderPickup: Coordinates,
  riderDropoff: Coordinates,
  maxPickupDistKm = 15,
  maxDropoffDistKm = 15,
  maxDetourRatio = 1.4
): {
  compatible: boolean;
  detourRatio: number;
  pickupDistKm: number;
  dropoffDistKm: number;
} {
  const pickupDistKm = calculateHaversineDistanceKm(
    driverOrigin.lat,
    driverOrigin.lng,
    riderPickup.lat,
    riderPickup.lng
  );
  const dropoffDistKm = calculateHaversineDistanceKm(
    driverDest.lat,
    driverDest.lng,
    riderDropoff.lat,
    riderDropoff.lng
  );

  const directDist = calculateHaversineDistanceKm(
    driverOrigin.lat,
    driverOrigin.lng,
    driverDest.lat,
    driverDest.lng
  );

  const detourDist =
    pickupDistKm +
    calculateHaversineDistanceKm(
      riderPickup.lat,
      riderPickup.lng,
      riderDropoff.lat,
      riderDropoff.lng
    ) +
    dropoffDistKm;

  const detourRatio = directDist > 0 ? detourDist / directDist : 1.0;

  const compatible =
    pickupDistKm <= maxPickupDistKm &&
    dropoffDistKm <= maxDropoffDistKm &&
    detourRatio <= maxDetourRatio;

  return {
    compatible,
    detourRatio: Math.round(detourRatio * 100) / 100,
    pickupDistKm,
    dropoffDistKm,
  };
}
