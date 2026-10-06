import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SafetyReport, SafetyReportStatus } from '../types/database';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Car, 
  FileText, 
  Filter, 
  Loader2, 
  Save, 
  Check 
} from 'lucide-react';

export const AdminModerationPage: React.FC = () => {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});
  const [activeStatus, setActiveStatus] = useState<Record<string, SafetyReportStatus>>({});
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Platform stats
  const [totalRides, setTotalRides] = useState<number>(0);
  const [totalBookings, setTotalBookings] = useState<number>(0);

  const fetchReports = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch safety reports
      const { data, error } = await supabase
        .from('safety_reports')
        .select(`
          *,
          reporter:profiles!safety_reports_reporter_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching safety reports:', error);
      } else if (data) {
        setReports(data as unknown as SafetyReport[]);
        const notesMap: Record<string, string> = {};
        const statusMap: Record<string, SafetyReportStatus> = {};
        data.forEach((r: any) => {
          notesMap[r.id] = r.admin_notes || '';
          statusMap[r.id] = r.status;
        });
        setActiveNotes(notesMap);
        setActiveStatus(statusMap);
      }

      // 2. Fetch stats
      const { count: rideCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true });
      if (rideCount !== null) setTotalRides(rideCount);

      const { count: bookCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      if (bookCount !== null) setTotalBookings(bookCount);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateReport = async (reportId: string) => {
    if (!supabase) return;

    setUpdatingId(reportId);
    setSaveSuccessId(null);

    const newStatus = activeStatus[reportId];
    const newNotes = activeNotes[reportId];

    try {
      const { error } = await supabase
        .from('safety_reports')
        .update({
          status: newStatus,
          admin_notes: newNotes,
        })
        .eq('id', reportId);

      if (!error) {
        setSaveSuccessId(reportId);
        setTimeout(() => setSaveSuccessId(null), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = statusFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
          <span>Admin Moderation &amp; Trust Center</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Server-authenticated administrator panel for incident resolution and platform integrity.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Safety Reports</span>
          <span className="text-2xl font-extrabold text-slate-900 block">{reports.length}</span>
          <span className="text-[11px] text-amber-700 font-medium">
            {reports.filter((r) => r.status === 'open').length} pending investigation
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Rides Published</span>
          <span className="text-2xl font-extrabold text-slate-900 block">{totalRides}</span>
          <span className="text-[11px] text-emerald-600 font-medium">In Supabase Database</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Bookings Recorded</span>
          <span className="text-2xl font-extrabold text-slate-900 block">{totalBookings}</span>
          <span className="text-[11px] text-brand-600 font-medium">Atomic transactions</span>
        </div>
      </div>

      {/* Safety Reports List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-base font-bold text-slate-900">
            Safety &amp; Violation Reports ({filtered.length})
          </h2>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 text-xs">
            {['all', 'open', 'investigating', 'resolved', 'dismissed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
            <p className="text-sm">Fetching verified moderation reports...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            No incident reports found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4 text-xs"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                        {report.issue_type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400">
                        Filed {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Reporter: <strong>{report.reporter?.full_name || 'Anonymous User'}</strong> ({report.reporter?.email})
                    </div>

                    {report.ride_id && (
                      <p className="text-slate-500 font-mono text-[11px]">
                        Associated Ride ID: {report.ride_id}
                      </p>
                    )}
                  </div>

                  {/* Status & save action */}
                  <div className="flex items-center gap-2">
                    <select
                      value={activeStatus[report.id] || report.status}
                      onChange={(e) =>
                        setActiveStatus((prev) => ({
                          ...prev,
                          [report.id]: e.target.value as SafetyReportStatus,
                        }))
                      }
                      className="border border-slate-300 rounded-lg p-1.5 text-xs bg-white font-semibold"
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>

                    <button
                      onClick={() => handleUpdateReport(report.id)}
                      disabled={updatingId === report.id}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {updatingId === report.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : saveSuccessId === report.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{saveSuccessId === report.id ? 'Updated' : 'Save'}</span>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  <span className="font-bold text-slate-500 block text-[11px] mb-1">
                    Report Statement:
                  </span>
                  {report.description}
                </div>

                {/* Admin notes input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Moderator Investigation Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={activeNotes[report.id] || ''}
                    onChange={(e) =>
                      setActiveNotes((prev) => ({
                        ...prev,
                        [report.id]: e.target.value,
                      }))
                    }
                    placeholder="Enter confidential notes, actions taken (e.g. driver warned, temporary suspension)..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
