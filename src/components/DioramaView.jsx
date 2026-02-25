import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useState, useMemo, useCallback } from 'react';
import useMapStore from '../store/useMapStore';
import { composeScene } from '../services/sceneComposer';
import { resolveModel } from '../services/modelResolver';
import PlantModel from './PlantModel';
import GroundPlane from './GroundPlane';
import PlantModal from './PlantModal';
import InfoPanel from './InfoPanel';
import './DioramaView.css';

function DioramaView() {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const speciesData = useMapStore((state) => state.speciesData);

  const [selectedPlant, setSelectedPlant] = useState(null);

  const handlePlantClick = useCallback((plantData) => {
    console.log("handlePlantClick:", plantData);
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
              modelPath={inst.model_available ? inst.model_path : null}
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

      <PlantModal
        plant={selectedPlant ? { species: selectedPlant.speciesName, common_name_s: selectedPlant.commonName, growth_form: selectedPlant.lifeFormCode, _likelihoodCode: String(selectedPlant.prominence) } : null}
        onClose={handleClosePanel}
      />

      <InfoPanel mode="diorama" onSpeciesClick={handlePlantClick} />
    </div>
  );
}

export default DioramaView;
