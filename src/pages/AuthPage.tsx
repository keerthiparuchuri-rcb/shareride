import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/database';
import { Car, Lock, Mail, User, Shield, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, resetPassword, isConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('rider');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setError('Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          const from = (location.state as any)?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Please provide your full legal or preferred name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          setError(error.message);
        } else {
          setSuccessMsg('Account created successfully! Check your email if email confirmation is enabled on your Supabase project, or sign in now.');
          setMode('signin');
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccessMsg('Password reset link sent! Check your inbox.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white mx-auto shadow-md shadow-brand-500/20">
            <Car className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your RouteMates Account'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'signin' && 'Sign in to access your rides and bookings'}
            {mode === 'signup' && 'Join verified passengers and drivers in your area'}
            {mode === 'forgot' && 'Enter your registered email address to receive a reset link'}
          </p>
        </div>

        {/* Tab switcher for Sign In / Sign Up */}
        {mode !== 'forgot' && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alert Notifications */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('rider')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition text-center ${
                      role === 'rider'
                        ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Passenger / Rider
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition text-center ${
                      role === 'driver'
                        ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Vehicle Driver
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
            </span>
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Back to Sign In
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-tight">
            Protected by Supabase Auth with Row-Level Security encryption. By signing up, you agree to fair-cost sharing and safe travel etiquette.
          </p>
        </div>
      </div>
    </div>
  );
};
