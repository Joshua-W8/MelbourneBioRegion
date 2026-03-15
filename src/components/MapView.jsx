import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import useMapStore from '../store/useMapStore';
import './MapView.css';

// Melbourne coordinates
const MELBOURNE_CENTER = [144.9631, -37.8136]; // [lng, lat] for MapLibre
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

// Bounds to restrict panning (covers vegetation area with padding)
const MAX_BOUNDS = [
  [144.75, -37.95],  // Southwest [lng, lat]
  [145.15, -37.65],  // Northeast [lng, lat]
];

// Tile layer URLs for different themes
const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

// Vegetation type color palette
const VEGETATION_COLORS = {
  'Grasslands and Woodlands on fertile plains': '#7aad4a',
  'River banks and creeklines': '#3d8a6e',
  'Woodlands and heathlands on sand': '#8fb040',
  'Freshwater wetland': '#4a8a8a',
  'Swamp scrub': '#6b8c3a',
  'Coastal marshlands and brackish flats': '#5a9da0',
  'Saltmarsh': '#5c8c3a',
  'Saltwater wetland': '#2e6b3e',
  'Beach and Dunes': '#a4c43e',
  'Cliffs and escarpments': '#4a7c59',
};

const DEFAULT_COLOR = '#7aad4a';

// Build MapLibre color expression from vegetation types
function buildColorExpression() {
  const colorStops = [];
  for (const [vegType, color] of Object.entries(VEGETATION_COLORS)) {
    colorStops.push(vegType, color);
  }
  return ['match', ['get', 'vegetation_type'], ...colorStops, DEFAULT_COLOR];
}

// Build raster source config for CartoDB tiles
function buildRasterSource(theme) {
  return {
    type: 'raster',
    tiles: [
      TILE_URLS[theme].replace('{s}', 'a'),
      TILE_URLS[theme].replace('{s}', 'b'),
      TILE_URLS[theme].replace('{s}', 'c'),
    ],
    tileSize: 256,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  };
}

function MapView() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const selectedFeatureIdRef = useRef(null);

  const theme = useMapStore((state) => state.theme);
  const showNeighbourhoods = useMapStore((state) => state.showNeighbourhoods);
  const showUrbanContext = useMapStore((state) => state.showUrbanContext);
  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  // Keep selectedEVC ref in sync for event handlers
  useEffect(() => {
    selectedFeatureIdRef.current = selectedEVC?._fid ?? null;
  }, [selectedEVC]);

  // Reset view handler
  const handleResetView = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: MELBOURNE_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 1000,
    });
    setSelectedEVC(null);
  }, [setSelectedEVC]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-tiles': buildRasterSource(theme),
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#d8d5ce',
              'background-opacity': 1,
            },
          },
          {
            id: 'carto-basemap',
            type: 'raster',
            source: 'carto-tiles',
            paint: {
              'raster-opacity': 0.35,
            },
          },
        ],
      },
      center: MELBOURNE_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: MAX_BOUNDS,
    });

    // Add zoom controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    // Create popup for hover
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    map.on('load', () => {
      // Add vegetation polygons source
      map.addSource('vegetation', {
        type: 'geojson',
        data: '/data/vegetation_polygons.geojson',
        generateId: true,
      });

      // Add fill layer
      map.addLayer({
        id: 'vegetation-fill',
        type: 'fill',
        source: 'vegetation',
        paint: {
          'fill-color': buildColorExpression(),
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.95,
            ['boolean', ['feature-state', 'hover'], false],
            0.9,
            0.82,
          ],
        },
      });

      // Add stroke layer
      map.addLayer({
        id: 'vegetation-stroke',
        type: 'line',
        source: 'vegetation',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ffffff',
            '#2d8a4e',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2.5,
            0.75,
          ],
          'line-opacity': 1,
        },
      });


      // Add suburb boundaries source (conditional)
      map.addSource('suburbs', {
        type: 'geojson',
        data: '/data/melbourne_suburbs.geojson',
      });

      map.addLayer({
        id: 'suburbs-boundary',
        type: 'line',
        source: 'suburbs',
        paint: {
          'line-color': theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)',
          'line-width': 1,
        },
        layout: {
          visibility: showNeighbourhoods ? 'visible' : 'none',
        },
      });

      // Add suburb labels
      map.addLayer({
        id: 'suburbs-labels',
        type: 'symbol',
        source: 'suburbs',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-anchor': 'center',
          visibility: showNeighbourhoods ? 'visible' : 'none',
        },
        paint: {
          'text-color': theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)',
          'text-halo-color': theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
          'text-halo-width': 1.5,
        },
      });

      // Hover handlers
      let hoveredFeatureId = null;

      map.on('mousemove', 'vegetation-fill', (e) => {
        if (e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';

          // Clear previous hover
          if (hoveredFeatureId !== null) {
            map.setFeatureState(
              { source: 'vegetation', id: hoveredFeatureId },
              { hover: false }
            );
          }

          hoveredFeatureId = e.features[0].id;
          map.setFeatureState(
            { source: 'vegetation', id: hoveredFeatureId },
            { hover: true }
          );

          // Show tooltip
          const props = e.features[0].properties;
          const evcName = props.evc_name || 'Unknown';
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(evcName)
            .addTo(map);
        }
      });

      map.on('mouseleave', 'vegetation-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredFeatureId !== null) {
          map.setFeatureState(
            { source: 'vegetation', id: hoveredFeatureId },
            { hover: false }
          );
        }
        hoveredFeatureId = null;
        popupRef.current.remove();
      });

      // Click handler
      map.on('click', 'vegetation-fill', (e) => {
        if (e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;
        const featureId = feature.id;

        // Clear previous selection
        if (selectedFeatureIdRef.current !== null) {
          map.setFeatureState(
            { source: 'vegetation', id: selectedFeatureIdRef.current },
            { selected: false }
          );
        }

        // Set new selection
        map.setFeatureState(
          { source: 'vegetation', id: featureId },
          { selected: true }
        );
        selectedFeatureIdRef.current = featureId;

        // Parse soil_types_all if it's a JSON string
        let soilTypesAll = null;
        if (props.soil_types_all) {
          try {
            soilTypesAll = JSON.parse(props.soil_types_all);
          } catch (err) {
            soilTypesAll = null;
          }
        }

        // Update store with selected EVC data
        setSelectedEVC({
          _fid: featureId,
          patchId: props.patch_id,
          evc: props.evc_number,
          evcName: props.evc_name,
          vegetationType: props.vegetation_type,
          bioregion: props.bioregion,
          bcs: props.bcs,
          bcsDesc: props.bcs_desc,
          hectares: props.hectares,
          soilType: props.soil_type,
          soilSubBase: props.soil_sub_base,
          soilTypesAll: soilTypesAll,
        });

        // Fly to feature bounds with padding for info panel
        const bounds = getBoundsFromFeature(feature);
        if (bounds) {
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 400 },
            maxZoom: 16,
            duration: 800,
          });
        }
      });

      // Clear selection when clicking outside polygons
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['vegetation-fill'],
        });
        if (features.length === 0 && selectedFeatureIdRef.current !== null) {
          map.setFeatureState(
            { source: 'vegetation', id: selectedFeatureIdRef.current },
            { selected: false }
          );
          selectedFeatureIdRef.current = null;
          setSelectedEVC(null);
        }
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Update basemap tiles
    if (map.getSource('carto-tiles')) {
      map.removeLayer('carto-basemap');
      map.removeSource('carto-tiles');
      map.addSource('carto-tiles', buildRasterSource(theme));

      // Re-add basemap as first layer
      const layers = map.getStyle().layers;
      const firstLayerId = layers.find(l => l.id !== 'carto-basemap')?.id;
      map.addLayer({
        id: 'carto-basemap',
        type: 'raster',
        source: 'carto-tiles',
        paint: {
          'raster-opacity': 0.35,
        },
      }, firstLayerId);
    }

    // Update suburb styles
    if (map.getLayer('suburbs-boundary')) {
      map.setPaintProperty(
        'suburbs-boundary',
        'line-color',
        theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'
      );
    }
    if (map.getLayer('suburbs-labels')) {
      map.setPaintProperty(
        'suburbs-labels',
        'text-color',
        theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)'
      );
      map.setPaintProperty(
        'suburbs-labels',
        'text-halo-color',
        theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'
      );
    }
  }, [theme]);

  // Toggle suburb boundaries visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const visibility = showNeighbourhoods ? 'visible' : 'none';
    if (map.getLayer('suburbs-boundary')) {
      map.setLayoutProperty('suburbs-boundary', 'visibility', visibility);
    }
    if (map.getLayer('suburbs-labels')) {
      map.setLayoutProperty('suburbs-labels', 'visibility', visibility);
    }
  }, [showNeighbourhoods]);

  // Toggle urban context (currently basemap includes labels, so this is a no-op)
  // If needed, we could add a separate labels-only layer here
  useEffect(() => {
    // Urban context is included in the basemap (light_all/dark_all includes labels)
    // If you want labels-only overlay, switch basemap to light_nolabels/dark_nolabels
    // and add a separate labels layer here
  }, [showUrbanContext]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainerRef} className="map-container" />
      <button
        className="reset-view-btn"
        onClick={handleResetView}
        title="Reset view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}

// Calculate bounds from a GeoJSON feature
function getBoundsFromFeature(feature) {
  const coords = [];

  function extractCoords(geometry) {
    if (!geometry) return;

    if (geometry.type === 'Polygon') {
      geometry.coordinates[0].forEach(coord => coords.push(coord));
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon[0].forEach(coord => coords.push(coord));
      });
    }
  }

  extractCoords(feature.geometry);

  if (coords.length === 0) return null;

  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;

  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return [[minLng, minLat], [maxLng, maxLat]];
}

export default MapView;
