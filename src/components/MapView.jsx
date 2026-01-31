import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useState, useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
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

// Flora.ai inspired colors
const THEME_COLORS = {
  dark: {
    fill: '#86efac',
    fillHover: '#a7f3c9',
    stroke: '#166534',
    fillOpacity: 0.9,
    fillOpacityHover: 1,
  },
  light: {
    fill: '#86efac',
    fillHover: '#4ade80',
    stroke: '#166534',
    fillOpacity: 0.85,
    fillOpacityHover: 0.95,
  },
};

// Union polygons by vegetation type
function unionByVegetationType(geojson) {
  const groups = {};

  // Group features and collect EVC info
  geojson.features.forEach((feature) => {
    const vegType = feature.properties?.vegetation_type || 'Unknown';
    if (!groups[vegType]) {
      groups[vegType] = {
        polygons: [],
        evcs: new Map(),
      };
    }
    groups[vegType].polygons.push(feature);

    const evcCode = feature.properties?.evc;
    if (evcCode && !groups[vegType].evcs.has(evcCode)) {
      groups[vegType].evcs.set(evcCode, {
        evc: evcCode,
        evcName: feature.properties?.x_evcname,
        bioregion: feature.properties?.bioregion,
        bcs: feature.properties?.evc_bcs,
        bcsDesc: feature.properties?.evc_bcs_desc,
      });
    }
  });

  // Union each group
  const result = [];
  Object.entries(groups).forEach(([vegType, group]) => {
    const evcsArray = Array.from(group.evcs.values());

    try {
      let merged = null;
      for (const poly of group.polygons) {
        try {
          if (!merged) {
            merged = poly;
          } else {
            merged = turf.union(turf.featureCollection([merged, poly]));
          }
        } catch (e) {
          // Skip invalid polygons
        }
      }

      if (merged) {
        merged.properties = {
          vegetation_type: vegType,
          evcs: evcsArray,
        };
        result.push(merged);
      }
    } catch (error) {
      console.warn(`Union failed for ${vegType}, using fallback`);
      const fallback = { ...group.polygons[0] };
      fallback.properties = {
        vegetation_type: vegType,
        evcs: evcsArray,
      };
      result.push(fallback);
    }
  });

  return {
    type: 'FeatureCollection',
    features: result,
  };
}

// Component to load and display GeoJSON with hover effects
function EVCGeoJSON({ theme }) {
  const [displayData, setDisplayData] = useState(null);
  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  const colors = THEME_COLORS[theme];

  useEffect(() => {
    fetch('/data/melbourne_vegetation_types_ari.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('GeoJSON loaded:', data.features?.length, 'features');
        const merged = unionByVegetationType(data);
        console.log('Merged into:', merged.features?.length, 'vegetation types');
        setDisplayData(merged);
      })
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, []);

  // Style function
  const getFeatureStyle = (feature) => {
    const isSelected = selectedEVC?.vegetationType === feature.properties?.vegetation_type;
    return {
      fillColor: isSelected ? colors.fillHover : colors.fill,
      fillOpacity: isSelected ? colors.fillOpacityHover : colors.fillOpacity,
      stroke: true,
      color: colors.stroke,
      weight: isSelected ? 2 : 1,
      opacity: 1,
    };
  };

  // Handle interactions
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        const props = feature.properties;
        console.log('Clicked:', props.vegetation_type, '- EVCs:', props.evcs?.length);

        setSelectedEVC({
          vegetationType: props.vegetation_type,
          evcs: props.evcs || [],
        });

        L.DomEvent.stopPropagation(e);
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          fillColor: colors.fillHover,
          fillOpacity: colors.fillOpacityHover,
          weight: 2,
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        const layer = e.target;
        const isSelected = selectedEVC?.vegetationType === feature.properties?.vegetation_type;
        layer.setStyle({
          fillColor: isSelected ? colors.fillHover : colors.fill,
          fillOpacity: isSelected ? colors.fillOpacityHover : colors.fillOpacity,
          weight: isSelected ? 2 : 1,
        });
      },
    });
  };

  if (!displayData) {
    return null;
  }

  return (
    <GeoJSON
      key={`geojson-${theme}-${selectedEVC?.vegetationType || 'none'}`}
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

function MapView() {
  const theme = useMapStore((state) => state.theme);

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
    </MapContainer>
  );
}

export default MapView;
