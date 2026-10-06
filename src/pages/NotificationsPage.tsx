import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  ShieldAlert, 
  Info, 
  Clock,
  Loader2 
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
        return <Car className="w-4 h-4 text-brand-600" />;
      case 'booking_accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'booking_rejected':
      case 'ride_cancelled':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'safety_alert':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-brand-500" />
            <span>Notifications</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real trip updates, booking requests, and safety messages stored securely in your inbox.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <CheckCheck className="w-4 h-4 text-brand-600" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'unread'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
          <p className="text-sm">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Notifications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You have caught up with all incoming messages.'
              : 'You have no system or booking notifications right now.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                item.is_read
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-brand-50/40 border-brand-200 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs flex-shrink-0 mt-0.5">
                  {getNotificationIcon(item.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <span className="text-[10px] text-slate-400 block pt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!item.is_read && (
                <button
                  onClick={() => markAsRead(item.id)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium flex-shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
