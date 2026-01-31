import useMapStore from '../store/useMapStore';
import { LIKELIHOOD_CODES } from '../data/evcMappings';
import './InfoPanel.css';

// Conservation status color mapping
const STATUS_COLORS = {
  E: { color: '#d32f2f', label: 'Endangered' },
  V: { color: '#f57c00', label: 'Vulnerable' },
  D: { color: '#fbc02d', label: 'Depleted' },
  LC: { color: '#388e3c', label: 'Least Concern' },
};

function PlantList() {
  const plants = useMapStore((state) => state.plants);
  const isLoadingPlants = useMapStore((state) => state.isLoadingPlants);
  const fetchPlants = useMapStore((state) => state.fetchPlants);

  if (isLoadingPlants) {
    return <div className="loading-plants">Loading plants...</div>;
  }

  if (plants.length === 0) {
    return (
      <button className="show-plants-btn" onClick={fetchPlants}>
        Show Plants
      </button>
    );
  }

  return (
    <div className="plant-list-container">
      <h3 className="plant-list-title">
        Pre-colonial Plants ({plants.length})
      </h3>
      <div className="plant-list">
        {plants.map((plant, index) => {
          const likelihood = LIKELIHOOD_CODES[plant._likelihoodCode] || {
            label: plant._likelihoodCode,
            color: '#999',
          };

          return (
            <div key={index} className="plant-item">
              <div className="plant-names">
                <span className="plant-common-name">
                  {plant.common_name_s || 'Unknown'}
                </span>
                <span className="plant-scientific-name">
                  {plant.species}
                </span>
              </div>
              <span
                className="likelihood-badge"
                style={{ backgroundColor: likelihood.color }}
                title={likelihood.label}
              >
                {plant._likelihoodCode}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DioramaButton() {
  const plants = useMapStore((state) => state.plants);
  const setViewMode = useMapStore((state) => state.setViewMode);

  if (plants.length === 0) {
    return null;
  }

  return (
    <button
      className="diorama-btn"
      onClick={() => setViewMode('diorama')}
    >
      View 3D Ecosystem
    </button>
  );
}

function EVCList({ evcs }) {
  const getStatusStyle = (status) => {
    const statusInfo = STATUS_COLORS[status] || STATUS_COLORS.LC;
    return {
      backgroundColor: statusInfo.color,
    };
  };

  if (!evcs || evcs.length === 0) return null;

  return (
    <div className="evc-list-container">
      <span className="field-label">Ecological Vegetation Classes ({evcs.length}):</span>
      <div className="evc-list">
        {evcs.map((evc, index) => (
          <div key={index} className="evc-item">
            <div className="evc-item-header">
              <span className="evc-item-name">{evc.evcName}</span>
              <span
                className="evc-status-badge"
                style={getStatusStyle(evc.bcs)}
                title={evc.bcsDesc}
              >
                {evc.bcs}
              </span>
            </div>
            <span className="evc-item-code">EVC {evc.evc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoPanel() {
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  return (
    <div className="info-panel">
      <h2 className="info-panel-title">Pre-Colonial Melbourne</h2>

      {selectedEVC ? (
        <div className="evc-details">
          <div className="vegetation-type-name">
            {selectedEVC.vegetationType}
          </div>

          <EVCList evcs={selectedEVC.evcs} />

          <PlantList />
          <DioramaButton />
        </div>
      ) : (
        <div className="empty-state">
          Click on the map to discover what grew here before colonisation
        </div>
      )}
    </div>
  );
}

export default InfoPanel;
