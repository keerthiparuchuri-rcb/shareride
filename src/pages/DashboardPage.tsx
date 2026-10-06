import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Booking, Ride } from '../types/database';
import { 
  Car, 
  Search, 
  PlusCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  BookMarked, 
  ShieldCheck, 
  Bell, 
  ArrowRight,
  Loader2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { unreadCount, notifications } = useNotifications();

  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [upcomingOfferedRides, setUpcomingOfferedRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const nowIso = new Date().toISOString();

        // 1. Fetch upcoming passenger bookings
        const { data: bData } = await supabase
          .from('bookings')
          .select(`
            *,
            ride:rides(id, origin_address, destination_address, departure_time, price_per_seat, driver:profiles!rides_driver_id_fkey(full_name))
          `)
          .eq('passenger_id', user.id)
          .in('status', ['pending', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (bData) setUpcomingBookings(bData as unknown as Booking[]);

        // 2. Fetch upcoming offered driver rides
        const { data: rData } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .eq('status', 'scheduled')
          .gt('departure_time', nowIso)
          .order('departure_time', { ascending: true })
          .limit(5);

        if (rData) setUpcomingOfferedRides(rData as unknown as Ride[]);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-semibold border border-brand-500/30">
            <span>{profile?.role === 'driver' ? 'Driver Account' : 'Passenger Account'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {profile?.full_name || 'Traveler'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Welcome to your RouteMates hub. Track upcoming itineraries, view booking responses, and manage your shared routes.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/find"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find a Ride</span>
          </Link>
          <Link
            to="/offer"
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/25 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Offer a Ride</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400 block">Active Bookings</span>
          <span className="text-2xl font-extrabold text-slate-900">
            {upcomingBookings.length}
          </span>
          <Link to="/my-bookings" className="text-[11px] text-brand-600 font-semibold block pt-1">
            View bookings &rarr;
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400 block">Scheduled As Driver</span>
          <span className="text-2xl font-extrabold text-slate-900">
            {upcomingOfferedRides.length}
          </span>
          <Link to="/my-rides" className="text-[11px] text-brand-600 font-semibold block pt-1">
            View driver trips &rarr;
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400 block">Unread Notifications</span>
          <span className="text-2xl font-extrabold text-slate-900">
            {unreadCount}
          </span>
          <Link to="/notifications" className="text-[11px] text-brand-600 font-semibold block pt-1">
            Open inbox &rarr;
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400 block">Safety Status</span>
          <span className="text-sm font-bold text-emerald-600 flex items-center gap-1 pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Active &amp; Protected</span>
          </span>
          <Link to="/safety" className="text-[11px] text-brand-600 font-semibold block pt-1">
            Safety Center &rarr;
          </Link>
        </div>
      </div>

      {/* Main Content: Passenger Bookings & Driver Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Active Passenger Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-brand-600" />
              <span>Upcoming Passenger Trips</span>
            </h2>
            <Link to="/my-bookings" className="text-xs font-semibold text-brand-600 hover:text-brand-800">
              See all
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
              <span>Loading trips...</span>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <p>No active passenger bookings.</p>
              <Link
                to="/find"
                className="inline-block text-brand-600 font-semibold hover:underline"
              >
                Find a route to join &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="font-bold text-slate-900">
                      ${Number(b.total_price).toFixed(2)}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800 truncate">
                    {b.ride?.origin_address?.split(',')[0]} &rarr; {b.ride?.destination_address?.split(',')[0]}
                  </p>

                  <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                    <span>Seats: {b.seats_booked}</span>
                    <Link
                      to={`/ride/${b.ride_id}`}
                      className="text-brand-600 font-semibold hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Driver Rides */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-brand-600" />
              <span>Upcoming Offered Driver Trips</span>
            </h2>
            <Link to="/my-rides" className="text-xs font-semibold text-brand-600 hover:text-brand-800">
              Manage rides
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
              <span>Loading rides...</span>
            </div>
          ) : upcomingOfferedRides.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <p>No upcoming trips published as a driver.</p>
              <Link
                to="/offer"
                className="inline-block text-brand-600 font-semibold hover:underline"
              >
                Post an upcoming commute &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingOfferedRides.map((r) => {
                const departure = new Date(r.departure_time);
                return (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {departure.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {departure.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-emerald-600 font-bold">
                        {r.available_seats} of {r.total_seats} seats left
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800 truncate">
                      {r.origin_address.split(',')[0]} &rarr; {r.destination_address.split(',')[0]}
                    </p>

                    <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                      <span>${Number(r.price_per_seat).toFixed(2)}/seat</span>
                      <Link
                        to="/my-rides"
                        className="text-brand-600 font-semibold hover:underline"
                      >
                        Manage Requests
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
