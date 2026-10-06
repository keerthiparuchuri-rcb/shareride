import { describe, it, expect } from 'vitest';
import { calculateHaversineDistanceKm, isRouteCompatible } from '../lib/openStreetMap';

describe('Route Matching & Geodesic Calculations', () => {
  it('calculates accurate Haversine distance between San Francisco and San Jose', () => {
    // SF: ~37.7749, -122.4194
    // San Jose: ~37.3382, -121.8863
    const sf = { lat: 37.7749, lng: -122.4194 };
    const sj = { lat: 37.3382, lng: -121.8863 };

    const distance = calculateHaversineDistanceKm(sf.lat, sf.lng, sj.lat, sj.lng);
    // Straight line distance is approximately 67-72 km
    expect(distance).toBeGreaterThan(60);
    expect(distance).toBeLessThan(80);
  });

  it('marks a close en-route pickup and dropoff as compatible', () => {
    // Driver route: San Francisco to San Jose
    const driverOrigin = { lat: 37.7749, lng: -122.4194 }; // SF
    const driverDest = { lat: 37.3382, lng: -121.8863 };   // San Jose

    // Rider pickup: San Mateo (approx 30km south of SF, directly along the route)
    const riderPickup = { lat: 37.5630, lng: -122.3255 }; // San Mateo (approx 25km from SF)
    // Rider dropoff: Palo Alto (approx 25km north of San Jose, along route)
    const riderDropoff = { lat: 37.4419, lng: -122.1430 }; // Palo Alto

    // With a 30km pickup/dropoff radius allowance
    const match = isRouteCompatible(
      driverOrigin,
      driverDest,
      riderPickup,
      riderDropoff,
      35,
      35,
      1.5
    );

    expect(match.compatible).toBe(true);
    expect(match.detourRatio).toBeLessThanOrEqual(1.5);
  });

  it('rejects a route that introduces an unacceptable detour', () => {
    // Driver route: SF to San Jose
    const driverOrigin = { lat: 37.7749, lng: -122.4194 };
    const driverDest = { lat: 37.3382, lng: -121.8863 };

    // Rider pickup far away in Sacramento (~140 km north-east)
    const riderPickup = { lat: 38.5816, lng: -121.4944 };
    const riderDropoff = { lat: 37.3382, lng: -121.8863 };

    const match = isRouteCompatible(
      driverOrigin,
      driverDest,
      riderPickup,
      riderDropoff,
      20, // max 20 km pickup proximity
      20,
      1.4
    );

    expect(match.compatible).toBe(false);
  });
});
