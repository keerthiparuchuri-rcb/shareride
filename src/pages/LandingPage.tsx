import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Car, 
  Search, 
  ShieldCheck, 
  DollarSign, 
  Leaf, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Navigation
} from 'lucide-react';
import { PlaceAutocompleteInput } from '../components/common/PlaceAutocompleteInput';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat?: number; lng?: number }>({});
  const [dropoffCoords, setDropoffCoords] = useState<{ lat?: number; lng?: number }>({});
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(1);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (pickup) query.set('origin', pickup);
    if (dropoff) query.set('destination', dropoff);
    if (pickupCoords.lat) query.set('origin_lat', pickupCoords.lat.toString());
    if (pickupCoords.lng) query.set('origin_lng', pickupCoords.lng.toString());
    if (dropoffCoords.lat) query.set('dest_lat', dropoffCoords.lat.toString());
    if (dropoffCoords.lng) query.set('dest_lng', dropoffCoords.lng.toString());
    if (date) query.set('date', date);
    if (seats) query.set('seats', seats.toString());

    navigate(`/find?${query.toString()}`);
  };

  return (
    <div className="space-y-20 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-brand-50/60 via-white to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-200/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Smarter Carpooling Network
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Same Route. Shared Ride. <br />
              <span className="text-brand-600">Smarter Travel.</span>
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Connect with drivers and passengers heading along your exact journey. 
              Split fuel costs fairly, reduce highway congestion, and travel safer with atomic seat bookings.
            </p>
          </div>

          {/* SEARCH BOX CARD */}
          <div className="mt-10 max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 md:p-8">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PlaceAutocompleteInput
                  id="hero-pickup"
                  label="Pickup Location"
                  value={pickup}
                  onChange={(address, lat, lng) => {
                    setPickup(address);
                    setPickupCoords({ lat, lng });
                  }}
                  placeholder="Leaving from (address, station, or city)..."
                  required
                />

                <PlaceAutocompleteInput
                  id="hero-dropoff"
                  label="Drop-off Destination"
                  value={dropoff}
                  onChange={(address, lat, lng) => {
                    setDropoff(address);
                    setDropoffCoords({ lat, lng });
                  }}
                  placeholder="Going to (office, campus, or landmark)..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    Seats Needed
                  </label>
                  <select
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'seat' : 'seats'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>Find Rides</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Quick Features Row */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <span>Real Database Matching</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <span>OSRM Road Detour Check</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <span>Atomic Seat Locking</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <span>Safety &amp; Trusted Contacts</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY ROUTEMATES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for Reliability &amp; Safety
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            No simulated data, no inflated numbers. Just seamless route-matching with actual drivers and riders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Detour Matching</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Find rides where the driver’s route aligns closely with your pickup and drop-off, keeping driver detours under tight limits.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Accountability &amp; Reporting</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              View vehicle details, license plate, and driver identity before booking. Manage emergency contacts and submit incident reports with admin review.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Fair Cost Sharing</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Transparent per-seat pricing set directly by drivers to offset actual fuel and toll costs without inflated commercial surcharges.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-100/60 py-16 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How RouteMates Works</h2>
            <p className="text-sm text-slate-600 mt-2">
              Three straightforward steps from search to arrival.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Publish or Search Route</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Drivers publish planned itineraries with departure times. Passengers search matching origins and destinations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Request &amp; Driver Approval</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Riders request seats. Drivers review requests and approve them atomically to prevent overbooking.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Ride &amp; Review</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Meet at the agreed pickup point, travel safely, and submit verified reviews upon trip completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DRIVER CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="max-w-xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400 bg-brand-950/80 px-3 py-1 rounded-full border border-brand-800">
              Driving Somewhere?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Turn Empty Seats into Fuel Savings
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Don’t drive with an empty car. Post your commute or road trip schedule in less than two minutes and accept verified passengers along your way.
            </p>
            <div className="pt-2">
              <Link
                to="/offer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5"
              >
                <span>Offer a Ride Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
