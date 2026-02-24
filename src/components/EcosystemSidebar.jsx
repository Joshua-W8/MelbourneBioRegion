import { useState, useMemo } from 'react';
import { resolveModel } from '../services/modelResolver';
import './InfoPanel.css';
import './EcosystemSidebar.css';

/**
 * EcosystemSidebar — diorama-mode sidebar that reuses InfoPanel's
 * visual language (same CSS classes, widths, fonts, spacing).
 *
 * Shows: EVC header, structural summary, prominent species grouped
 * by Canopy / Understorey / Ground, and a "View all" expander.
 */

// ── Life form grouping ────────────────────────────────────────────────────────

const CANOPY_CODES = new Set(['IT', 'T']);
const UNDERSTOREY_CODES = new Set(['MS', 'SS', 'PS']);

const LAYER_META = {
  Canopy:      { label: 'Canopy trees',        color: '#1B5E20' },
  Understorey: { label: 'Understorey shrubs',   color: '#43A047' },
  Ground:      { label: 'Ground cover layer',   color: '#8BC34A' },
};

function groupSpeciesByLayer(speciesArray) {
  const canopy = [];
  const understorey = [];
  const ground = [];

  for (const sp of speciesArray) {
    const code = sp.life_form_code || 'MH';
    if (CANOPY_CODES.has(code)) canopy.push(sp);
    else if (UNDERSTOREY_CODES.has(code)) understorey.push(sp);
    else ground.push(sp);
  }

  return [
    { key: 'Canopy',      ...LAYER_META.Canopy,      species: canopy },
    { key: 'Understorey', ...LAYER_META.Understorey, species: understorey },
    { key: 'Ground',      ...LAYER_META.Ground,      species: ground },
  ].filter(g => g.species.length > 0);
}

// ── Structural summary ────────────────────────────────────────────────────────

function buildStructuralSummary(benchmark) {
  if (!benchmark) return null;

  const parts = [];

  if (benchmark.canopy) {
    const cover = benchmark.canopy.cover_pct;
    const height = benchmark.canopy.height_m;
    let structure = 'Woodland';
    if (cover >= 70) structure = 'Closed forest';
    else if (cover >= 30) structure = 'Open forest';
    else if (cover >= 10) structure = 'Open woodland';
    else if (cover > 0) structure = 'Sparse woodland';

    let desc = structure;
    if (height) desc += ` with canopy reaching approximately ${height}m`;
    if (cover) desc += `, providing ${cover}% canopy cover`;
    parts.push(desc + '.');
  } else {
    parts.push('Treeless community.');
  }

  if (benchmark.large_trees?.density_per_ha) {
    parts.push(`Approximately ${benchmark.large_trees.density_per_ha} large trees per hectare.`);
  }

  if (benchmark.understorey?.length > 0) {
    const sorted = [...benchmark.understorey]
      .filter(u => u.cover_pct > 0)
      .sort((a, b) => b.cover_pct - a.cover_pct)
      .slice(0, 3);

    if (sorted.length > 0) {
      const descriptions = sorted.map(u =>
        `${u.life_form.toLowerCase()} (${u.cover_pct}% cover)`
      );
      if (descriptions.length === 1) {
        parts.push(`Ground layer dominated by ${descriptions[0]}.`);
      } else {
        const last = descriptions.pop();
        parts.push(`Ground layer characterised by ${descriptions.join(', ')} and ${last}.`);
      }
    }
  }

  return parts.join(' ');
}

// ── Sub-components (reusing InfoPanel class names) ────────────────────────────

/** Species card — matches .plant-card from InfoPanel */
function SpeciesCard({ species, onClick }) {
  const commonName = species.common_name
    ? species.common_name.split(',')[0].trim()
    : null;

  const lfCode = species.life_form_code || 'MH';
  const model = resolveModel(species.species, lfCode);
  const hasModel = model?.available === true;
  const thumbnail = model?.thumbnail || null;

  return (
    <div className="plant-card" onClick={() => onClick(species)}>
      <div className="plant-card-image">
        {thumbnail ? (
          <img
            src={`/models/${thumbnail}`}
            alt={commonName || species.species}
            className="plant-card-thumb"
          />
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22V12M12 12C12 12 8 8 8 5C8 2 12 2 12 2C12 2 16 2 16 5C16 8 12 12 12 12Z" />
              <path d="M12 12C12 12 16 10 19 10C22 10 22 14 22 14C22 14 22 18 19 18C16 18 12 12 12 12Z" />
              <path d="M12 12C12 12 8 10 5 10C2 10 2 14 2 14C2 14 2 18 5 18C8 18 12 12 12 12Z" />
            </svg>
            {hasModel && (
              <span className="model-available-dot" title="3D model available" />
            )}
          </>
        )}
      </div>
      <div className="plant-card-info">
        <div className="plant-card-common">
          {commonName || 'Unknown'}
        </div>
        <div className="plant-card-scientific">
          {species.species}
        </div>
      </div>
    </div>
  );
}

/** Layer accordion — matches .likelihood-accordion from InfoPanel */
function LayerAccordion({ group, isOpen, onToggle, onSpeciesClick }) {
  return (
    <div className="likelihood-accordion">
      <button className="accordion-header" onClick={onToggle}>
        <div className="accordion-title">
          <span
            className="likelihood-dot"
            style={{ backgroundColor: group.color }}
          />
          <span className="accordion-label">{group.label} ({group.species.length})</span>
        </div>
        <span className={`accordion-chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="accordion-content-inner">
          <div className="plant-cards-grid">
            {group.species.map((sp, i) => (
              <SpeciesCard
                key={`${sp.species}-${i}`}
                species={sp}
                onClick={onSpeciesClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EcosystemSidebar({ benchmarkData, speciesData, onSpeciesClick }) {
  const [showAll, setShowAll] = useState(false);
  const [openAccordions, setOpenAccordions] = useState({});

  const prominentGrouped = useMemo(() => {
    if (!speciesData?.prominent) return [];
    return groupSpeciesByLayer(speciesData.prominent);
  }, [speciesData]);

  const allGrouped = useMemo(() => {
    if (!speciesData) return [];
    const all = [...(speciesData.prominent || []), ...(speciesData.present || [])];
    return groupSpeciesByLayer(all);
  }, [speciesData]);

  const grouped = showAll ? allGrouped : prominentGrouped;

  const totalProminent = (speciesData?.prominent || []).length;
  const totalAll = totalProminent + (speciesData?.present || []).length;

  const summary = useMemo(() => buildStructuralSummary(benchmarkData), [benchmarkData]);

  const toggleAccordion = (label) => {
    setOpenAccordions(prev => ({ ...prev, [label]: !prev[label] }));
  };

  if (!benchmarkData && !speciesData) {
    return (
      <div className="eco-sidebar-wrapper">
        <div className="empty-state">Loading ecosystem data...</div>
      </div>
    );
  }

  return (
    <div className="eco-sidebar-wrapper">
      <div className="evc-details">
        {/* EVC name — single heading */}
        {benchmarkData?.evc_name && (
          <div className="vegetation-type-name">
            {benchmarkData.evc_name}
          </div>
        )}

        {/* Bioregion context */}
        {benchmarkData?.bioregion && (
          <div className="evc-description-card">
            <div className="evc-description-bioregion">{benchmarkData.bioregion} bioregion</div>
            <div className="evc-description-text" style={{ fontStyle: 'italic', fontSize: '12px', marginTop: '4px' }}>
              Benchmark data describes the pre-1750 condition of this vegetation community.
            </div>
          </div>
        )}

        {/* Merged description + structure */}
        {(benchmarkData?.description || summary) && (
          <div className="evc-description-card">
            <div className="evc-description-text">
              <strong>What you're seeing: </strong>
              {[benchmarkData?.description, summary].filter(Boolean).join(' ')}
            </div>
          </div>
        )}

        {/* Vegetation type tag — matches .evc-list-container */}
        {benchmarkData?.vegetation_type && (
          <div className="evc-list-container">
            <span className="field-label">Vegetation Type</span>
            <div className="evc-list">
              <div className="evc-item">
                <span className="evc-item-name">{benchmarkData.vegetation_type}</span>
              </div>
            </div>
          </div>
        )}

        {/* Species list — matches .plant-list-container */}
        <div className="plant-list-container">
          <h3 className="plant-list-title">
            {showAll ? `All Species (${totalAll})` : `Species in this ecosystem`}
          </h3>
          <div className="likelihood-accordions">
            {grouped.map(group => (
              <LayerAccordion
                key={group.key}
                group={group}
                isOpen={openAccordions[group.key] || false}
                onToggle={() => toggleAccordion(group.key)}
                onSpeciesClick={onSpeciesClick}
              />
            ))}
          </div>
        </div>

        {/* View all toggle — matches .diorama-btn styling */}
        {totalAll > totalProminent && (
          <button
            className="diorama-btn"
            onClick={() => setShowAll(prev => !prev)}
          >
            {showAll
              ? `Show prominent only (${totalProminent})`
              : `View all ${totalAll} species`}
          </button>
        )}
      </div>
    </div>
  );
}
