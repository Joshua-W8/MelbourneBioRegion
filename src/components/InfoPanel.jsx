import { useState, useMemo, useCallback } from 'react';
import useMapStore from '../store/useMapStore';
import { LIKELIHOOD_CODES } from '../data/evcMappings';
import PlantModal from './PlantModal';
import './InfoPanel.css';

const BCS_COLORS = {
  Endangered: '#ef4444',
  Vulnerable: '#f97316',
  Depleted: '#eab308',
  'Least Concern': '#22c55e',
  Rare: '#7b1fa2',
};

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

// Copy Species List Button
function CopySpeciesButton({ plants }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const lines = plants.map(p => {
      const common = p.common_name_s || 'Unknown';
      const scientific = p.species || '';
      return `${common} — ${scientific}`;
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [plants]);

  if (plants.length === 0) return null;

  return (
    <button className="copy-species-btn" onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy Species List'}
    </button>
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

        <CopySpeciesButton plants={plants} />
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

function EVCDescription() {
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  const bcsColor = BCS_COLORS[selectedEVC?.bcsDesc] || '#666';

  // Build description text from benchmark or show fallback
  let descriptionText;
  if (benchmarkData?.description) {
    const parts = [benchmarkData.description];
    if (benchmarkData.canopy_cover_pct != null) {
      parts.push(`Canopy cover approximately ${benchmarkData.canopy_cover_pct}%`);
      if (benchmarkData.tree_density_ha != null) {
        parts[parts.length - 1] += `, with ${benchmarkData.tree_density_ha} large trees per hectare`;
      }
      if (benchmarkData.canopy_height_m != null) {
        parts[parts.length - 1] += ` reaching ${benchmarkData.canopy_height_m}m`;
      }
    }
    if (benchmarkData.tree_species?.length > 0) {
      parts.push(`Dominant canopy species: ${benchmarkData.tree_species.join(', ')}`);
    }
    descriptionText = parts.join('. ') + '.';
  }

  return (
    <div className="evc-description-card">
      <div className="evc-description-heading">
        {benchmarkData?.evc_name || selectedEVC?.evcName}
      </div>
      <div className="evc-description-bioregion">
        {benchmarkData?.bioregion || selectedEVC?.bioregion} bioregion
        {selectedEVC?.bcsDesc && (
          <span
            className="conservation-badge"
            style={{
              backgroundColor: `${bcsColor}20`,
              color: bcsColor,
              borderColor: `${bcsColor}40`,
            }}
          >
            {selectedEVC.bcsDesc}
          </span>
        )}
      </div>
      <div className="evc-description-text">
        {descriptionText || 'Benchmark data not yet available for this EVC/bioregion combination.'}
      </div>
    </div>
  );
}

// Understorey Structure Component
function UnderstoreyStructure() {
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const understorey = benchmarkData?.understorey;

  if (!understorey || understorey.length === 0) return null;

  const maxCover = Math.max(...understorey.map(u => u.cover_pct || 0));

  return (
    <div className="understorey-structure">
      <span className="field-label">Understorey Structure</span>
      <div className="understorey-rows">
        {understorey.map(row => (
          <div key={row.life_form_code} className="understorey-row">
            <div className="understorey-name">
              <span className="understorey-lf-name">{row.life_form_name}</span>
              <span className="understorey-lf-code">{row.life_form_code}</span>
            </div>
            <div className="understorey-bar-track">
              <div
                className="understorey-bar"
                style={{ width: `${maxCover > 0 ? (row.cover_pct / maxCover) * 100 : 0}%` }}
              />
            </div>
            <div className="understorey-stats">
              <span className="understorey-cover">{row.cover_pct}%</span>
              {row.num_species != null && (
                <span className="understorey-spp">{row.num_species} spp</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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

function InfoPanel({ mode = 'map' }) {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const isDiorama = mode === 'diorama';

  return (
    <div className="info-panel">
      {!isDiorama && <h2 className="info-panel-title">Pre-Colonial Melbourne</h2>}

      {selectedEVC ? (
        <div className="evc-details">
          <div className="vegetation-type-name">
            {selectedEVC.evcName}
          </div>

          <EVCDescription />
          <VegetationTypeTag vegetationType={selectedEVC.vegetationType} />

          <UnderstoreyStructure />

          {!isDiorama && (
            <>
              <SiteConditions
                soilType={selectedEVC.soilType}
                soilSubBase={selectedEVC.soilSubBase}
                soilTypesAll={selectedEVC.soilTypesAll}
              />

              <PlantAccordions />
              <DioramaButton />
            </>
          )}
        </div>
      ) : (
        !isDiorama && (
          <div className="empty-state">
            Click on the map to discover what grew here before colonisation
          </div>
        )
      )}
    </div>
  );
}

export default InfoPanel;
