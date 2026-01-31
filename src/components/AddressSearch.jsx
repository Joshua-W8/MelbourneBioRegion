import { useState, useEffect, useRef } from 'react';
import useMapStore from '../store/useMapStore';
import './AddressSearch.css';

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// WMS Configuration for EVC lookup
const WMS_BASE_URL = 'https://opendata.maps.vic.gov.au/geoserver/wms';
const EVC_LAYER = 'open-data-platform:nv1750_evcbcs';

// Fetch EVC data for coordinates using WMS GetFeatureInfo
async function fetchEVCAtLocation(lat, lng) {
  // We need to create a small bounding box around the point
  const delta = 0.0001; // Small offset for bbox
  const bbox = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;

  const url = `${WMS_BASE_URL}?` +
    `SERVICE=WMS&` +
    `VERSION=1.3.0&` +
    `REQUEST=GetFeatureInfo&` +
    `FORMAT=image/png&` +
    `TRANSPARENT=true&` +
    `QUERY_LAYERS=${EVC_LAYER}&` +
    `LAYERS=${EVC_LAYER}&` +
    `INFO_FORMAT=application/json&` +
    `I=50&J=50&` +
    `WIDTH=101&HEIGHT=101&` +
    `CRS=EPSG:4326&` +
    `BBOX=${bbox}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const props = data.features[0].properties;
      return {
        evc: props.evc,
        evcName: props.x_evcname,
        bioregion: props.bioregion,
        bcs: props.evc_bcs,
        bcsDesc: props.evc_bcs_desc,
        groupName: props.x_groupname,
        subgroupName: props.x_subgroupname,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching EVC:', error);
    return null;
  }
}

// Fetch address suggestions from Nominatim
async function fetchAddressSuggestions(query) {
  if (!query || query.length < 3) return [];

  const searchQuery = query.includes('Victoria') || query.includes('VIC')
    ? query
    : `${query}, Victoria, Australia`;

  try {
    const response = await fetch(
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

    const data = await response.json();

    // Filter to Victoria only
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
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

function AddressSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debouncedQuery && !selectedAddress) {
      setIsLoading(true);
      fetchAddressSuggestions(debouncedQuery).then(results => {
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setIsLoading(false);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
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

    // Fetch EVC data for this location
    setIsLoading(true);
    const evcData = await fetchEVCAtLocation(suggestion.lat, suggestion.lng);
    setIsLoading(false);

    if (evcData) {
      setSelectedEVC({
        ...evcData,
        searchedAddress: suggestion.displayName,
        coordinates: { lat: suggestion.lat, lng: suggestion.lng },
      });
    } else {
      setSelectedEVC({
        evc: null,
        evcName: 'No vegetation data',
        bioregion: 'Unknown',
        bcs: null,
        bcsDesc: 'No EVC data found at this location',
        searchedAddress: suggestion.displayName,
        coordinates: { lat: suggestion.lat, lng: suggestion.lng },
      });
    }
  };

  // Clear the search
  const handleClear = () => {
    setQuery('');
    setSelectedAddress(null);
    setSuggestions([]);
    setShowSuggestions(false);
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
          {suggestions.map((suggestion, index) => (
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
    </div>
  );
}

export default AddressSearch;
