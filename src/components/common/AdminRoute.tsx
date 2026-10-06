import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Loader2, Home } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Verifying authorization...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-slate-600 mt-2">
          Admin privileges are required to view this page. Your account role is currently{' '}
          <span className="font-semibold text-slate-800">{profile?.role || 'rider'}</span>.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Admin status must be updated directly in the Supabase database <code className="bg-slate-100 px-1 py-0.5 rounded">profiles</code> table (set <code className="bg-slate-100 px-1 py-0.5 rounded">role = 'admin'</code>).
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition"
        >
          <Home className="w-4 h-4" />
          <span>Return to Home</span>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
