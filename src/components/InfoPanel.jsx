import { useState, useMemo } from 'react';
import useMapStore from '../store/useMapStore';
import { LIKELIHOOD_CODES } from '../data/evcMappings';
import PlantModal from './PlantModal';
import './InfoPanel.css';

// Group plants by likelihood code
function groupPlantsByLikelihood(plants) {
  const groups = {};

  // Define the order of likelihood codes (highest first)
  const order = ['3.2', '3.1', '2.2', '2.1', '-'];

  plants.forEach(plant => {
    const code = plant._likelihoodCode || '-';
    if (!groups[code]) {
      groups[code] = [];
    }
    groups[code].push(plant);
  });

  // Return ordered array of groups
  return order
    .filter(code => groups[code] && groups[code].length > 0)
    .map(code => ({
      code,
      plants: groups[code],
      ...LIKELIHOOD_CODES[code] || { label: code, color: '#999' }
    }));
}

// Plant Card Component
function PlantCard({ plant, onClick }) {
  return (
    <div className="plant-card" onClick={() => onClick(plant)}>
      <div className="plant-card-image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22V12M12 12C12 12 8 8 8 5C8 2 12 2 12 2C12 2 16 2 16 5C16 8 12 12 12 12Z" />
          <path d="M12 12C12 12 16 10 19 10C22 10 22 14 22 14C22 14 22 18 19 18C16 18 12 12 12 12Z" />
          <path d="M12 12C12 12 8 10 5 10C2 10 2 14 2 14C2 14 2 18 5 18C8 18 12 12 12 12Z" />
        </svg>
      </div>
      <div className="plant-card-info">
        <div className="plant-card-common">
          {plant.common_name_s || 'Unknown'}
        </div>
        <div className="plant-card-scientific">
          {plant.species}
        </div>
      </div>
    </div>
  );
}

// Likelihood Accordion Component
function LikelihoodAccordion({ group, isOpen, onToggle, onPlantClick }) {
  return (
    <div className="likelihood-accordion">
      <button className="accordion-header" onClick={onToggle}>
        <div className="accordion-title">
          <span
            className="likelihood-dot"
            style={{ backgroundColor: group.color }}
          />
          <span className="accordion-label">{group.label}</span>
          <span className="accordion-count">{group.plants.length}</span>
        </div>
        <span className={`accordion-chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="accordion-content-inner">
          <div className="plant-cards-grid">
            {group.plants.map((plant, index) => (
              <PlantCard key={index} plant={plant} onClick={onPlantClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlantAccordions() {
  const plants = useMapStore((state) => state.plants);
  const isLoadingPlants = useMapStore((state) => state.isLoadingPlants);
  const [openAccordions, setOpenAccordions] = useState({});
  const [selectedPlant, setSelectedPlant] = useState(null);

  const groupedPlants = useMemo(() => groupPlantsByLikelihood(plants), [plants]);

  const toggleAccordion = (code) => {
    setOpenAccordions(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  if (isLoadingPlants) {
    return <div className="loading-plants">Loading plants...</div>;
  }

  if (plants.length === 0) {
    return null;
  }

  return (
    <>
      <div className="plant-list-container">
        <h3 className="plant-list-title">
          Pre-colonial Plants ({plants.length})
        </h3>
        <div className="likelihood-accordions">
          {groupedPlants.map(group => (
            <LikelihoodAccordion
              key={group.code}
              group={group}
              isOpen={openAccordions[group.code] || false}
              onToggle={() => toggleAccordion(group.code)}
              onPlantClick={setSelectedPlant}
            />
          ))}
        </div>
      </div>

      {selectedPlant && (
        <PlantModal
          plant={selectedPlant}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </>
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

function VegetationTypeTag({ vegetationType }) {
  if (!vegetationType) return null;

  return (
    <div className="evc-list-container">
      <span className="field-label">Vegetation Type</span>
      <div className="evc-list">
        <div className="evc-item">
          <span className="evc-item-name">{vegetationType}</span>
        </div>
      </div>
    </div>
  );
}

function SiteConditions({ soilType, soilSubBase, soilTypesAll }) {
  if (!soilType) return null;

  return (
    <div className="site-conditions">
      <span className="field-label">Site Conditions</span>
      <div className="condition-content">
        <div className="condition-item">
          <span className="condition-key">Soil</span>
          <span className="condition-val">{soilType}</span>
        </div>
        {soilSubBase && (
          <div className="condition-item">
            <span className="condition-key">Substrate</span>
            <span className="condition-val">{soilSubBase}</span>
          </div>
        )}
        {soilTypesAll && soilTypesAll.length > 1 && (
          <div className="condition-overlap">
            Also overlaps: {soilTypesAll.slice(1).join(', ')}
          </div>
        )}
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
            {selectedEVC.evcName}
          </div>

          <VegetationTypeTag vegetationType={selectedEVC.vegetationType} />

          <SiteConditions
            soilType={selectedEVC.soilType}
            soilSubBase={selectedEVC.soilSubBase}
            soilTypesAll={selectedEVC.soilTypesAll}
          />

          <PlantAccordions />
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
