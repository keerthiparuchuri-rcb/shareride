import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { ConfigBanner } from './components/common/ConfigBanner';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';

import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { FindRidePage } from './pages/FindRidePage';
import { OfferRidePage } from './pages/OfferRidePage';
import { RideDetailPage } from './pages/RideDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { MyOfferedRidesPage } from './pages/MyOfferedRidesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { SafetyPage } from './pages/SafetyPage';
import { AdminModerationPage } from './pages/AdminModerationPage';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <ConfigBanner />
      <Navbar />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/find" element={<FindRidePage />} />
          <Route path="/ride/:id" element={<RideDetailPage />} />
          <Route path="/safety" element={<SafetyPage />} />

          {/* Authenticated Routes */}
          <Route
            path="/offer"
            element={
              <ProtectedRoute>
                <OfferRidePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-rides"
            element={
              <ProtectedRoute>
                <MyOfferedRidesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Secure Admin Route */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminModerationPage />
              </AdminRoute>
            }
          />

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <div className="max-w-md mx-auto my-20 p-8 text-center bg-white rounded-2xl border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
                <p className="text-xs text-slate-500 mt-2">
                  The page you are looking for doesn’t exist or has moved.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-block px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 transition"
                >
                  Return to Home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
