import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useMapStore from '../store/useMapStore';

// Melbourne coordinates
const MELBOURNE_CENTER = [-37.8136, 144.9631];
const DEFAULT_ZOOM = 13;

// Color mapping for the 12 vegetation types
const VEGETATION_COLORS = {
  'Grasslands and Woodlands on fertile plains': '#8BC34A',   // Light green
  'River banks and creeklines': '#2E7D32',                   // Dark green
  'Freshwater wetland': '#1565C0',                           // Blue
  'Coastal marshlands and brackish flats': '#0288D1',        // Light blue
  'Saltmarsh': '#F57F17',                                    // Amber
  'Swamp scrub': '#00695C',                                  // Teal
  'Woodlands and heathlands on sand': '#558B2F',             // Olive green
  'Cliffs and escarpments': '#6D4C41',                       // Brown
  'Water body': '#0D47A1',                                   // Dark blue
  'Unknown': '#9E9E9E',                                      // Grey
};

// Get color for a vegetation type
function getVegetationColor(vegetationType) {
  return VEGETATION_COLORS[vegetationType] || '#4CAF50'; // Default green
}

// Style function for GeoJSON features
function getFeatureStyle(feature) {
  const vegetationType = feature.properties?.vegetation_type || '';
  const color = getVegetationColor(vegetationType);

  return {
    fillColor: color,
    fillOpacity: 0.6,
    color: '#333',      // Border color
    weight: 1,          // Border width
    opacity: 0.8,       // Border opacity
  };
}

// Component to load and display GeoJSON
function EVCGeoJSON() {
  const [geoData, setGeoData] = useState(null);
  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);

  useEffect(() => {
    fetch('/data/melbourne_vegetation_types_ari.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('GeoJSON loaded:', data.features?.length, 'features');
        setGeoData(data);
      })
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, []);

  // Handle click on a polygon
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        const props = feature.properties;
        console.log('Clicked:', props.vegetation_type, '-', props.x_evcname);

        setSelectedEVC({
          evc: props.evc,
          evcName: props.x_evcname,
          bioregion: props.bioregion,
          bcs: props.evc_bcs,
          bcsDesc: props.evc_bcs_desc,
          vegetationType: props.vegetation_type,
          groupName: props.x_groupname,
          subgroupName: props.x_subgroupname,
        });

        // Stop propagation so map click doesn't fire
        L.DomEvent.stopPropagation(e);
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          fillOpacity: 0.8,
          weight: 2,
        });
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle({
          fillOpacity: 0.6,
          weight: 1,
        });
      },
    });
  };

  if (!geoData) {
    return null;
  }

  return (
    <GeoJSON
      data={geoData}
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
      className="map-container"
    >
      {/* OpenStreetMap base layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Local GeoJSON EVC layer */}
      <EVCGeoJSON />
    </MapContainer>
  );
}

export default MapView;
