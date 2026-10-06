import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Ride, Booking } from '../types/database';
import { 
  Car, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  PlusCircle, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface RideWithBookings extends Ride {
  bookings?: (Booking & { passenger?: { full_name: string; phone: string | null; avatar_url: string | null } })[];
}

export const MyOfferedRidesPage: React.FC = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideWithBookings[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);

  const fetchOfferedRides = async () => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          vehicle:vehicles(*),
          bookings:bookings(
            *,
            passenger:profiles!bookings_passenger_id_fkey(full_name, phone, avatar_url)
          )
        `)
        .eq('driver_id', user.id)
        .order('departure_time', { ascending: false });

      if (error) {
        console.error('Error fetching driver rides:', error);
      } else if (data) {
        setRides(data as unknown as RideWithBookings[]);
        if (data.length > 0 && !expandedRideId) {
          setExpandedRideId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load offered rides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferedRides();
  }, [user]);

  // Driver responds to booking request
  const handleBookingDecision = async (bookingId: string, decision: 'accepted' | 'rejected') => {
    if (!supabase) return;
    setActionLoadingId(bookingId);
    setActionMsg(null);

    try {
      const { data, error } = await supabase.rpc('respond_to_booking', {
        p_booking_id: bookingId,
        p_decision: decision,
      });

      if (error) {
        setActionMsg({ type: 'error', text: error.message });
      } else {
        setActionMsg({
          type: 'success',
          text: `Booking request has been ${decision}.`,
        });
        await fetchOfferedRides();
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Operation failed.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Driver cancels ride
  const handleCancelRide = async (rideId: string) => {
    if (!window.confirm('Are you sure you want to cancel this entire scheduled ride? All active bookings will be cancelled and riders notified.')) {
      return;
    }
    if (!supabase) return;

    setActionLoadingId(rideId);
    setActionMsg(null);

    try {
      const { data, error } = await supabase.rpc('cancel_ride', {
        p_ride_id: rideId,
      });

      if (error) {
        setActionMsg({ type: 'error', text: error.message });
      } else {
        setActionMsg({ type: 'success', text: 'Ride successfully cancelled.' });
        await fetchOfferedRides();
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Failed to cancel ride.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Offered Rides &amp; Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your scheduled trips and approve or decline incoming passenger booking requests.
          </p>
        </div>

        <Link
          to="/offer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publish New Ride</span>
        </Link>
      </div>

      {actionMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
          <p className="text-sm">Fetching driver trips from database...</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Car className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Rides Offered Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven’t published any trips yet. Share your daily commute or road trip to save on travel expenses.
            </p>
          </div>
          <Link
            to="/offer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 transition"
          >
            <span>Offer a Ride</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => {
            const departureDate = new Date(ride.departure_time);
            const isExpanded = expandedRideId === ride.id;
            const pendingRequests = ride.bookings?.filter((b) => b.status === 'pending') || [];
            const acceptedBookings = ride.bookings?.filter((b) => b.status === 'accepted') || [];
            const canCancelRide = ride.status === 'scheduled';

            return (
              <div
                key={ride.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedRideId(isExpanded ? null : ride.id)}
                  className="p-5 cursor-pointer hover:bg-slate-50/60 transition flex items-start justify-between flex-wrap gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          ride.status === 'scheduled'
                            ? 'bg-brand-50 text-brand-700'
                            : ride.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ride.status}
                      </span>
                      {pendingRequests.length > 0 && (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-xs animate-pulse">
                          {pendingRequests.length} Pending Request(s)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pt-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {departureDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {departureDate.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      <strong>{ride.origin_address.split(',')[0]}</strong> &rarr;{' '}
                      <strong>{ride.destination_address.split(',')[0]}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <div className="text-base font-extrabold text-slate-900">
                        ${Number(ride.price_per_seat).toFixed(2)}
                      </div>
                      <span className="text-emerald-600 font-bold">
                        {ride.available_seats} of {ride.total_seats} seats left
                      </span>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details & Requests Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-5 bg-slate-50/30">
                    {/* Actions bar */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                      <Link
                        to={`/ride/${ride.id}`}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        View Public Ride Page &rarr;
                      </Link>

                      {canCancelRide && (
                        <button
                          onClick={() => handleCancelRide(ride.id)}
                          disabled={actionLoadingId === ride.id}
                          className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoadingId === ride.id ? 'Cancelling...' : 'Cancel Entire Ride'}
                        </button>
                      )}
                    </div>

                    {/* Pending Requests */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Pending Booking Requests ({pendingRequests.length})
                      </h4>

                      {pendingRequests.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No pending requests right now.</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingRequests.map((req) => (
                            <div
                              key={req.id}
                              className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between flex-wrap gap-3"
                            >
                              <div className="text-xs">
                                <span className="font-bold text-slate-900 block">
                                  {req.passenger?.full_name || 'Passenger'}
                                </span>
                                <span className="text-slate-500">
                                  Requested {req.seats_booked} seat(s) • Total: ${Number(req.total_price).toFixed(2)}
                                </span>
                                {req.pickup_address && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                                    Pickup: {req.pickup_address}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleBookingDecision(req.id, 'accepted')}
                                  disabled={actionLoadingId === req.id || ride.available_seats < req.seats_booked}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => handleBookingDecision(req.id, 'rejected')}
                                  disabled={actionLoadingId === req.id}
                                  className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Accepted Riders */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Confirmed Passengers ({acceptedBookings.length})
                      </h4>

                      {acceptedBookings.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No confirmed passengers yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {acceptedBookings.map((b) => (
                            <div
                              key={b.id}
                              className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {b.passenger?.full_name}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  {b.seats_booked} seat(s) booked
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Confirmed
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
