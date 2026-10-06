import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Vehicle } from '../types/database';
import { PlaceAutocompleteInput } from '../components/common/PlaceAutocompleteInput';
import { RouteMap } from '../components/common/RouteMap';
import { calculateDrivingRoute } from '../lib/openStreetMap';
import { 
  Car, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  ArrowRight,
  Info
} from 'lucide-react';

export const OfferRidePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Inputs
  const [originAddress, setOriginAddress] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat?: number; lng?: number }>({});
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat?: number; lng?: number }>({});

  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState(15);
  const [notes, setNotes] = useState('');

  // Vehicle
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // New vehicle fields
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState(new Date().getFullYear());
  const [vColor, setVColor] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vSeats, setVSeats] = useState(4);
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Route calculation
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // State
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user vehicles
  useEffect(() => {
    if (!user || !supabase || !isSupabaseConfigured) return;

    const fetchVehicles = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id);

      if (!error && data) {
        setVehicles(data as Vehicle[]);
        if (data.length > 0) {
          setSelectedVehicleId(data[0].id);
        }
      }
    };

    fetchVehicles();
  }, [user]);

  // Recalculate route whenever both coordinates are available
  useEffect(() => {
    if (originCoords.lat && originCoords.lng && destCoords.lat && destCoords.lng) {
      setCalculatingRoute(true);
      calculateDrivingRoute(
        { lat: originCoords.lat, lng: originCoords.lng },
        { lat: destCoords.lat, lng: destCoords.lng }
      )
        .then((res) => {
          setDistanceKm(res.distanceKm);
          setDurationMinutes(res.durationMinutes);
          if (res.routePolyline) {
            setRoutePolyline(res.routePolyline);
          }
        })
        .catch((err) => {
          console.warn('Driving route calculation notice:', err.message);
        })
        .finally(() => {
          setCalculatingRoute(false);
        });
    }
  }, [originCoords, destCoords]);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;

    setAddingVehicle(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          driver_id: user.id,
          make: vMake.trim(),
          model: vModel.trim(),
          year: vYear,
          color: vColor.trim(),
          license_plate: vPlate.trim().toUpperCase(),
          seats_capacity: vSeats,
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setVehicles((prev) => [...prev, data as Vehicle]);
        setSelectedVehicleId(data.id);
        setShowAddVehicleModal(false);
        setVMake('');
        setVModel('');
        setVColor('');
        setVPlate('');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save vehicle.');
    } finally {
      setAddingVehicle(false);
    }
  };

  const handlePublishRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !supabase) {
      setError('You must be logged in with Supabase configured to offer a ride.');
      return;
    }

    if (!originAddress.trim() || !destinationAddress.trim()) {
      setError('Please provide valid origin and destination locations.');
      return;
    }

    if (!departureDate || !departureTime) {
      setError('Please specify both departure date and time.');
      return;
    }

    const scheduledTimestamp = new Date(`${departureDate}T${departureTime}:00`);
    if (isNaN(scheduledTimestamp.getTime())) {
      setError('Invalid date/time format.');
      return;
    }

    if (scheduledTimestamp.getTime() <= Date.now()) {
      setError('Departure time must be strictly in the future. Past departure times cannot be published.');
      return;
    }

    if (totalSeats < 1) {
      setError('Must provide at least 1 available seat.');
      return;
    }

    if (pricePerSeat < 0) {
      setError('Price cannot be negative.');
      return;
    }

    // Default coords to 0 if not extracted from autocomplete
    const finalOriginLat = originCoords.lat ?? 0;
    const finalOriginLng = originCoords.lng ?? 0;
    const finalDestLat = destCoords.lat ?? 0;
    const finalDestLng = destCoords.lng ?? 0;

    setPublishing(true);

    try {
      const { data, error: insertError } = await supabase
        .from('rides')
        .insert({
          driver_id: user.id,
          vehicle_id: selectedVehicleId || null,
          origin_address: originAddress.trim(),
          origin_lat: finalOriginLat,
          origin_lng: finalOriginLng,
          destination_address: destinationAddress.trim(),
          destination_lat: finalDestLat,
          destination_lng: finalDestLng,
          departure_time: scheduledTimestamp.toISOString(),
          available_seats: totalSeats,
          total_seats: totalSeats,
          price_per_seat: pricePerSeat,
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          route_polyline: routePolyline,
          notes: notes.trim() || null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
      } else if (data) {
        navigate(`/ride/${data.id}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to publish ride.');
    } finally {
      setPublishing(false);
    }
  };

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Offer a Ride
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Publish your upcoming travel itinerary. Passengers heading along your route can request empty seats.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Validation or Publishing Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handlePublishRide} className="space-y-6">
        {/* Route Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold">
              1
            </span>
            <span>Origin and Destination Route</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlaceAutocompleteInput
              id="offer-origin"
              label="Starting Location (Origin)"
              value={originAddress}
              onChange={(address, lat, lng) => {
                setOriginAddress(address);
                setOriginCoords({ lat, lng });
              }}
              placeholder="e.g. 100 Main St, San Francisco, CA"
              required
            />

            <PlaceAutocompleteInput
              id="offer-destination"
              label="Destination"
              value={destinationAddress}
              onChange={(address, lat, lng) => {
                setDestinationAddress(address);
                setDestCoords({ lat, lng });
              }}
              placeholder="e.g. Stanford University, Palo Alto, CA"
              required
            />
          </div>

          {/* Route Metrics Preview */}
          {(distanceKm !== null || calculatingRoute) && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-4">
                <span>
                  <strong>Calculated Distance:</strong>{' '}
                  {calculatingRoute ? 'Computing...' : `${distanceKm} km`}
                </span>
                {durationMinutes !== null && (
                  <span>
                    <strong>Estimated Duration:</strong> {durationMinutes} mins
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">OSRM Road Routing Verified</span>
            </div>
          )}

          {/* Map Preview */}
          <div className="pt-2">
            <RouteMap
              origin={originCoords.lat ? { lat: originCoords.lat, lng: originCoords.lng!, address: originAddress } : undefined}
              destination={destCoords.lat ? { lat: destCoords.lat, lng: destCoords.lng!, address: destinationAddress } : undefined}
              height="280px"
            />
          </div>
        </div>

        {/* Schedule & Pricing Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold">
              2
            </span>
            <span>Schedule, Capacity &amp; Fair Price</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Departure Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Departure Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Available Seats <span className="text-rose-500">*</span>
              </label>
              <select
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    {s} {s === 1 ? 'seat' : 'seats'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Price Per Seat ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Vehicle Details</span>
            </h2>

            <button
              type="button"
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Vehicle</span>
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-2">
              <Car className="w-6 h-6 mx-auto text-slate-400" />
              <p className="text-xs text-slate-600">
                No vehicles registered on your driver profile. Passengers feel much safer when vehicle make and license plate are listed.
              </p>
              <button
                type="button"
                onClick={() => setShowAddVehicleModal(true)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
              >
                Register Vehicle Now
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Vehicle for Trip
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-white"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} ({v.color}) — Plate: {v.license_plate} ({v.seats_capacity} cap)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Trip Notes &amp; Guidelines (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Non-smoking ride, small trunk luggage welcome, meeting by the north entrance..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/my-rides"
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={publishing}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-md shadow-brand-500/25 flex items-center gap-2 transition hover:-translate-y-0.5"
          >
            {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Publish Ride</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Registered Vehicle</h3>
            <p className="text-xs text-slate-500">
              Enter your vehicle details to display for passengers.
            </p>

            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota"
                    value={vMake}
                    onChange={(e) => setVMake(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prius"
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    value={vYear}
                    onChange={(e) => setVYear(parseInt(e.target.value) || 2020)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Color</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Silver"
                    value={vColor}
                    onChange={(e) => setVColor(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Seats</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={vSeats}
                    onChange={(e) => setVSeats(parseInt(e.target.value) || 4)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7XYZ123"
                  value={vPlate}
                  onChange={(e) => setVPlate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="px-4 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 disabled:opacity-50"
                >
                  {addingVehicle ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
