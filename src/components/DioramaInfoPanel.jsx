import { useState, useEffect } from 'react';
import './DioramaInfoPanel.css';

/**
 * Species Info Panel - oem.care newsletter style
 *
 * Shows species information when a plant is clicked in the 3D scene
 */
export default function DioramaInfoPanel({ selectedPlant, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (selectedPlant) {
      // Small delay for smooth fade-in
      setTimeout(() => setVisible(true), 50);
    } else {
      setVisible(false);
    }
  }, [selectedPlant]);

  if (!selectedPlant) return null;

  const {
    speciesName = 'Unknown species',
    commonName = '',
    layer = 'ground',
    lifeFormCode,
    height,
    prominence = 3.1,
  } = selectedPlant;

  // Layer labels
  const layerLabels = {
    canopy: 'Canopy Layer',
    subcanopy: 'Subcanopy Layer',
    shrub: 'Shrub Layer',
    ground: 'Ground Cover',
  };

  // Life form code display names
  const lfNames = {
    IT:  'Immature Canopy Tree',
    T:   'Understorey Tree',
    MS:  'Medium Shrub',
    SS:  'Small Shrub',
    PS:  'Prostrate Shrub',
    LH:  'Large Herb',
    MH:  'Medium Herb',
    SH:  'Small Herb',
    LTG: 'Large Tussock',
    LNG: 'Large Non-tufted Gram.',
    MTG: 'Medium Tussock',
    MNG: 'Medium Non-tufted Gram.',
    GF:  'Ground Fern',
    SC:  'Scrambler/Climber',
  };

  // Prominence colors
  const prominenceColor = prominence >= 3.2 ? '#4CAF50' : '#FFC107';
  const prominenceLabel = prominence >= 3.2 ? 'Prominent' : 'Present';

  return (
    <div className={`species-info-panel ${visible ? 'visible' : ''}`}>
      {/* Close button */}
      <button className="panel-close" onClick={onClose}>
        ×
      </button>

      {/* Prominence indicator dot */}
      <div
        className="prominence-dot"
        style={{ backgroundColor: prominenceColor }}
        title={prominenceLabel}
      />

      {/* Layer label */}
      <div className="species-label">
        {layerLabels[layer] || 'Species'}
      </div>

      {/* Scientific name */}
      <div className="species-name">
        {speciesName}
      </div>

      {/* Common name */}
      {commonName && (
        <div className="species-common-name">
          {commonName}
        </div>
      )}

      {/* Life form code badge */}
      {lifeFormCode && (
        <div className="lf-code-badge">
          <span className="lf-code-tag">{lifeFormCode}</span>
          {lfNames[lifeFormCode] || lifeFormCode}
        </div>
      )}

      {/* Height */}
      {height != null && (
        <div className="plant-height">
          {height < 1 ? `${Math.round(height * 100)}cm` : `${height.toFixed(1)}m`}
        </div>
      )}

      {/* Prominence badge */}
      <div className="prominence-badge" style={{ backgroundColor: `${prominenceColor}20`, color: prominenceColor }}>
        <span
          className="prominence-indicator"
          style={{ backgroundColor: prominenceColor }}
        />
        {prominenceLabel}
      </div>
    </div>
  );
}
