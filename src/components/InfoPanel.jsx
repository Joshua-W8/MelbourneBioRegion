import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import useMapStore from '../store/useMapStore';
import PlantModal from './PlantModal';
import VegetationProfile from './VegetationProfile';
import './InfoPanel.css';

const BCS_COLORS = {
  Endangered: '#ef4444',
  Vulnerable: '#f97316',
  Depleted: '#eab308',
  'Least Concern': '#22c55e',
  Rare: '#7b1fa2',
};

// ── Life form metadata ──────────────────────────────────────────────────────

const LIFE_FORM_META = {
  IT:  { label: 'Immature Canopy Tree',           group: 'canopy',    heightRange: '5–15m' },
  T:   { label: 'Understorey Tree / Large Shrub', group: 'canopy',    heightRange: '2–8m' },
  MS:  { label: 'Medium Shrub',                   group: 'shrub',     heightRange: '1–2m' },
  SS:  { label: 'Small Shrub',                    group: 'shrub',     heightRange: '0.25–1m' },
  PS:  { label: 'Prostrate Shrub',                group: 'shrub',     heightRange: '0–0.25m' },
  LH:  { label: 'Large Herb',                     group: 'herb',      heightRange: '0.5–1m' },
  MH:  { label: 'Medium Herb',                    group: 'herb',      heightRange: '0.1–0.5m' },
  SH:  { label: 'Small / Prostrate Herb',         group: 'herb',      heightRange: '0–0.1m' },
  LTG: { label: 'Large Tufted Graminoid',         group: 'graminoid', heightRange: '0.5–1.5m' },
  LNG: { label: 'Large Non-tufted Graminoid',     group: 'graminoid', heightRange: '0.3–1m' },
  MTG: { label: 'Medium Tufted Graminoid',        group: 'graminoid', heightRange: '0.1–0.5m' },
  MNG: { label: 'Medium Non-tufted Graminoid',    group: 'graminoid', heightRange: '0–0.3m' },
  GF:  { label: 'Ground Fern',                    group: 'ground',    heightRange: '0–0.3m' },
  SC:  { label: 'Soil Crust',                     group: 'ground',    heightRange: '0–0.05m' },
  BL:  { label: 'Bryophytes / Lichens',           group: 'ground',    heightRange: '0–0.05m' },
};

// ── Layer group definitions (5 groups for accordion structure) ───────────────

const LAYER_GROUPS = {
  canopy:    { label: 'Canopy Trees',        color: '#1B5E20', codes: new Set(['IT', 'T']) },
  shrub:     { label: 'Shrubs',              color: '#66BB6A', codes: new Set(['MS', 'SS', 'PS']) },
  graminoid: { label: 'Graminoids',          color: '#b8860b', codes: new Set(['LTG', 'LNG', 'MTG', 'MNG']) },
  herb:      { label: 'Herbs & Wildflowers', color: '#7c5db2', codes: new Set(['LH', 'MH', 'SH']) },
  ground:    { label: 'Ferns & Ground Cover', color: '#228b22', codes: new Set(['GF', 'BL', 'SC']) },
};

const LAYER_GROUP_ORDER = ['canopy', 'shrub', 'graminoid', 'herb', 'ground'];

const LAYER_DESCRIPTIONS = {
  canopy: 'The structural canopy \u2014 eucalypts that define the woodland character. Their shade regime determines which understorey species can grow beneath.',
  shrub: 'Dense woody layer providing nesting habitat and wind protection. Many are host plants for butterfly larvae.',
  graminoid: 'The dominant ground layer \u2014 tussock grasses hold soil, manage water infiltration, and fuel the cool burns that maintained this ecosystem for millennia.',
  herb: 'The diversity engine \u2014 seasonal blooms support pollinators that sustain the entire food web. Often the most species-rich layer.',
  ground: 'Nutrient cycling, moisture retention, and microhabitat for invertebrates. Indicators of overall ecosystem health.',
};

// Map life form code → accordion group key
function lifeFormToGroup(code) {
  if (!code) return 'ground';
  for (const [key, g] of Object.entries(LAYER_GROUPS)) {
    if (g.codes.has(code)) return key;
  }
  return 'ground';
}

// Map life form code → VegetationProfile group key (6-group, with subcanopy)
function lifeFormToProfileGroup(code) {
  if (!code) return null;
  if (code === 'IT') return 'canopy';
  if (code === 'T') return 'subcanopy';
  if (['MS', 'SS', 'PS'].includes(code)) return 'shrub';
  if (['LTG', 'LNG', 'MTG', 'MNG'].includes(code)) return 'graminoid';
  if (['LH', 'MH', 'SH'].includes(code)) return 'herb';
  if (['GF', 'BL', 'SC'].includes(code)) return 'ground';
  return null;
}

// ── Plant Card Component ────────────────────────────────────────────────────

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

// ── Copy Species List Button ────────────────────────────────────────────────

function CopySpeciesButton({ plants, formatLine }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const lines = plants.map(formatLine || (p => {
      const common = p.commonName || p.common_name_s || 'Unknown';
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

// ── Understorey bar rows (reusable per-group rendering) ─────────────────────

function LifeFormRows({ rows, maxCover, color, hoveredCode, onHover, onLeave }) {
  return (
    <div className="understorey-rows">
      {rows.map(row => (
        <div
          key={row.code}
          className={`understorey-row ${hoveredCode === row.code ? 'understorey-row--hover' : ''}`}
          onMouseEnter={() => onHover(row.code)}
          onMouseLeave={onLeave}
        >
          <div className="understorey-name">
            <span className="understorey-lf-name">{row.meta.label}</span>
            {row.meta.heightRange && (
              <span className="understorey-lf-height">{row.meta.heightRange}</span>
            )}
          </div>
          <div className="understorey-bar-track">
            <div
              className="understorey-bar"
              style={{
                width: `${maxCover > 0 ? (row.cover_pct / maxCover) * 100 : 0}%`,
                backgroundColor: color,
                opacity: hoveredCode === row.code ? 1 : 0.5,
              }}
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
  );
}

// ── Layer Accordion ─────────────────────────────────────────────────────────

const MAX_VISIBLE_SPECIES = 6;

function LayerAccordion({
  groupKey, label, color, totalCover, totalSpecies,
  isOpen, onToggle, children
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (isOpen && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [isOpen]);

  return (
    <div className="likelihood-accordion" ref={ref}>
      <button className="accordion-header" onClick={() => onToggle(groupKey)}>
        <div className="accordion-title">
          <span className="likelihood-dot" style={{ backgroundColor: color }} />
          <span className="accordion-label">{label}</span>
        </div>
        <div className="layer-accordion-right">
          <span className="accordion-stats-summary">
            {totalCover > 0 && `${totalCover}% cover`}
            {totalCover > 0 && totalSpecies > 0 && ' · '}
            {totalSpecies > 0 && `${totalSpecies} spp`}
          </span>
          <span className={`accordion-chevron ${isOpen ? 'open' : ''}`}>▼</span>
        </div>
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="accordion-content-inner layer-accordion-body" style={{ borderLeftColor: color }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Species cards section within an accordion ───────────────────────────────

function AccordionSpeciesCards({ species, onPlantClick, isDiorama }) {
  const [showAll, setShowAll] = useState(false);

  if (species.length === 0) return null;

  const visible = showAll ? species : species.slice(0, MAX_VISIBLE_SPECIES);
  const hasMore = species.length > MAX_VISIBLE_SPECIES;

  return (
    <div className="layer-species-section">
      <div className="plant-cards-grid">
        {visible.map((sp, i) => (
          <PlantCard
            key={`${sp.species}-${i}`}
            plant={sp}
            onClick={onPlantClick}
          />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          className="show-all-species-btn"
          onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
        >
          Show all {species.length} species
        </button>
      )}
    </div>
  );
}

// ── Vegetation Layers (unified section) ─────────────────────────────────────

function VegetationLayers({ activeLayer, profileLayer, onLayerChange, onLayerHover, isDiorama, onSpeciesClick }) {
  const speciesData = useMapStore((state) => state.speciesData);
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const understorey = benchmarkData?.understorey;

  const [hoveredCode, setHoveredCode] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);

  // Build per-group benchmark stats and life form rows
  const { groupStats, maxCover } = useMemo(() => {
    if (!understorey || understorey.length === 0) return { groupStats: {}, maxCover: 0 };

    const max = Math.max(...understorey.map(u => u.cover_pct || 0));
    const stats = {};

    for (const row of understorey) {
      const meta = LIFE_FORM_META[row.code] || { label: row.life_form || row.code, group: 'ground', heightRange: '' };
      const groupKey = meta.group;
      if (!stats[groupKey]) stats[groupKey] = { lifeForms: [], totalCover: 0, totalSpecies: 0 };
      stats[groupKey].lifeForms.push({ ...row, meta });
      stats[groupKey].totalCover += row.cover_pct || 0;
      if (row.num_species != null) stats[groupKey].totalSpecies += row.num_species;
    }

    // Merge top-level canopy benchmark data into the canopy group
    const canopyCover = benchmarkData?.canopy?.cover_pct;
    if (canopyCover != null) {
      if (!stats.canopy) stats.canopy = { lifeForms: [], totalCover: 0, totalSpecies: 0 };
      stats.canopy.totalCover = Math.max(stats.canopy.totalCover, canopyCover);
    }

    return { groupStats: stats, maxCover: max };
  }, [understorey, benchmarkData]);

  // Group species by layer — use speciesData.prominent (has life_form_code)
  const speciesByGroup = useMemo(() => {
    const prominent = speciesData?.prominent || [];
    const present = speciesData?.present || [];
    const allSpecies = [...prominent, ...present];

    const groups = {};
    for (const key of LAYER_GROUP_ORDER) groups[key] = [];

    for (const sp of allSpecies) {
      const code = sp.life_form_code || '';
      const group = lifeFormToGroup(code);
      groups[group].push(sp);
    }

    return groups;
  }, [speciesData]);

  const prominentCount = (speciesData?.prominent || []).length + (speciesData?.present || []).length;
  const totalRecorded = useMapStore((state) => state.plants)?.length || 0;

  const handleBarHover = useCallback((code) => {
    setHoveredCode(code);
    if (onLayerHover) onLayerHover(code);
  }, [onLayerHover]);

  const handleBarLeave = useCallback(() => {
    setHoveredCode(null);
    if (onLayerHover) onLayerHover(null);
  }, [onLayerHover]);

  const handleToggle = useCallback((groupKey) => {
    // Normalize profile 6-group keys to accordion 5-group keys
    const accordionKey = groupKey === 'subcanopy' ? 'canopy' : groupKey;
    onLayerChange(activeLayer === accordionKey ? null : accordionKey);
  }, [activeLayer, onLayerChange]);

  const handlePlantClick = useCallback((plant) => {
    if (isDiorama && onSpeciesClick) {
      onSpeciesClick({
        speciesName: plant.species,
        commonName: plant.commonName || '',
        layer: lifeFormToGroup(plant.life_form_code || ''),
        lifeFormCode: plant.life_form_code || '',
        height: 0,
        prominence: parseFloat(plant.prominenceCode) || 3.1,
      });
    } else {
      setSelectedPlant(plant);
    }
  }, [isDiorama, onSpeciesClick]);

  // Which groups have content (benchmark rows or species)
  const activeGroups = useMemo(() =>
    LAYER_GROUP_ORDER.filter(key =>
      (groupStats[key]?.lifeForms.length > 0) || (speciesByGroup[key].length > 0)
    ),
    [groupStats, speciesByGroup]
  );

  if (activeGroups.length === 0) return null;

  return (
    <div className="vegetation-layers">
      <span className="field-label">Vegetation Layers</span>
      <span className="veg-layers-subtitle">
        <span
          className="veg-layers-prominent"
          title="Species that were certainly present and formed a significant part of this ecosystem (prominence 3.1+)"
        >
          {prominentCount} prominent species
        </span>
        {totalRecorded > 0 && ` · ${totalRecorded} recorded in this vegetation type`}
      </span>

      {/* Profile cross-section at top */}
      <VegetationProfile activeLayer={profileLayer} onLayerChange={handleToggle} />

      {/* Layer accordions */}
      <div className="likelihood-accordions">
        {activeGroups.map(key => {
          const group = LAYER_GROUPS[key];
          const stats = groupStats[key] || { lifeForms: [], totalCover: 0, totalSpecies: 0 };
          const species = speciesByGroup[key];

          return (
            <LayerAccordion
              key={key}
              groupKey={key}
              label={group.label}
              color={group.color}
              totalCover={stats.totalCover}
              totalSpecies={Math.max(stats.totalSpecies, species.length)}
              isOpen={activeLayer === key}
              onToggle={handleToggle}
            >
              {/* Benchmark bar chart rows */}
              {stats.lifeForms.length > 0 && (
                <LifeFormRows
                  rows={stats.lifeForms}
                  maxCover={maxCover}
                  color={group.color}
                  hoveredCode={hoveredCode}
                  onHover={handleBarHover}
                  onLeave={handleBarLeave}
                />
              )}

              {/* Ecological description */}
              {LAYER_DESCRIPTIONS[key] && (
                <div className="layer-description">
                  {LAYER_DESCRIPTIONS[key]}
                </div>
              )}

              {/* Species cards */}
              <AccordionSpeciesCards
                species={species}
                onPlantClick={handlePlantClick}
                isDiorama={isDiorama}
              />
            </LayerAccordion>
          );
        })}
      </div>

      <div className="understorey-footer">
        <span>% cover = projected canopy cover at benchmark condition</span>
        <span>spp = expected species count per life form</span>
      </div>

      <CopySpeciesButton
        plants={LAYER_GROUP_ORDER.flatMap(k => speciesByGroup[k])}
        formatLine={(sp) => {
          const common = sp.commonName || sp.common_name_s || 'Unknown';
          const scientific = sp.species || '';
          const lf = sp.life_form_code || '';
          return `${common} (${scientific}) - ${lf}`;
        }}
      />

      {!isDiorama && selectedPlant && (
        <PlantModal
          plant={selectedPlant}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </div>
  );
}

// ── Diorama Button ──────────────────────────────────────────────────────────

function DioramaButton() {
  const speciesData = useMapStore((state) => state.speciesData);
  const setViewMode = useMapStore((state) => state.setViewMode);

  if (!speciesData?.prominent?.length) {
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

// ── EVC Description ─────────────────────────────────────────────────────────

function EVCDescription() {
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  const bcsColor = BCS_COLORS[selectedEVC?.bcsDesc] || '#666';

  let descriptionText;
  if (benchmarkData?.description) {
    const parts = [benchmarkData.description];
    if (benchmarkData.canopy?.cover_pct != null) {
      parts.push(`Canopy cover approximately ${benchmarkData.canopy.cover_pct}%`);
      if (benchmarkData.large_trees?.density_per_ha != null) {
        parts[parts.length - 1] += `, with ${benchmarkData.large_trees.density_per_ha} large trees per hectare`;
      }
      if (benchmarkData.canopy?.height_m != null) {
        parts[parts.length - 1] += ` reaching ${benchmarkData.canopy.height_m}m`;
      }
    }
    if (benchmarkData.canopy?.character_species?.length > 0) {
      const names = benchmarkData.canopy.character_species.map(s => s.scientific_name);
      parts.push(`Dominant canopy species: ${names.join(', ')}`);
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

// ── Vegetation Type Tag ─────────────────────────────────────────────────────

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

// ── Site Conditions ─────────────────────────────────────────────────────────

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

// ── InfoPanel ───────────────────────────────────────────────────────────────

function InfoPanel({ mode = 'map', onSpeciesClick }) {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const isDiorama = mode === 'diorama';
  const [activeLayer, setActiveLayer] = useState(null);     // accordion open state (5-group)
  const [hoveredLayer, setHoveredLayer] = useState(null);   // profile highlight (6-group)

  // Bar hover → profile highlight (transient, doesn't open accordions)
  const handleLayerHover = useCallback((code) => {
    setHoveredLayer(code ? lifeFormToProfileGroup(code) : null);
  }, []);

  // Profile active layer = explicit click OR hover
  const profileLayer = hoveredLayer || activeLayer;

  return (
    <div className="info-panel">
      {!isDiorama && <h2 className="info-panel-title">Pre-Colonial Melbourne</h2>}

      {selectedEVC ? (
        <div className="evc-details">
          <div className="vegetation-type-name">
            {selectedEVC.evc ? `EVC ${selectedEVC.evc} · ${selectedEVC.evcName}` : selectedEVC.evcName}
          </div>

          <EVCDescription />
          <VegetationTypeTag vegetationType={selectedEVC.vegetationType} />

          {isDiorama ? (
            <>
              <VegetationLayers
                activeLayer={activeLayer}
                profileLayer={profileLayer}
                onLayerChange={setActiveLayer}
                onLayerHover={handleLayerHover}
                isDiorama={isDiorama}
                onSpeciesClick={onSpeciesClick}
              />
              <SiteConditions
                soilType={selectedEVC.soilType}
                soilSubBase={selectedEVC.soilSubBase}
                soilTypesAll={selectedEVC.soilTypesAll}
              />
            </>
          ) : (
            <DioramaButton />
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
