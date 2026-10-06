import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Car, 
  Search, 
  PlusCircle, 
  Shield, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  BookMarked, 
  ShieldAlert,
  ChevronDown 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setProfileDropdownOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-brand-500 group-hover:bg-brand-600 transition flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-brand-600 transition">
                RouteMates
              </span>
              <span className="hidden sm:block text-[10px] tracking-wider uppercase font-semibold text-slate-400 -mt-1">
                Same Route. Shared Ride.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/find"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                isActive('/find')
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find a Ride</span>
            </Link>

            <Link
              to="/offer"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                isActive('/offer')
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Offer a Ride</span>
            </Link>

            <Link
              to="/safety"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                isActive('/safety')
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Safety</span>
            </Link>

            {user && (
              <Link
                to="/dashboard"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  isActive('/dashboard')
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                {/* Notifications Bell */}
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profile?.full_name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-800 max-w-[120px] truncate">
                      {profile?.full_name || 'My Account'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div
                      onMouseLeave={() => setProfileDropdownOpen(false)}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="font-semibold text-slate-900 truncate">
                          {profile?.full_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                          {profile?.role || 'rider'}
                        </span>
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        <span>Trip Dashboard</span>
                      </Link>

                      <Link
                        to="/my-bookings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <BookMarked className="w-4 h-4 text-slate-400" />
                        <span>My Bookings</span>
                      </Link>

                      <Link
                        to="/my-rides"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <Car className="w-4 h-4 text-slate-400" />
                        <span>My Offered Rides</span>
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Profile &amp; Vehicles</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-amber-700 bg-amber-50/60 hover:bg-amber-50 font-medium"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>Admin Moderation</span>
                        </Link>
                      )}

                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 text-left font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                to="/notifications"
                className="relative p-2 text-slate-600"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/find"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
          >
            <Search className="w-4 h-4 text-brand-600" />
            <span>Find a Ride</span>
          </Link>

          <Link
            to="/offer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
          >
            <PlusCircle className="w-4 h-4 text-brand-600" />
            <span>Offer a Ride</span>
          </Link>

          <Link
            to="/safety"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
          >
            <Shield className="w-4 h-4 text-brand-600" />
            <span>Safety &amp; Contacts</span>
          </Link>

          {user ? (
            <>
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <BookMarked className="w-4 h-4 text-slate-400" />
                  <span>My Bookings</span>
                </Link>

                <Link
                  to="/my-rides"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <Car className="w-4 h-4 text-slate-400" />
                  <span>My Offered Rides</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile &amp; Vehicles</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-amber-700 bg-amber-50 font-medium"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Admin Moderation</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="border-t border-slate-100 pt-3 mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700"
              >
                Sign In
              </Link>
              <Link
                to="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-brand-500 text-sm font-semibold text-white"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
