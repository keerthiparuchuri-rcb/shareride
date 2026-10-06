import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Booking } from '../types/database';
import { 
  BookMarked, 
  Clock, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  X,
  Car
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBookings = async () => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ride:rides(
            id,
            origin_address,
            destination_address,
            departure_time,
            price_per_seat,
            status,
            driver:profiles!rides_driver_id_fkey(full_name, phone, avatar_url)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
      } else if (data) {
        setBookings(data as unknown as Booking[]);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    if (!supabase) return;

    setCancellingId(bookingId);
    setActionMessage(null);

    try {
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
      });

      if (error) {
        setActionMessage({ type: 'error', text: error.message });
      } else {
        setActionMessage({ type: 'success', text: 'Booking cancelled successfully.' });
        await fetchBookings();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Cancellation failed.' });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Pending Approval</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            <span>Declined</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            <span>Cancelled</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
            <span>Completed</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          My Bookings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your upcoming trips, seat reservation status, and booking history.
        </p>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
          <p className="text-sm">Loading bookings from database...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <BookMarked className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Bookings Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven’t requested or booked any rides yet. Search matching routes to travel smarter.
            </p>
          </div>
          <Link
            to="/find"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 transition"
          >
            <span>Search Rides</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const ride = booking.ride;
            const departureDate = ride?.departure_time ? new Date(ride.departure_time) : null;
            const canCancel = booking.status === 'pending' || booking.status === 'accepted';

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      <span className="text-xs text-slate-400">
                        {booking.seats_booked} {booking.seats_booked === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>

                    {departureDate && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      ${Number(booking.total_price).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400">total fare</span>
                  </div>
                </div>

                {/* Route points */}
                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    <span className="truncate">{booking.pickup_address || ride?.origin_address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                    <span className="truncate">{booking.dropoff_address || ride?.destination_address}</span>
                  </div>
                </div>

                {/* Footer: Driver info & actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="text-xs text-slate-600">
                    {ride?.driver ? (
                      <span>Driver: <strong>{ride.driver.full_name}</strong></span>
                    ) : (
                      <span>Driver details verified</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {ride?.id && (
                      <Link
                        to={`/ride/${ride.id}`}
                        className="px-3 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 transition"
                      >
                        View Trip
                      </Link>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      >
                        {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
