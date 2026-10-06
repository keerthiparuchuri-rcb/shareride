import React, { useEffect, useRef, useState, useCallback } from 'react';
import { searchAddressNominatim, reverseGeocodeNominatim, GeocodingResult } from '../../lib/openStreetMap';
import { MapPin, Navigation, Loader2, X, Search } from 'lucide-react';

interface PlaceAutocompleteInputProps {
  label: string;
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Search address, landmark, or city...',
  required = false,
  id = 'place-autocomplete',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal input value with prop if changed externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle clicking outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search adhering to Nominatim usage policy (no per-keystroke spam)
  const triggerDebouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressNominatim(trimmed, 5);
        setSuggestions(results);
        setDropdownOpen(results.length > 0);
      } catch (err) {
        console.warn('Geocoding search error:', err);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 600); // 600ms debounce
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    onChange(newVal); // update text in parent
    triggerDebouncedSearch(newVal);
  };

  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    setInputValue(suggestion.displayName);
    setDropdownOpen(false);
    setSuggestions([]);
    onChange(suggestion.displayName, suggestion.lat, suggestion.lng);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setDropdownOpen(false);
    onChange('', undefined, undefined);
  };

  // Browser Geolocation (triggered ONLY on explicit user button click)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocodeNominatim(latitude, longitude);
          setInputValue(address);
          onChange(address, latitude, longitude);
        } catch {
          const fallback = `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setInputValue(fallback);
          onChange(fallback, latitude, longitude);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please enter address manually.');
        } else {
          setGpsError('Could not retrieve GPS location. Please enter address manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div ref={containerRef} className="w-full relative">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* Explicit GPS button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={gpsLoading}
          className="inline-flex items-center text-xs text-brand-600 hover:text-brand-700 font-medium transition disabled:opacity-50"
          title="Use browser GPS location with permission"
        >
          {gpsLoading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1 text-brand-600" />
          ) : (
            <Navigation className="h-3 w-3 mr-1 text-brand-600" />
          )}
          <span>{gpsLoading ? 'Getting GPS...' : 'Use Current Location'}</span>
        </button>
      </div>

      <div className="relative rounded-lg shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {searching ? (
            <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setDropdownOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="block w-full rounded-lg border border-slate-300 pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            title="Clear text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {gpsError && (
        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
          {gpsError}
        </p>
      )}

      {/* Nominatim Suggestions Dropdown */}
      {dropdownOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-xs max-h-60 overflow-y-auto animate-in fade-in duration-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>OpenStreetMap Locations</span>
            <span>OSM Nominatim</span>
          </div>
          {suggestions.map((item) => (
            <button
              key={item.placeId}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-brand-50/70 border-b border-slate-100 last:border-b-0 flex items-start gap-2.5 transition text-slate-800"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 truncate">
                <span className="block font-medium truncate">{item.displayName}</span>
                <span className="text-[10px] text-slate-400">
                  {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
