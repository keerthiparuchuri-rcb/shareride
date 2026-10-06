import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates, calculateDrivingRoute } from '../../lib/openStreetMap';
import { Compass, Loader2 } from 'lucide-react';

// Custom modern SVG-based DivIcons for Pickup (Emerald) and Drop-off (Rose)
const createMarkerIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: ${color};
        color: white;
        border: 2.5px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        font-family: sans-serif;
        font-size: 11px;
        font-weight: bold;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const pickupIcon = createMarkerIcon('#10b981', 'A');
const dropoffIcon = createMarkerIcon('#f43f5e', 'B');

// Helper to auto-fit bounds on markers and route
const BoundsFitter: React.FC<{
  points: [number, number][];
}> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [map, points]);

  return null;
};

interface RouteMapProps {
  origin?: Coordinates & { address?: string };
  destination?: Coordinates & { address?: string };
  height?: string;
  className?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  origin,
  destination,
  height = '360px',
  className = '',
}) => {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Fetch OSRM driving route when origin and destination coordinates are provided
  useEffect(() => {
    if (origin?.lat && origin?.lng && destination?.lat && destination?.lng) {
      setLoadingRoute(true);
      calculateDrivingRoute(
        { lat: origin.lat, lng: origin.lng },
        { lat: destination.lat, lng: destination.lng }
      )
        .then((res) => {
          setRouteCoords(res.coordinates);
        })
        .catch((err) => {
          console.warn('Route rendering notice:', err);
          setRouteCoords([
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]);
        })
        .finally(() => {
          setLoadingRoute(false);
        });
    } else {
      setRouteCoords([]);
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  const defaultCenter: [number, number] = origin?.lat && origin?.lng
    ? [origin.lat, origin.lng]
    : [37.7749, -122.4194]; // Default map view center

  const boundsPoints: [number, number][] = [];
  if (origin?.lat && origin?.lng) boundsPoints.push([origin.lat, origin.lng]);
  if (destination?.lat && destination?.lng) boundsPoints.push([destination.lat, destination.lng]);

  return (
    <div
      style={{ height }}
      className={`w-full rounded-2xl border border-slate-200 overflow-hidden shadow-inner relative z-0 ${className}`}
    >
      {loadingRoute && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-700 shadow-md flex items-center gap-1.5 border border-slate-200">
          <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
          <span>Calculating OSRM route...</span>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Origin Marker */}
        {origin?.lat && origin?.lng && (
          <Marker position={[origin.lat, origin.lng]} icon={pickupIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-emerald-700 block">Pickup Location (A)</strong>
                <span>{origin.address || 'Origin'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination?.lat && destination?.lng && (
          <Marker position={[destination.lat, destination.lng]} icon={dropoffIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-rose-700 block">Destination (B)</strong>
                <span>{destination.address || 'Drop-off'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#059669', // Emerald route
              weight: 5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {boundsPoints.length > 0 && <BoundsFitter points={boundsPoints} />}
      </MapContainer>
    </div>
  );
};

export default RouteMap;
