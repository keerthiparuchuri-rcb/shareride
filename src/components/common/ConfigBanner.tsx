import React, { useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AlertTriangle, Key, ChevronDown, ChevronUp, Copy, Check, MapPin } from 'lucide-react';

export const ConfigBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const missingSupabase = !isSupabaseConfigured;

  if (!missingSupabase) {
    return null;
  }

  const copyEnvTemplate = () => {
    const text = `VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 font-medium">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span>
              Configuration Required: Supabase credentials missing or invalid in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code>.
            </span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded transition"
          >
            <span>{isOpen ? 'Hide Instructions' : 'View Setup Guide'}</span>
            {isOpen ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 pt-3 border-t border-amber-200/70 text-xs text-amber-900 space-y-3">
            <p className="font-semibold">
              RouteMates uses OpenStreetMap, Leaflet, Nominatim, and OSRM for zero-cost, open-source mapping (no map API key needed).
              To connect real authentication and ride database, add your Supabase credentials:
            </p>

            <div className="bg-amber-100/80 p-3 rounded-md font-mono flex items-start justify-between">
              <pre className="overflow-x-auto whitespace-pre">
{`VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-or-publishable-key>`}
              </pre>
              <button
                onClick={copyEnvTemplate}
                className="ml-2 inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
                title="Copy environment variable template"
              >
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-white/70 p-2.5 rounded border border-amber-200">
                <div className="font-semibold flex items-center gap-1 text-amber-950">
                  <Key className="h-3.5 w-3.5 text-amber-700" />
                  Supabase Setup &amp; Migration
                </div>
                <p className="mt-1 text-slate-700">
                  1. Run SQL migration located in <code className="font-mono text-amber-900">supabase/migrations/20250101000000_routemates_schema.sql</code> in your Supabase SQL Editor.
                </p>
                <p className="text-slate-700">
                  2. Copy Project URL and Anon/Publishable Key into <code className="font-mono">.env</code>.
                </p>
              </div>

              <div className="bg-white/70 p-2.5 rounded border border-amber-200">
                <div className="font-semibold flex items-center gap-1 text-amber-950">
                  <MapPin className="h-3.5 w-3.5 text-amber-700" />
                  OpenStreetMap &amp; OSRM Active
                </div>
                <p className="mt-1 text-slate-700">
                  Maps, address search (Nominatim), and road routing (OSRM) are enabled without billing or API keys.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
