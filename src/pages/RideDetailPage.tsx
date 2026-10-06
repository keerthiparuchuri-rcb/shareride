import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Ride, Booking } from '../types/database';
import { RouteMap } from '../components/common/RouteMap';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Navigation,
  FileText
} from 'lucide-react';

export const RideDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ride, setRide] = useState<Ride | null>(null);
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking form
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [pickupNote, setPickupNote] = useState('');
  const [dropoffNote, setDropoffNote] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const fetchRide = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('rides')
          .select(`
            *,
            driver:profiles!rides_driver_id_fkey(id, full_name, avatar_url, phone, role, bio),
            vehicle:vehicles(id, make, model, year, color, license_plate, seats_capacity)
          `)
          .eq('id', id)
          .single();

        if (error) {
          setError(error.message);
        } else if (data) {
          setRide(data as unknown as Ride);

          // Check if passenger already has a booking
          if (user) {
            const { data: bData } = await supabase
              .from('bookings')
              .select('*')
              .eq('ride_id', id)
              .eq('passenger_id', user.id)
              .in('status', ['pending', 'accepted'])
              .maybeSingle();

            if (bData) {
              setExistingBooking(bData as Booking);
            }
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch ride details');
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [id, user]);

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth', { state: { from: { pathname: `/ride/${id}` } } });
      return;
    }

    if (!ride || !supabase) return;

    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      // Call atomic RPC function to prevent race conditions and overbooking
      const { data, error: rpcError } = await supabase.rpc('request_booking', {
        p_ride_id: ride.id,
        p_seats: seatsToBook,
        p_pickup: pickupNote.trim() || ride.origin_address,
        p_dropoff: dropoffNote.trim() || ride.destination_address,
      });

      if (rpcError) {
        setBookingError(rpcError.message);
      } else {
        setBookingSuccess('Booking request sent to driver! You will be notified when they accept or decline.');
        // Refresh ride details
        const { data: updatedRide } = await supabase
          .from('rides')
          .select(`*, driver:profiles!rides_driver_id_fkey(*), vehicle:vehicles(*)`)
          .eq('id', ride.id)
          .single();
        if (updatedRide) setRide(updatedRide as unknown as Ride);
      }
    } catch (err: any) {
      setBookingError(err?.message || 'Booking request failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
        <p className="text-sm">Loading ride details...</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Ride Not Found</h2>
        <p className="text-sm text-slate-600 mt-2">
          {error || 'This ride does not exist or has been cancelled by the driver.'}
        </p>
        <Link
          to="/find"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ride Search</span>
        </Link>
      </div>
    );
  }

  const departureDate = new Date(ride.departure_time);
  const isDriver = user?.id === ride.driver_id;
  const isPast = departureDate.getTime() <= Date.now();
  const totalPrice = (ride.price_per_seat * seatsToBook).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/find"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search Results</span>
        </Link>
      </div>

      {/* Grid: Ride Details & Booking Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Ride Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
                  {ride.status === 'scheduled' ? 'Scheduled Trip' : ride.status}
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                  Ride Details
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="font-mono">{ride.id.slice(0, 8)}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${Number(ride.price_per_seat).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 block font-medium">per seat</span>
              </div>
            </div>

            {/* Departure & Schedule */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Departure Date</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {departureDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Departure Time</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {departureDate.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Available Seats</span>
                <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
                  {ride.available_seats} of {ride.total_seats} open
                </span>
              </div>
            </div>

            {/* Route Timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Route Itinerary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-brand-500 mt-1 flex-shrink-0 ring-4 ring-brand-100" />
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">Pickup / Origin</span>
                    <span className="font-bold text-slate-900">{ride.origin_address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500 mt-1 flex-shrink-0 ring-4 ring-rose-100" />
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">Drop-off / Destination</span>
                    <span className="font-bold text-slate-900">{ride.destination_address}</span>
                  </div>
                </div>
              </div>

              {(ride.distance_km || ride.duration_minutes) && (
                <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                  {ride.distance_km && <span>Distance: <strong>{ride.distance_km} km</strong></span>}
                  {ride.duration_minutes && <span>Est. Duration: <strong>{ride.duration_minutes} mins</strong></span>}
                </div>
              )}
            </div>

            {/* Trip Notes */}
            {ride.notes && (
              <div className="border-t border-slate-100 pt-4 space-y-1">
                <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Driver's Notes</span>
                </h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg leading-relaxed">
                  {ride.notes}
                </p>
              </div>
            )}
          </div>

          {/* Driver & Vehicle Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Driver &amp; Vehicle Verification
            </h3>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg overflow-hidden border border-brand-200">
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
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {ride.driver?.full_name || 'Driver'}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Registered Member</span>
                </div>
                {ride.driver?.bio && (
                  <p className="text-xs text-slate-600 mt-1 italic">"{ride.driver.bio}"</p>
                )}
              </div>
            </div>

            {ride.vehicle && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Vehicle Model</span>
                  <span className="font-semibold text-slate-800">
                    {ride.vehicle.color} {ride.vehicle.year} {ride.vehicle.make} {ride.vehicle.model}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">License Plate</span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded inline-block">
                    {ride.vehicle.license_plate}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Map */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Route Map
            </h3>
            <RouteMap
              origin={{ lat: ride.origin_lat, lng: ride.origin_lng, address: ride.origin_address }}
              destination={{ lat: ride.destination_lat, lng: ride.destination_lng, address: ride.destination_address }}
              height="320px"
            />
          </div>
        </div>

        {/* Right Column: Booking Action (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-5">
            <h3 className="text-base font-bold text-slate-900">Request to Join Ride</h3>

            {isDriver ? (
              <div className="bg-brand-50 border border-brand-200 p-4 rounded-xl text-xs text-brand-900 space-y-2">
                <p className="font-semibold">You are the host driver of this ride.</p>
                <p className="text-brand-700">
                  You can view and approve incoming passenger requests from your driver dashboard.
                </p>
                <Link
                  to="/my-rides"
                  className="inline-block mt-2 font-bold text-brand-800 hover:text-brand-950 underline"
                >
                  Manage Offered Rides &rarr;
                </Link>
              </div>
            ) : isPast ? (
              <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-xs text-slate-600">
                This ride departure time has passed. Bookings are closed.
              </div>
            ) : ride.available_seats === 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800">
                This ride is completely full. No seats currently available.
              </div>
            ) : existingBooking ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Booking Request Active</span>
                </div>
                <p>
                  Status: <strong className="uppercase">{existingBooking.status}</strong> ({existingBooking.seats_booked} seat(s) booked).
                </p>
                <Link
                  to="/my-bookings"
                  className="inline-block text-emerald-800 underline font-semibold"
                >
                  View in My Bookings &rarr;
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRequestBooking} className="space-y-4">
                {bookingError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {bookingSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span>{bookingSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Number of Seats
                  </label>
                  <select
                    value={seatsToBook}
                    onChange={(e) => setSeatsToBook(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-white"
                  >
                    {Array.from({ length: Math.min(ride.available_seats, 6) }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'seat' : 'seats'} (${(num * ride.price_per_seat).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pickup Location Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={pickupNote}
                    onChange={(e) => setPickupNote(e.target.value)}
                    placeholder={ride.origin_address}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Drop-off Location Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={dropoffNote}
                    onChange={(e) => setDropoffNote(e.target.value)}
                    placeholder={ride.destination_address}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {/* Price Breakdown */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>${Number(ride.price_per_seat).toFixed(2)} × {seatsToBook} seat(s)</span>
                    <span>${totalPrice}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="text-brand-600">${totalPrice}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition"
                >
                  {bookingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                  <span>{user ? 'Submit Booking Request' : 'Sign In to Request Seat'}</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-tight">
                  No payment is charged now. Requests are confirmed only after driver approval.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
