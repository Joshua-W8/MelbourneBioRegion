import { MapContainer, TileLayer, WMSTileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useMapStore from '../store/useMapStore';

// Melbourne coordinates
const MELBOURNE_CENTER = [-37.8136, 144.9631];
const DEFAULT_ZOOM = 13;

// WMS Configuration
const WMS_BASE_URL = 'https://opendata.maps.vic.gov.au/geoserver/wms';
const EVC_LAYER = 'open-data-platform:nv1750_evcbcs';

// Component to handle map click events
function MapClickHandler() {
  const map = useMap();
  const setSelectedEVC = useMapStore((state) => state.setSelectedEVC);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const bounds = map.getBounds();
      const size = map.getSize();
      const point = map.latLngToContainerPoint([lat, lng]);

      // Build GetFeatureInfo URL
      const url = `${WMS_BASE_URL}?` +
        `SERVICE=WMS&` +
        `VERSION=1.3.0&` +
        `REQUEST=GetFeatureInfo&` +
        `FORMAT=image/png&` +
        `TRANSPARENT=true&` +
        `QUERY_LAYERS=${EVC_LAYER}&` +
        `LAYERS=${EVC_LAYER}&` +
        `INFO_FORMAT=application/json&` +
        `I=${Math.round(point.x)}&` +
        `J=${Math.round(point.y)}&` +
        `WIDTH=${size.x}&` +
        `HEIGHT=${size.y}&` +
        `CRS=EPSG:4326&` +
        `BBOX=${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          setSelectedEVC({
            evc: props.evc,
            evcName: props.x_evcname,
            bioregion: props.bioregion,
            bcs: props.evc_bcs,
            bcsDesc: props.evc_bcs_desc,
          });
        } else {
          setSelectedEVC(null);
        }
      } catch (error) {
        console.error('Error fetching EVC info:', error);
      }
    }
  });

  return null;
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

      {/* Victorian EVC WMS layer */}
      <WMSTileLayer
        url={WMS_BASE_URL}
        layers={EVC_LAYER}
        format="image/png"
        transparent={true}
        opacity={0.7}
        attribution="Victorian Government Open Data"
      />

      {/* Click handler */}
      <MapClickHandler />
    </MapContainer>
  );
}

export default MapView;
