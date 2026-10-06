import React from 'react';
import { Link } from 'react-router-dom';
import { Car, ShieldCheck, Heart, AlertOctagon } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { isGoogleMapsConfigured } from '../../lib/googleMaps';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                <Car className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">RouteMates</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Same Route. Shared Ride. Smarter Travel. A peer-to-peer carpooling platform designed for safer, greener commutes.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="text-xs text-slate-400">
                {isSupabaseConfigured ? 'Supabase Connected' : 'Configuration Pending'}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/find" className="hover:text-white transition">
                  Find a Ride
                </Link>
              </li>
              <li>
                <Link to="/offer" className="hover:text-white transition">
                  Offer a Ride
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  Trip Dashboard
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-white transition">
                  Safety Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety & Trust */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Safety &amp; Trust
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/safety" className="hover:text-white transition flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                  <span>Trusted Contacts</span>
                </Link>
              </li>
              <li>
                <Link to="/safety#report" className="hover:text-white transition">
                  File Safety Report
                </Link>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Community Guidelines
                </span>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Payment Security (Upcoming)
                </span>
              </li>
            </ul>
          </div>

          {/* Honest Emergency Notice */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
              <AlertOctagon className="w-4 h-4 flex-shrink-0" />
              <span>Emergency Disclaimer</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              RouteMates is a ride-matching tool. We do not provide real-time 911 dispatch or live law enforcement tracking. If you are in immediate danger, always call local emergency services (911/112).
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} RouteMates Inc. Powered by Supabase &amp; OpenStreetMap.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400">Strict Data Privacy</span>
            <span>•</span>
            <span className="hover:text-slate-400">No Demo / Mock Accounts</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
