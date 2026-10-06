import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Ride } from '../types/database';
import { PlaceAutocompleteInput } from '../components/common/PlaceAutocompleteInput';
import { RouteMap } from '../components/common/RouteMap';
import { isRouteCompatible, calculateHaversineDistanceKm } from '../lib/openStreetMap';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Car, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Filter, 
  SlidersHorizontal,
  AlertCircle,
  Loader2,
  DollarSign
} from 'lucide-react';

export const FindRidePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Inputs
  const [pickupAddress, setPickupAddress] = useState(searchParams.get('origin') || '');
  const [pickupCoords, setPickupCoords] = useState<{ lat?: number; lng?: number }>({
    lat: searchParams.get('origin_lat') ? parseFloat(searchParams.get('origin_lat')!) : undefined,
    lng: searchParams.get('origin_lng') ? parseFloat(searchParams.get('origin_lng')!) : undefined,
  });

  const [dropoffAddress, setDropoffAddress] = useState(searchParams.get('destination') || '');
  const [dropoffCoords, setDropoffCoords] = useState<{ lat?: number; lng?: number }>({
    lat: searchParams.get('dest_lat') ? parseFloat(searchParams.get('dest_lat')!) : undefined,
    lng: searchParams.get('dest_lng') ? parseFloat(searchParams.get('dest_lng')!) : undefined,
  });

  const [date, setDate] = useState(searchParams.get('date') || '');
  const [seats, setSeats] = useState(parseInt(searchParams.get('seats') || '1', 10));

  // Max proximity filter
  const [maxPickupProximityKm, setMaxPickupProximityKm] = useState(20);
  const [selectedRideForMap, setSelectedRideForMap] = useState<Ride | null>(null);

  // Results & state
  const [rides, setRides] = useState<Ride[]>([]);
  const [filteredRides, setFilteredRides] = useState<(Ride & { detourScore?: number; pickupDist?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const executeSearch = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setRides([]);
      setFilteredRides([]);
      setSearched(true);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      let query = supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(id, full_name, avatar_url, phone, role),
          vehicle:vehicles(id, make, model, year, color, license_plate)
        `)
        .eq('status', 'scheduled')
        .gt('departure_time', new Date().toISOString())
        .gte('available_seats', seats)
        .order('departure_time', { ascending: true });

      if (date) {
        const startOfDay = new Date(`${date}T00:00:00Z`).toISOString();
        const endOfDay = new Date(`${date}T23:59:59Z`).toISOString();
        query = query.gte('departure_time', startOfDay).lte('departure_time', endOfDay);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching rides:', error);
        setFetchError(error.message);
        setRides([]);
        setFilteredRides([]);
      } else {
        const fetched = (data as unknown as Ride[]) || [];
        setRides(fetched);

        // Perform Route Compatibility filtering if user provided coordinates
        if (pickupCoords.lat && pickupCoords.lng && dropoffCoords.lat && dropoffCoords.lng) {
          const compatible = fetched
            .map((ride) => {
              const driverOrigin = { lat: ride.origin_lat, lng: ride.origin_lng };
              const driverDest = { lat: ride.destination_lat, lng: ride.destination_lng };
              const riderPickup = { lat: pickupCoords.lat!, lng: pickupCoords.lng! };
              const riderDropoff = { lat: dropoffCoords.lat!, lng: dropoffCoords.lng! };

              const match = isRouteCompatible(
                driverOrigin,
                driverDest,
                riderPickup,
                riderDropoff,
                maxPickupProximityKm,
                maxPickupProximityKm,
                1.5 // max 50% detour
              );

              return {
                ...ride,
                compatible: match.compatible,
                detourScore: match.detourRatio,
                pickupDist: match.pickupDistKm,
              };
            })
            .filter((r) => r.compatible)
            .sort((a, b) => (a.detourScore || 1) - (b.detourScore || 1));

          setFilteredRides(compatible);
        } else if (pickupCoords.lat && pickupCoords.lng) {
          // Only pickup provided: filter by pickup proximity
          const nearby = fetched
            .map((ride) => {
              const dist = calculateHaversineDistanceKm(
                ride.origin_lat,
                ride.origin_lng,
                pickupCoords.lat!,
                pickupCoords.lng!
              );
              return {
                ...ride,
                pickupDist: dist,
              };
            })
            .filter((r) => r.pickupDist <= maxPickupProximityKm)
            .sort((a, b) => (a.pickupDist || 0) - (b.pickupDist || 0));

          setFilteredRides(nearby);
        } else {
          // No GPS coordinates provided, return all date/seat matched rides
          setFilteredRides(fetched);
        }
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to search rides.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [date, seats, pickupCoords, dropoffCoords, maxPickupProximityKm]);

  // Execute initial search on mount or URL change
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (pickupAddress) params.origin = pickupAddress;
    if (dropoffAddress) params.destination = dropoffAddress;
    if (pickupCoords.lat) params.origin_lat = pickupCoords.lat.toString();
    if (pickupCoords.lng) params.origin_lng = pickupCoords.lng.toString();
    if (dropoffCoords.lat) params.dest_lat = dropoffCoords.lat.toString();
    if (dropoffCoords.lng) params.dest_lng = dropoffCoords.lng.toString();
    if (date) params.date = date;
    params.seats = seats.toString();

    setSearchParams(params);
    executeSearch();
  };

  // Active map points
  const activeMapOrigin = selectedRideForMap
    ? { lat: selectedRideForMap.origin_lat, lng: selectedRideForMap.origin_lng, address: selectedRideForMap.origin_address }
    : pickupCoords.lat && pickupCoords.lng
    ? { lat: pickupCoords.lat, lng: pickupCoords.lng, address: pickupAddress }
    : undefined;

  const activeMapDest = selectedRideForMap
    ? { lat: selectedRideForMap.destination_lat, lng: selectedRideForMap.destination_lng, address: selectedRideForMap.destination_address }
    : dropoffCoords.lat && dropoffCoords.lng
    ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng, address: dropoffAddress }
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Find a Shared Ride
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search real rides published by verified community members. Filtered by detour compatibility and available seats.
        </p>
      </div>

      {/* Search Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlaceAutocompleteInput
              id="search-pickup"
              label="Pickup Location"
              value={pickupAddress}
              onChange={(address, lat, lng) => {
                setPickupAddress(address);
                setPickupCoords({ lat, lng });
              }}
              placeholder="Enter pickup address or city..."
            />

            <PlaceAutocompleteInput
              id="search-dropoff"
              label="Drop-off Destination"
              value={dropoffAddress}
              onChange={(address, lat, lng) => {
                setDropoffAddress(address);
                setDropoffCoords({ lat, lng });
              }}
              placeholder="Enter destination address..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Seats Needed
              </label>
              <select
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'seat' : 'seats'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Pickup Radius ({maxPickupProximityKm} km)
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxPickupProximityKm}
                onChange={(e) => setMaxPickupProximityKm(Number(e.target.value))}
                className="w-full accent-brand-500 mt-2 cursor-pointer"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Update Search</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error or Supabase Missing Notification */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Database Connection Required</p>
            <p className="mt-0.5">
              To search and publish real rides, configure your Supabase URL and Key in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code>.
            </p>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-900">Database Query Notice</p>
            <p className="text-rose-700">{fetchError}</p>
            {fetchError.includes('schema cache') && (
              <p className="text-rose-800 bg-rose-100/80 p-2.5 rounded-lg border border-rose-200 mt-2 leading-relaxed">
                <strong>Migration Required:</strong> The table <code className="font-mono font-bold">public.rides</code> has not yet been applied to your connected Supabase project. Open your Supabase Dashboard SQL Editor and execute the migration script in <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200">supabase/migrations/20250101000000_routemates_schema.sql</code>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Layout: Results List & Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Ride Results Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              {loading ? (
                'Searching available rides...'
              ) : (
                `${filteredRides.length} Available ${filteredRides.length === 1 ? 'Ride' : 'Rides'}`
              )}
            </h2>
            {selectedRideForMap && (
              <button
                onClick={() => setSelectedRideForMap(null)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                Clear Map Focus
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
              <p className="text-sm">Calculating route compatibility and querying available seats...</p>
            </div>
          ) : filteredRides.length === 0 && searched ? (
            /* Genuine Empty State */
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Car className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  No Rides Match This Route Yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  No published trips match your exact route, pickup radius ({maxPickupProximityKm} km), and requested seats ({seats}).
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setMaxPickupProximityKm(50);
                    setDate('');
                    executeSearch();
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 transition"
                >
                  Widen Pickup Radius
                </button>
                <Link
                  to="/offer"
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-xs font-semibold rounded-lg text-white shadow-sm transition"
                >
                  Offer This Route Instead
                </Link>
              </div>
            </div>
          ) : (
            filteredRides.map((ride) => {
              const departureDate = new Date(ride.departure_time);
              const isSelected = selectedRideForMap?.id === ride.id;

              return (
                <div
                  key={ride.id}
                  onClick={() => setSelectedRideForMap(ride)}
                  className={`bg-white rounded-2xl border p-5 transition cursor-pointer hover:border-brand-500/80 hover:shadow-md ${
                    isSelected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
                  }`}
                >
                  {/* Top Header: Departure & Price */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex flex-col items-center justify-center font-bold">
                        <span className="text-[10px] uppercase font-bold leading-none">
                          {departureDate.toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-sm leading-tight">
                          {departureDate.getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {departureDate.toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {ride.distance_km ? `${ride.distance_km} km` : 'Direct Route'}
                          {ride.duration_minutes ? ` • approx ${ride.duration_minutes} min` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-extrabold text-slate-900">
                        ${Number(ride.price_per_seat).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">per seat</span>
                    </div>
                  </div>

                  {/* Route Timeline */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Origin</span>
                        <span className="font-semibold text-slate-800">{ride.origin_address}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Destination</span>
                        <span className="font-semibold text-slate-800">{ride.destination_address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Driver & Vehicle Details Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                        {ride.driver?.avatar_url ? (
                          <img
                            src={ride.driver.avatar_url}
                            alt={ride.driver.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          ride.driver?.full_name?.charAt(0).toUpperCase() || 'D'
                        )}
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 block">
                          {ride.driver?.full_name || 'Driver'}
                        </span>
                        {ride.vehicle ? (
                          <span className="text-[10px] text-slate-400">
                            {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model} ({ride.vehicle.license_plate})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Verified vehicle</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="font-bold text-emerald-600">
                          {ride.available_seats} of {ride.total_seats}
                        </span>
                        <span className="text-[10px] text-slate-400 block">seats open</span>
                      </div>

                      <Link
                        to={`/ride/${ride.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <span>Details &amp; Book</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Map Column (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                {selectedRideForMap ? 'Selected Ride Route' : 'Search Preview Map'}
              </span>
              {selectedRideForMap && (
                <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  Focused Ride
                </span>
              )}
            </div>

            <RouteMap
              origin={activeMapOrigin}
              destination={activeMapDest}
              height="420px"
            />

            <p className="text-[11px] text-slate-400 text-center">
              Click any ride card to view exact pickup and drop-off coordinates on the map.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
