import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useMapStore from '../store/useMapStore';

// Melbourne coordinates
const MELBOURNE_CENTER = [-37.8136, 144.9631];
const DEFAULT_ZOOM = 13;

// Bounds to restrict panning (covers vegetation area with padding)
const MAX_BOUNDS = [
  [-37.95, 144.75],  // Southwest
  [-37.65, 145.15],  // Northeast
];

// Tile layer URLs for different themes
const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
};

// Urban context uses the same base but with labels overlaid
const URBAN_LABEL_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
};

// Suburb boundary styles
const SUBURB_STYLES = {
  dark: { color: 'rgba(255,255,255,0.35)', weight: 1, fill: false },
  light: { color: 'rgba(0,0,0,0.2)', weight: 1, fill: false },
};

const SUBURB_LABEL_STYLES = {
  dark: 'color:rgba(255,255,255,0.6);text-shadow:0 1px 3px rgba(0,0,0,0.8)',
  light: 'color:rgba(0,0,0,0.45);text-shadow:0 1px 3px rgba(255,255,255,0.8)',
};

// Flora.ai inspired colors
const THEME_COLORS = {
  dark: {
    fill: '#86efac',
    fillHover: '#a7f3c9',
    stroke: '#2d8a4e',
    fillOpacity: 0.9,
    fillOpacityHover: 1,
  },
  light: {
    fill: '#86efac',
    fillHover: '#4ade80',
    stroke: '#2d8a4e',
    fillOpacity: 0.85,
    fillOpacityHover: 0.95,
  },
};

// Assign a stable unique _fid to each feature
function addFeatureIds(geojson) {
  geojson.features.forEach((feature, i) => {
    feature.properties._fid = i;
  });
  return geojson;
}

// Compute stroke weight from zoom: thinner when zoomed out, thicker when zoomed in
// zoom 12 → 0.5, zoom 13 → 0.75, zoom 15 → 1.25, zoom 17 → 1.75
function weightForZoom(zoom) {
  return Math.max(0.25, (zoom - 11) * 0.25);
}

// Component to load and display GeoJSON with hover effects
function EVCGeoJSON({ theme }) {
  const [displayData, setDisplayData] = useState(null);
  const geoJsonRef = useRef(null);
  const selectedRef = useRef(null);
  const colorsRef = useRef(THEME_COLORS[theme]);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  const colors = THEME_COLORS[theme];
  colorsRef.current = colors;

  // Keep selectedRef in sync so event handlers always read current value
  selectedRef.current = selectedEVC?._fid ?? null;

  // Update fill styles imperatively when selection changes (no re-mount)
  useEffect(() => {
    if (!geoJsonRef.current) return;
    const selFid = selectedEVC?._fid ?? null;
    geoJsonRef.current.eachLayer((layer) => {
      const fid = layer.feature?.properties?._fid;
      const isSel = fid === selFid;
      layer.setStyle({
        fillColor: isSel ? colors.fillHover : colors.fill,
        fillOpacity: isSel ? colors.fillOpacityHover : colors.fillOpacity,
      });
    });
  }, [selectedEVC?._fid, colors]);

  // Track zoom changes and update stroke weight on all layers
  useMapEvents({
    zoomend: (e) => {
      const z = e.target.getZoom();
      zoomRef.current = z;
      const w = weightForZoom(z);
      if (geoJsonRef.current) {
        geoJsonRef.current.eachLayer((layer) => {
          layer.setStyle({ weight: w });
        });
      }
    },
  });

  useEffect(() => {
    fetch('/data/melbourne_vegetation_types_ari.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('GeoJSON loaded:', data.features?.length, 'features');
        setDisplayData(addFeatureIds(data));
      })
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, []);

  // Initial style (applied once when GeoJSON mounts)
  const getFeatureStyle = useCallback(() => ({
    fillColor: colors.fill,
    fillOpacity: colors.fillOpacity,
    stroke: true,
    color: colors.stroke,
    weight: weightForZoom(zoomRef.current),
    opacity: 1,
  }), [colors]);

  // Handle interactions — uses refs so handlers never go stale
  const onEachFeature = useCallback((feature, layer) => {
    layer.on({
      click: (e) => {
        const p = feature.properties;
        setSelectedEVC({
          _fid: p._fid,
          evc: p.evc,
          evcName: p.x_evcname,
          vegetationType: p.vegetation_type,
          bioregion: p.bioregion,
          bcs: p.evc_bcs,
          bcsDesc: p.evc_bcs_desc,
        });
        L.DomEvent.stopPropagation(e);
      },
      mouseover: (e) => {
        const c = colorsRef.current;
        e.target.setStyle({
          fillColor: c.fillHover,
          fillOpacity: c.fillOpacityHover,
        });
      },
      mouseout: (e) => {
        const c = colorsRef.current;
        const isSelected = selectedRef.current === feature.properties?._fid;
        e.target.setStyle({
          fillColor: isSelected ? c.fillHover : c.fill,
          fillOpacity: isSelected ? c.fillOpacityHover : c.fillOpacity,
        });
      },
    });
  }, [setSelectedEVC]);

  if (!displayData) {
    return null;
  }

  return (
    <GeoJSON
      ref={geoJsonRef}
      key={`geojson-${theme}`}
      data={displayData}
      style={getFeatureStyle}
      onEachFeature={onEachFeature}
    />
  );
}

// Theme-aware tile layer component
function ThemeTileLayer({ theme }) {
  const url = TILE_URLS[theme];

  return (
    <TileLayer
      key={`tiles-${theme}`}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url={url}
      maxZoom={19}
    />
  );
}

// Compute minimum zoom at which a suburb label should appear based on its area
function minZoomForArea(boundsArea) {
  if (boundsArea > 0.001) return 12;  // very large suburbs — always visible
  if (boundsArea > 0.0004) return 13;
  if (boundsArea > 0.0001) return 14;
  return 15;                           // small suburbs — only when zoomed in
}

// Suburb boundaries with zoom-aware labels overlay
function SuburbBoundaries({ theme }) {
  const [suburbData, setSuburbData] = useState(null);
  const labelsRef = useRef([]);     // { marker, minZoom }[]
  const map = useMap();

  useEffect(() => {
    fetch('/data/melbourne_suburbs.geojson')
      .then(r => r.json())
      .then(data => setSuburbData(data))
      .catch(err => console.error('Error loading suburbs:', err));
  }, []);

  // Create labels once and manage visibility by zoom
  useEffect(() => {
    if (!suburbData || !map) return;

    const entries = [];
    suburbData.features.forEach(feature => {
      const name = feature.properties.name;
      if (!name) return;

      const bounds = L.geoJSON(feature).getBounds();
      const center = bounds.getCenter();
      const boundsArea =
        (bounds.getNorth() - bounds.getSouth()) *
        (bounds.getEast() - bounds.getWest());
      const minZoom = minZoomForArea(boundsArea);

      const marker = L.marker(center, {
        icon: L.divIcon({
          className: 'suburb-label',
          html: `<span style="font-size:11px;font-weight:500;font-family:Inter,sans-serif;white-space:nowrap;${SUBURB_LABEL_STYLES[theme]}">${name}</span>`,
          iconSize: null,
        }),
        interactive: false,
      });

      entries.push({ marker, minZoom });
    });

    labelsRef.current = entries;

    // Initial visibility pass
    const zoom = map.getZoom();
    entries.forEach(({ marker, minZoom }) => {
      if (zoom >= minZoom) marker.addTo(map);
    });

    // Update visibility on zoom
    const onZoom = () => {
      const z = map.getZoom();
      entries.forEach(({ marker, minZoom }) => {
        if (z >= minZoom && !map.hasLayer(marker)) {
          marker.addTo(map);
        } else if (z < minZoom && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
    };
    map.on('zoomend', onZoom);

    return () => {
      map.off('zoomend', onZoom);
      entries.forEach(({ marker }) => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
      labelsRef.current = [];
    };
  }, [suburbData, map, theme]);

  if (!suburbData) return null;

  return (
    <GeoJSON
      key={`suburbs-${theme}`}
      data={suburbData}
      style={() => SUBURB_STYLES[theme]}
      interactive={false}
    />
  );
}

function MapView() {
  const theme = useMapStore((state) => state.theme);
  const showNeighbourhoods = useMapStore((state) => state.showNeighbourhoods);
  const showUrbanContext = useMapStore((state) => state.showUrbanContext);

  return (
    <MapContainer
      center={MELBOURNE_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={12}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      className="map-container"
    >
      <ThemeTileLayer theme={theme} />
      <EVCGeoJSON theme={theme} />
      {showNeighbourhoods && <SuburbBoundaries theme={theme} />}
      {showUrbanContext && (
        <TileLayer
          key={`urban-labels-${theme}`}
          url={URBAN_LABEL_URLS[theme]}
          maxZoom={19}
        />
      )}
    </MapContainer>
  );
}

export default MapView;
