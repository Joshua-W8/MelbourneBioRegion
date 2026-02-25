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
  const commonName = plant.common_name_s || plant.commonName || plant.common_name || 'Unknown';
  const scientificName = plant.species || '';

  const thumbSlug = scientificName.toLowerCase().split(" ").slice(0, 2).join("_");
  const thumbPath = `/models/_thumbnails/${thumbSlug}.png`;

  const [hasThumb, setHasThumb] = useState(true);

  return (
    <div className="plant-card" onClick={() => onClick(plant)}>
      <div className="plant-card-image">
        {hasThumb ? (
          <img
            src={thumbPath}
            alt={commonName}
            onError={() => setHasThumb(false)}
          />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22V12M12 12C12 12 8 8 8 5C8 2 12 2 12 2C12 2 16 2 16 5C16 8 12 12 12 12Z" />
            <path d="M12 12C12 12 16 10 19 10C22 10 22 14 22 14C22 14 22 18 19 18C16 18 12 12 12 12Z" />
            <path d="M12 12C12 12 8 10 5 10C2 10 2 14 2 14C2 14 2 18 5 18C8 18 12 12 12 12Z" />
          </svg>
        )}
      </div>
      <div className="plant-card-info">
        <div className="plant-card-common">
          {commonName.split(',')[0].trim()}
        </div>
        <div className="plant-card-scientific">
          {scientificName}
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
function CopySpeciesButton({ plants, formatLine }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const lines = plants.map(formatLine || (p => {
      const common = p.common_name_s || 'Unknown';
      const scientific = p.species || '';
      return `${common} — ${scientific}`;
    }));
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [plants, formatLine]);

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

// Layer classification for diorama species grouping
const CANOPY_CODES = new Set(['T', 'IT']);
const UNDERSTOREY_CODES = new Set(['MS', 'SS', 'PS', 'LH', 'MH', 'SH']);
// Ground: everything else (MTG, LTG, MNG, LNG, GF, BL, SC, etc.)

const LAYER_META = [
  { key: 'Canopy', label: 'Canopy', color: '#1B5E20', codes: CANOPY_CODES },
  { key: 'Understorey', label: 'Understorey', color: '#43A047', codes: UNDERSTOREY_CODES },
  { key: 'Ground', label: 'Ground cover', color: '#8BC34A', codes: null },
];

function groupSpeciesByLayer(species) {
  const canopy = [];
  const understorey = [];
  const ground = [];

  for (const sp of species) {
    const code = sp.life_form_code || '';
    if (CANOPY_CODES.has(code)) canopy.push(sp);
    else if (UNDERSTOREY_CODES.has(code)) understorey.push(sp);
    else ground.push(sp);
  }

  return [
    { ...LAYER_META[0], species: canopy },
    { ...LAYER_META[1], species: understorey },
    { ...LAYER_META[2], species: ground },
  ].filter(g => g.species.length > 0);
}

function layerFromCode(code) {
  if (CANOPY_CODES.has(code)) return 'canopy';
  if (UNDERSTOREY_CODES.has(code)) return 'shrub';
  return 'ground';
}

function DioramaSpeciesList({ onSpeciesClick }) {
  const speciesData = useMapStore((state) => state.speciesData);
  const [openAccordions, setOpenAccordions] = useState({});

  const prominent = speciesData?.prominent || [];
  const grouped = useMemo(() => groupSpeciesByLayer(prominent), [prominent]);

  // All accordions open by default — track only explicit closes
  const isOpen = (key) => openAccordions[key] !== false;

  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const handleClick = useCallback((sp) => {
    console.log("handleClick fired", sp.species, "onSpeciesClick:", typeof onSpeciesClick);
    if (!onSpeciesClick) return;
    onSpeciesClick({
      speciesName: sp.species,
      commonName: sp.commonName || '',
      layer: layerFromCode(sp.life_form_code || ''),
      lifeFormCode: sp.life_form_code || '',
      height: 0,
      prominence: parseFloat(sp.prominenceCode) || 3.1,
    });
  }, [onSpeciesClick]);

  const allSpecies = useMemo(() => grouped.flatMap(g => g.species), [grouped]);

  const formatLine = useCallback((sp) => {
    const common = sp.commonName || 'Unknown';
    const scientific = sp.species || '';
    const lf = sp.life_form_code || '';
    return `${common} (${scientific}) - ${lf}`;
  }, []);

  if (prominent.length === 0) return null;

  return (
    <div className="plant-list-container">
      <h3 className="plant-list-title">
        Species in Scene ({prominent.length})
      </h3>
      <div className="likelihood-accordions">
        {grouped.map(group => (
          <div key={group.key} className="likelihood-accordion">
            <button className="accordion-header" onClick={() => toggleAccordion(group.key)}>
              <div className="accordion-title">
                <span
                  className="likelihood-dot"
                  style={{ backgroundColor: group.color }}
                />
                <span className="accordion-label">{group.label}</span>
                <span className="accordion-count">{group.species.length}</span>
              </div>
              <span className={`accordion-chevron ${isOpen(group.key) ? 'open' : ''}`}>▼</span>
            </button>
            <div className={`accordion-content ${isOpen(group.key) ? 'open' : ''}`}>
              <div className="accordion-content-inner">
                <div className="plant-cards-grid">
                  {group.species.map((sp, i) => (
                    <PlantCard
                      key={`${sp.species}-${i}`}
                      plant={sp}
                      onClick={() => handleClick(sp)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CopySpeciesButton plants={allSpecies} formatLine={formatLine} />
    </div>
  );
}

function InfoPanel({ mode = 'map', onSpeciesClick }) {
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

          {isDiorama ? (
            <DioramaSpeciesList onSpeciesClick={onSpeciesClick} />
          ) : (
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
