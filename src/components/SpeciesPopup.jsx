import { useState, useEffect } from 'react';
import './SpeciesPopup.css';

/**
 * SpeciesPopup — specimen-card style modal overlay.
 *
 * Triggered from sidebar species click or 3D model click.
 * Accepts both sidebar species objects and PlantModel click data.
 */

// ── Life form code mappings ───────────────────────────────────────────────────

const LF_NAMES = {
  IT:  'Immature Canopy Tree',
  T:   'Understorey Tree / Large Shrub',
  MS:  'Medium Shrub',
  SS:  'Small Shrub',
  PS:  'Prostrate Shrub',
  LH:  'Large Herb',
  MH:  'Medium Herb',
  SH:  'Small / Prostrate Herb',
  LTG: 'Large Tufted Graminoid',
  LNG: 'Large Non-tufted Graminoid',
  MTG: 'Medium to Small Tufted Graminoid',
  MNG: 'Medium to Tiny Non-tufted Graminoid',
  GF:  'Ground Fern',
  SC:  'Scrambler / Climber',
};

function getLayerLabel(code) {
  if (code === 'IT' || code === 'T') return 'Canopy';
  if (code === 'MS' || code === 'SS' || code === 'PS') return 'Understorey';
  return 'Ground';
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatHeight(h) {
  if (h == null) return null;
  if (h < 1) return `${Math.round(h * 100)}cm`;
  return `${Number(h).toFixed(1)}m`;
}

function capitalise(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Translate coded resprouting values into plain language */
function describeResprouting(value) {
  if (!value) return null;
  const v = value.toLowerCase().replace(/[_-]/g, ' ').trim();
  if (v.includes('fire killed') || v === 'fire killed')
    return 'Does not resprout after fire (fire-killed).';
  if (v.includes('resprouts') && v.includes('variable'))
    return 'Variable fire response — may or may not resprout after disturbance.';
  if (v.includes('resprouts'))
    return 'Resprouts after fire or disturbance.';
  if (v.includes('variable'))
    return 'Variable response to disturbance.';
  if (v.includes('no'))
    return 'Does not resprout after disturbance.';
  return `${capitalise(value.replace(/[_-]/g, ' '))}.`;
}

/** Translate woodiness into a readable phrase */
function describeWoodiness(value) {
  if (!value) return null;
  const v = value.toLowerCase().replace(/[_-]/g, ' ').trim();
  if (v === 'woody') return 'Develops woody stems and bark.';
  if (v.includes('not') || v === 'herbaceous') return 'Herbaceous — does not develop woody tissue.';
  if (v.includes('semi')) return 'Semi-woody — partially lignified stems.';
  return `${capitalise(value.replace(/[_-]/g, ' '))}.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SpeciesPopup({ species, onClose }) {
  const [visible, setVisible] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    if (species) {
      requestAnimationFrame(() => setVisible(true));
      setShowTechnical(false);
    } else {
      setVisible(false);
    }
  }, [species]);

  if (!species) return null;

  // Normalise — handle sidebar species, PlantModel click, and map plant card shapes
  const scientificName = species.species || species.speciesName || 'Unknown species';
  const rawCommon = species.common_name || species.common_name_s || species.commonName || '';
  const commonName = rawCommon.split(',')[0].trim();
  const lifeFormCode = species.life_form_code || species.lifeFormCode || null;
  const height = species.traits?.plant_height ?? species.height ?? null;
  const prominence = species.prominence_code ?? species.prominence ?? 3.1;
  const growthForm = species.traits?.plant_growth_form || null;
  const woodiness = species.traits?.woodiness || null;
  const lifeHistory = species.traits?.life_history || null;
  const resprouting = species.traits?.resprouting_capacity || null;

  const layerLabel = lifeFormCode ? getLayerLabel(lifeFormCode) : (species.layer || 'Ground');
  const lfName = lifeFormCode ? (LF_NAMES[lifeFormCode] || lifeFormCode) : null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Build key stats (only those available)
  const stats = [];
  if (height != null) stats.push({ label: 'Height', value: formatHeight(height) });
  if (growthForm) stats.push({ label: 'Growth form', value: capitalise(growthForm.replace(/[_-]/g, ' ')) });
  if (lifeHistory) stats.push({ label: 'Life history', value: capitalise(lifeHistory.replace(/[_-]/g, ' ')) });

  // Build ecological trait sentences
  const traits = [];
  const resproutingSentence = describeResprouting(resprouting);
  if (resproutingSentence) traits.push({ heading: 'Fire response', text: resproutingSentence });
  const woodinessSentence = describeWoodiness(woodiness);
  if (woodinessSentence) traits.push({ heading: 'Stem type', text: woodinessSentence });

  return (
    <div
      className={`species-popup-backdrop ${visible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="species-popup">
        <button className="species-popup-close" onClick={onClose}>
          ×
        </button>

        {/* Header */}
        <div className="popup-header">
          <div className="popup-layer-tag">{layerLabel}</div>
          <h2 className="popup-common-name">
            {commonName || scientificName}
          </h2>
          <div className="popup-scientific-name">{scientificName}</div>
        </div>

        {/* Key stats row */}
        {stats.length > 0 && (
          <div className="popup-stats-row">
            {stats.map((s) => (
              <div key={s.label} className="popup-stat">
                <span className="popup-stat-label">{s.label}</span>
                <span className="popup-stat-value">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ecological traits */}
        {traits.length > 0 && (
          <div className="popup-traits">
            {traits.map((t) => (
              <p key={t.heading} className="popup-trait">
                <strong>{t.heading}:</strong> {t.text}
              </p>
            ))}
          </div>
        )}

        {/* Placeholder description */}
        <div className="popup-description">
          <p className="popup-description-placeholder">
            Ecological role information coming soon.
          </p>
        </div>

        {/* Technical details (collapsed) */}
        {lifeFormCode && (
          <div className="popup-technical">
            <button
              className="popup-technical-toggle"
              onClick={() => setShowTechnical(prev => !prev)}
            >
              <span>Technical details</span>
              <span className={`popup-technical-chevron ${showTechnical ? 'open' : ''}`}>▼</span>
            </button>
            {showTechnical && (
              <div className="popup-technical-content">
                <div className="popup-technical-row">
                  <span className="popup-technical-label">Life form code</span>
                  <span className="popup-technical-value">{lifeFormCode} — {lfName}</span>
                </div>
                <div className="popup-technical-row">
                  <span className="popup-technical-label">Prominence</span>
                  <span className="popup-technical-value">{prominence >= 3.2 ? '3.2 (prominent)' : '3.1 (present)'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
