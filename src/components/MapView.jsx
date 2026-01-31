import { MapContainer, TileLayer, GeoJSON, Rectangle } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
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

// Bounds for the dark overlay (covers very large area to prevent edge visibility when panning)
const OVERLAY_BOUNDS = [
  [-45.0, 140.0],  // Southwest - extended far beyond viewable area
  [-30.0, 150.0],  // Northeast - extended far beyond viewable area
];

// Color mapping for vegetation types - all shades of green
const VEGETATION_COLORS = {
  'Grasslands and Woodlands on fertile plains': '#90EE90',   // Light green
  'River banks and creeklines': '#228B22',                   // Forest green
  'Freshwater wetland': '#20B2AA',                           // Light sea green
  'Coastal marshlands and brackish flats': '#3CB371',        // Medium sea green
  'Saltmarsh': '#6B8E23',                                    // Olive drab
  'Swamp scrub': '#2E8B57',                                  // Sea green
  'Woodlands and heathlands on sand': '#9ACD32',             // Yellow green
  'Wet heathland': '#32CD32',                                // Lime green
  'Beach and Dunes': '#8FBC8F',                              // Dark sea green
  'Saltwater wetland': '#66CDAA',                            // Medium aquamarine
  'Cliffs and escarpments': '#556B2F',                       // Dark olive green
  'Woodlands and forests on sedimentary hills, valleys and ridges': '#006400', // Dark green
  'Water body': '#2F4F4F',                                   // Dark slate gray
  'Unknown': '#808080',                                      // Grey
};

// Get color for a vegetation type
function getVegetationColor(vegetationType) {
  return VEGETATION_COLORS[vegetationType] || '#4CAF50'; // Default green
}

// Style function for GeoJSON features
function getFeatureStyle(feature) {
  return {
    fillColor: '#92f488',
    fillOpacity: 1,
    stroke: true,
    color: '#134a38',
    weight: 1,
    opacity: 1,
  };
}

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
      // Try to union all polygons
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
      // Fallback: use first polygon with combined properties
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

// Component to load and display GeoJSON
function EVCGeoJSON() {
  const [displayData, setDisplayData] = useState(null);
  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);

  useEffect(() => {
    fetch('/data/melbourne_vegetation_types_ari.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('GeoJSON loaded:', data.features?.length, 'features');

        // Union polygons by vegetation type
        const merged = unionByVegetationType(data);
        console.log('Merged into:', merged.features?.length, 'vegetation types');

        setDisplayData(merged);
      })
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, []);

  // Handle click
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
    });
  };

  if (!displayData) {
    return null;
  }

  return (
    <GeoJSON
      data={displayData}
      style={getFeatureStyle}
      onEachFeature={onEachFeature}
    />
  );
}

function MapView() {
  return (
    <MapContainer
      center={MELBOURNE_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={12}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      className="map-container"
    >
      {/* Dark base layer - no overlay needed */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      {/* Local GeoJSON EVC layer */}
      <EVCGeoJSON />
    </MapContainer>
  );
}

export default MapView;
