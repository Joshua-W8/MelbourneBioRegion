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
    prominence = 3.1,
  } = selectedPlant;

  // Layer labels
  const layerLabels = {
    canopy: 'Canopy Layer',
    shrub: 'Shrub Layer',
    ground: 'Ground Cover',
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
