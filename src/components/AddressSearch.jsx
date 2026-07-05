import { useState, useEffect, useRef } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import useMapStore from '../store/useMapStore';
import './AddressSearch.css';

// Abort a request that takes longer than this so a slow/unreachable service
// can't hang the UI. AbortController + fetch `signal` are standard browser
// APIs — no dependency added.
const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ── Local EVC resolution ────────────────────────────────────────────────────
// EVC-at-a-point is resolved locally against the bundled study-area data — no
// live government service. Both files are same-origin static assets loaded the
// same way as the *Service.js data loaders, then cached at module scope.

let vegetationPolygons = null; // FeatureCollection of the 84 mapped EVC polygons
let studyAreaBoundary = null;  // FeatureCollection: the coverage-extent outline

async function loadVegetationPolygons() {
  if (vegetationPolygons) return vegetationPolygons;
  const response = await fetch('/data/vegetation_polygons.geojson');
  if (!response.ok) throw new Error(`Polygon data responded ${response.status}`);
  vegetationPolygons = await response.json();
  return vegetationPolygons;
}

async function loadStudyAreaBoundary() {
  if (studyAreaBoundary) return studyAreaBoundary;
  const response = await fetch('/data/study_area_boundary.geojson');
  if (!response.ok) throw new Error(`Boundary data responded ${response.status}`);
  studyAreaBoundary = await response.json();
  return studyAreaBoundary;
}

// Map a bundled polygon's properties onto the shape the caller already expects
// (the former WMS field names). groupName carries vegetation_type so the store's
// vegetationType lookup keeps working unchanged.
function evcFromFeatureProps(props) {
  return {
    evc: props.evc_number,
    evcName: props.evc_name,
    bioregion: props.bioregion,
    bcs: props.bcs,
    bcsDesc: props.bcs_desc,
    groupName: props.vegetation_type,
  };
}

// Resolve a geocoded coordinate to its EVC by point-in-polygon test.
// Returns the EVC data object, or null if the point is in no mapped polygon.
async function resolveEVCLocally(lat, lng) {
  const fc = await loadVegetationPolygons();
  const point = [lng, lat]; // GeoJSON coordinate order
  for (const feature of fc.features) {
    if (booleanPointInPolygon(point, feature)) {
      return evcFromFeatureProps(feature.properties);
    }
  }
  return null;
}

// Is the coordinate within the overall study-area coverage extent?
async function isWithinStudyArea(lat, lng) {
  const fc = await loadStudyAreaBoundary();
  const point = [lng, lat];
  return fc.features.some((feature) => booleanPointInPolygon(point, feature));
}

// Fetch address suggestions from Nominatim
async function fetchAddressSuggestions(query) {
  if (!query || query.length < 3) return [];

  const searchQuery = query.includes('Victoria') || query.includes('VIC')
    ? query
    : `${query}, Victoria, Australia`;

  // Network error, timeout (abort), or non-OK status throw so the caller can
  // show a "search unavailable" message instead of silently showing nothing.
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&` +
    `q=${encodeURIComponent(searchQuery)}&` +
    `countrycodes=au&` +
    `limit=5&` +
    `addressdetails=1`,
    {
      headers: { 'User-Agent': 'PreColonialMelbourne/1.0' }
    }
  );
  if (!response.ok) {
    throw new Error(`Geocoder responded ${response.status}`);
  }

  const data = await response.json();

  // Filter to Victoria only (coarse lat/lng bounding box — not the study-area
  // polygon; see AUDIT B3 / out-of-study-area is unimplemented, no PIP available)
  return data
    .filter(item => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      return lat >= -39.2 && lat <= -34.0 && lng >= 140.9 && lng <= 150.0;
    })
    .map(item => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
}

function AddressSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  // Geocoder: 'idle' | 'ok' | 'empty' | 'error'
  // Local EVC lookup: 'lookup-error' (bundled data failed to load)
  //   | 'out-of-coverage' (outside study area) | 'no-veg-here' (in area, no polygon)
  const [status, setStatus] = useState('idle');
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions when query changes.
  // All setState lives inside the async run() (not the effect body) so a slow
  // service can't hang the UI and so we don't set state synchronously in the effect.
  useEffect(() => {
    let active = true;

    async function run() {
      if (!debouncedQuery || selectedAddress) {
        setSuggestions([]);
        setShowSuggestions(false);
        setStatus('idle');
        return;
      }

      setIsLoading(true);
      try {
        const results = await fetchAddressSuggestions(debouncedQuery);
        if (!active) return;
        setSuggestions(results);
        setStatus(results.length === 0 ? 'empty' : 'ok');
        setShowSuggestions(true);
      } catch {
        // Network error, timeout/abort, or non-OK response
        if (!active) return;
        setSuggestions([]);
        setStatus('error');
        setShowSuggestions(true);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    run();
    return () => { active = false; };
  }, [debouncedQuery, selectedAddress]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle address selection
  const handleSelectAddress = async (suggestion) => {
    setQuery(suggestion.displayName);
    setSelectedAddress(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    setStatus('idle');

    // Resolve EVC locally (point-in-polygon against bundled study-area data).
    setIsLoading(true);
    let evcData;
    try {
      evcData = await resolveEVCLocally(suggestion.lat, suggestion.lng);
    } catch {
      // Bundled data failed to load — surface it rather than stranding the panel.
      setIsLoading(false);
      setStatus('lookup-error');
      return;
    }

    if (evcData) {
      setIsLoading(false);
      setSelectedEVC({
        ...evcData,
        vegetationType: evcData.groupName || null,
        searchedAddress: suggestion.displayName,
        coordinates: { lat: suggestion.lat, lng: suggestion.lng },
      });
      return;
    }

    // Not in any mapped polygon — distinguish "inside study area but unmapped"
    // from "outside coverage". Never call setSelectedEVC with placeholder data.
    let inArea = false;
    try {
      inArea = await isWithinStudyArea(suggestion.lat, suggestion.lng);
    } catch {
      // Boundary failed to load — fall back to the outside-coverage message.
      inArea = false;
    }
    setIsLoading(false);
    setStatus(inArea ? 'no-veg-here' : 'out-of-coverage');
  };

  // Clear the search
  const handleClear = () => {
    setQuery('');
    setSelectedAddress(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setStatus('idle');
    inputRef.current?.focus();
  };

  return (
    <div className="address-search" ref={wrapperRef}>
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search address in Victoria..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedAddress(null);
          }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        {isLoading && <span className="search-spinner" />}
        {query && !isLoading && (
          <button className="clear-btn" onClick={handleClear} title="Clear search">
            ×
          </button>
        )}
      </div>

      {showSuggestions && (
        <ul className="suggestions-list">
          {status === 'error' && (
            <li className="suggestion-message">
              Address search is unavailable right now — please try again.
            </li>
          )}
          {status === 'empty' && (
            <li className="suggestion-message">
              No matching addresses found in Victoria.
            </li>
          )}
          {status === 'ok' && suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="suggestion-item"
              onClick={() => handleSelectAddress(suggestion)}
            >
              {suggestion.displayName}
            </li>
          ))}
        </ul>
      )}

      {status === 'lookup-error' && (
        <div className="search-error" role="alert">
          Couldn’t look up vegetation for this address — please try again.
        </div>
      )}

      {status === 'out-of-coverage' && (
        <div className="search-notice" role="status">
          This address is outside Verdea’s current coverage area (City of Melbourne study area).
        </div>
      )}

      {status === 'no-veg-here' && (
        <div className="search-notice" role="status">
          No pre-colonial vegetation is mapped at this exact location.
        </div>
      )}
    </div>
  );
}

export default AddressSearch;
