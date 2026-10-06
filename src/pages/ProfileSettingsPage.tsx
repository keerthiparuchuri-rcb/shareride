import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Vehicle } from '../types/database';
import { 
  User, 
  Phone, 
  Mail, 
  Camera, 
  Car, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

export const ProfileSettingsPage: React.FC = () => {
  const { user, profile, updateProfile, refreshProfile } = useAuth();

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [role, setRole] = useState(profile?.role || 'rider');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vehicles list
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // New vehicle modal/form
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState(new Date().getFullYear());
  const [vColor, setVColor] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vSeats, setVSeats] = useState(4);
  const [addingVehicle, setAddingVehicle] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
      setRole(profile.role || 'rider');
    }
  }, [profile]);

  const fetchVehicles = async () => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setLoadingVehicles(false);
      return;
    }
    setLoadingVehicles(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setVehicles(data as Vehicle[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    const { error } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      bio: bio.trim() || null,
      role: role as any,
    });

    setSavingProfile(false);
    if (error) {
      setProfileMsg({ type: 'error', text: error.message });
    } else {
      setProfileMsg({ type: 'success', text: 'Profile saved successfully!' });
      await refreshProfile();
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    setAddingVehicle(true);

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          driver_id: user.id,
          make: vMake.trim(),
          model: vModel.trim(),
          year: vYear,
          color: vColor.trim(),
          license_plate: vPlate.trim().toUpperCase(),
          seats_capacity: vSeats,
        })
        .select()
        .single();

      if (error) {
        setProfileMsg({ type: 'error', text: error.message });
      } else if (data) {
        setVehicles((prev) => [data as Vehicle, ...prev]);
        setShowAddVehicle(false);
        setVMake('');
        setVModel('');
        setVColor('');
        setVPlate('');
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || 'Failed to add vehicle.' });
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('Delete this vehicle from your profile?')) return;
    if (!supabase) return;

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (!error) {
        setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Profile &amp; Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details, role, and registered vehicles.
        </p>
      </div>

      {profileMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            profileMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {profileMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          )}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" />
          <span>Account Information</span>
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Primary Platform Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-white"
              >
                <option value="rider">Passenger / Rider</option>
                <option value="driver">Driver (Can offer rides)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Short Bio / About You
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Daily commuter on the I-280 corridor. Software engineer and quiet passenger."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Driver Vehicles Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-600" />
            <span>Registered Vehicles</span>
          </h2>

          <button
            onClick={() => setShowAddVehicle(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </button>
        </div>

        {loadingVehicles ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-500 space-y-2">
            <p>No vehicles added yet.</p>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
            >
              Add Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">
                    {v.year} {v.make} {v.model} ({v.color})
                  </span>
                  <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] inline-block mt-1">
                    Plate: {v.license_plate}
                  </span>
                  <span className="text-slate-400 block text-[11px] mt-0.5">
                    {v.seats_capacity} Passenger Seats Max
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteVehicle(v.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  title="Remove vehicle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Vehicle</h3>

            <form onSubmit={handleAddVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Honda"
                    value={vMake}
                    onChange={(e) => setVMake(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Civic"
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    value={vYear}
                    onChange={(e) => setVYear(parseInt(e.target.value) || 2020)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Color</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blue"
                    value={vColor}
                    onChange={(e) => setVColor(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Seats</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={vSeats}
                    onChange={(e) => setVSeats(parseInt(e.target.value) || 4)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC9876"
                  value={vPlate}
                  onChange={(e) => setVPlate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="px-4 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 disabled:opacity-50"
                >
                  {addingVehicle ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
