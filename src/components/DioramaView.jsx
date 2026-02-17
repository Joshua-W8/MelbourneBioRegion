import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useState, useMemo, useCallback } from 'react';
import useMapStore from '../store/useMapStore';
import { composeScene } from '../services/sceneComposer';
import { resolveModel } from '../services/modelResolver';
import PlantModel from './PlantModel';
import GroundPlane from './GroundPlane';
import DioramaInfoPanel from './DioramaInfoPanel';
import './DioramaView.css';

// Scene dimensions (10m × 10m)
const SCENE_SIZE = 10;

/** Life form code colour swatches for legend */
const LF_COLORS = {
  IT:  '#1B5E20',
  T:   '#2E7D32',
  MS:  '#43A047',
  SS:  '#66BB6A',
  PS:  '#81C784',
  LH:  '#558B2F',
  MH:  '#689F38',
  SH:  '#7CB342',
  LTG: '#8BC34A',
  LNG: '#9CCC65',
  MTG: '#AED581',
  MNG: '#C5E1A5',
  GF:  '#388E3C',
  SC:  '#795548',
};

function DioramaView() {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const speciesData = useMapStore((state) => state.speciesData);

  const [selectedPlant, setSelectedPlant] = useState(null);

  const handlePlantClick = useCallback((plantData) => {
    setSelectedPlant(plantData);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedPlant(null);
  }, []);

  // Compose scene from benchmark + species data
  const sceneData = useMemo(() => {
    if (!benchmarkData || !speciesData) return null;
    return composeScene(benchmarkData, speciesData, resolveModel);
  }, [benchmarkData, speciesData]);

  const loading = !benchmarkData || !speciesData;

  return (
    <div className="diorama-container">
      <div className="diorama-header">
        <button className="back-btn" onClick={() => setViewMode('map')}>
          ← Back to Map
        </button>
        <h2 className="diorama-title">
          {selectedEVC?.vegetationType || 'Ecosystem View'}
        </h2>
      </div>

      {loading ? (
        <div className="diorama-loading">Loading benchmark data...</div>
      ) : !sceneData ? (
        <div className="diorama-loading">No scene data available</div>
      ) : (
        <Canvas
          camera={{ position: [12, 10, 12], fov: 50 }}
          className="diorama-canvas"
          shadows
          onPointerMissed={() => setSelectedPlant(null)}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1}
            castShadow
          />

          <GroundPlane ground={sceneData.ground} />

          {sceneData.instances.map((inst) => (
            <PlantModel
              key={inst.id}
              lifeFormCode={inst.life_form_code}
              layer={inst.layer}
              speciesName={inst.species}
              commonName={inst.common_name}
              prominence={inst.prominence}
              height={inst.height}
              position={inst.position}
              modelPath={inst.model_path}
              onClick={handlePlantClick}
            />
          ))}

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2.1}
          />

          <Environment preset="forest" />
        </Canvas>
      )}

      <DioramaInfoPanel
        selectedPlant={selectedPlant}
        onClose={handleClosePanel}
      />

      {sceneData?.stats && (
        <div className="diorama-legend">
          <div className="legend-lf-list">
            {Object.entries(sceneData.stats)
              .sort((a, b) => (b[1].cover_pct || 0) - (a[1].cover_pct || 0))
              .map(([code, s]) => (
                <div key={code} className="legend-lf-item">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: LF_COLORS[code] || '#666' }}
                  />
                  <span className="legend-lf-code">{code}</span>
                  <span className="legend-lf-name">{s.name}</span>
                  <span className="legend-lf-count">{s.count}</span>
                </div>
              ))}
          </div>
          <div className="legend-scene">{SCENE_SIZE}m × {SCENE_SIZE}m scene</div>
        </div>
      )}
    </div>
  );
}

export default DioramaView;
