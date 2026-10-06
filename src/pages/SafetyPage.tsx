import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TrustedContact, SafetyIssueType } from '../types/database';
import { 
  ShieldCheck, 
  AlertTriangle, 
  PhoneCall, 
  UserPlus, 
  Trash2, 
  Share2, 
  FileWarning, 
  CheckCircle2, 
  Loader2,
  Lock,
  Copy,
  Check
} from 'lucide-react';

export const SafetyPage: React.FC = () => {
  const { user } = useAuth();

  // Trusted Contacts state
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cRel, setCRel] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Safety Report state
  const [issueType, setIssueType] = useState<SafetyIssueType>('safety_concern');
  const [reportDesc, setReportDesc] = useState('');
  const [reportRideId, setReportRideId] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Share trip helper state
  const [shareInputRideId, setShareInputRideId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchContacts = async () => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setLoadingContacts(false);
      return;
    }
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setContacts(data as TrustedContact[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    setSavingContact(true);

    try {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .insert({
          user_id: user.id,
          name: cName.trim(),
          phone: cPhone.trim(),
          relationship: cRel.trim() || null,
        })
        .select()
        .single();

      if (!error && data) {
        setContacts((prev) => [data as TrustedContact, ...prev]);
        setShowAddContact(false);
        setCName('');
        setCPhone('');
        setCRel('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('trusted_contacts').delete().eq('id', id);
      if (!error) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;

    setSubmittingReport(true);
    setReportError(null);
    setReportSuccess(false);

    try {
      const { error } = await supabase.from('safety_reports').insert({
        reporter_id: user.id,
        issue_type: issueType,
        description: reportDesc.trim(),
        ride_id: reportRideId.trim() || null,
        status: 'open',
      });

      if (error) {
        setReportError(error.message);
      } else {
        setReportSuccess(true);
        setReportDesc('');
        setReportRideId('');
      }
    } catch (err: any) {
      setReportError(err?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const copyTripShareLink = () => {
    if (!shareInputRideId) return;
    const url = `${window.location.origin}/ride/${shareInputRideId.trim()}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Safety Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-brand-600" />
          <span>Safety Center &amp; Guidance</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Peer-to-peer ridesharing works when built on transparency, trusted contacts, and prompt reporting.
        </p>
      </div>

      {/* Emergency Protocol & Transparent Limitations */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-base text-rose-800">
          <PhoneCall className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>Emergency Assistance Protocol</span>
        </div>
        <p className="text-xs text-rose-800/90 leading-relaxed">
          <strong>Immediate Danger:</strong> If you are ever in an emergency, feel physically threatened, or have an accident, immediately call your local emergency authorities: <strong>911 (US/Canada)</strong> or <strong>112 (EU/International)</strong>.
        </p>
        <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-[11px] text-rose-800 space-y-1">
          <p className="font-semibold">Transparent Safety Limitations:</p>
          <p>
            RouteMates does not provide live telematics tracking, private armed dispatch, or automated law enforcement integration. All safety reporting is reviewed by platform moderators.
          </p>
        </div>
      </div>

      {/* Trusted Contacts Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Trusted Contacts</h2>
            <p className="text-xs text-slate-500">
              Save family members or friends who you notify when traveling.
            </p>
          </div>

          {user && (
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          )}
        </div>

        {/* Add Contact inline form */}
        {showAddContact && (
          <form onSubmit={handleAddContact} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800">New Trusted Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Miller"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 123-4567"
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  placeholder="e.g. Spouse, Parent, Friend"
                  value={cRel}
                  onChange={(e) => setCRel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddContact(false)}
                className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingContact}
                className="px-4 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 disabled:opacity-50"
              >
                {savingContact ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        )}

        {/* Contacts list */}
        {!user ? (
          <p className="text-xs text-slate-400 italic">Sign in to manage trusted contacts.</p>
        ) : loadingContacts ? (
          <p className="text-xs text-slate-400">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No trusted contacts added yet. Add someone you trust.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{contact.name}</span>
                  <span className="text-slate-600 block">{contact.phone}</span>
                  {contact.relationship && (
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {contact.relationship}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Remove contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Trip Link Tool */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-brand-600" />
          <span>Share Your Itinerary Link</span>
        </h2>
        <p className="text-xs text-slate-500">
          Share your confirmed trip page with friends or family so they know your driver details, vehicle plate, and route schedule.
        </p>

        <div className="flex items-center gap-2 max-w-lg">
          <input
            type="text"
            placeholder="Paste your Ride ID here..."
            value={shareInputRideId}
            onChange={(e) => setShareInputRideId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={copyTripShareLink}
            disabled={!shareInputRideId.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Safety Incident Reporting Form */}
      <div id="report" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-amber-600" />
            <span>File an Incident or Safety Report</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Reports are encrypted and immediately queued for platform administrators to review and take disciplinary action.
          </p>
        </div>

        {reportSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Your safety report has been filed securely. Our moderation team will investigate.</span>
          </div>
        )}

        {reportError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{reportError}</span>
          </div>
        )}

        {user ? (
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issue Classification
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as SafetyIssueType)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none bg-white"
                >
                  <option value="safety_concern">General Safety Concern</option>
                  <option value="reckless_driving">Reckless Driving</option>
                  <option value="harassment">Harassment or Inappropriate Behavior</option>
                  <option value="vehicle_mismatch">Vehicle / License Plate Mismatch</option>
                  <option value="lateness_no_show">No Show / Excessive Delay</option>
                  <option value="fraud">Fraud / Extortion</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ride ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={reportRideId}
                  onChange={(e) => setReportRideId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Describe what occurred, including times, location, and any relevant communication..."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submittingReport}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                {submittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Report to Moderators</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            Please sign in to file an authenticated incident report.
          </div>
        )}
      </div>
    </div>
  );
};
