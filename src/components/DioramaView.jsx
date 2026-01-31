import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useState, useEffect, useMemo, useCallback } from 'react';
import useMapStore from '../store/useMapStore';
import PlantModel from './PlantModel';
import DioramaInfoPanel from './DioramaInfoPanel';
import './DioramaView.css';

// Scene dimensions (5m x 5m)
const SCENE_SIZE = 5;

/**
 * Generate random positions within the scene bounds
 */
function generatePositions(count, layer, existingPositions = []) {
  const positions = [];
  const minDistance = layer === 'canopy' ? 1.5 : layer === 'shrub' ? 0.6 : 0.2;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let position;

    do {
      position = [
        (Math.random() - 0.5) * (SCENE_SIZE - 0.5),
        0,
        (Math.random() - 0.5) * (SCENE_SIZE - 0.5),
      ];
      attempts++;
    } while (
      attempts < 30 &&
      [...existingPositions, ...positions].some(
        (p) => Math.hypot(p[0] - position[0], p[2] - position[2]) < minDistance
      )
    );

    positions.push(position);
  }

  return positions;
}

/**
 * Renders all plants for a layer using PlantModel component
 */
function VegetationLayer({ species, layer, existingPositions, onPlantClick }) {
  const plantsWithPositions = useMemo(() => {
    let allPositions = [...existingPositions];
    const result = [];

    for (const sp of species) {
      const count = Math.min(sp.instance_count || 1, 20); // Cap at 20 per species for performance
      const positions = generatePositions(count, layer, allPositions);
      allPositions = [...allPositions, ...positions];

      result.push({
        species: sp,
        positions: positions,
      });
    }

    return result;
  }, [species, layer, existingPositions]);

  return (
    <group name={`layer-${layer}`}>
      {plantsWithPositions.map((item, idx) =>
        item.positions.map((pos, i) => (
          <PlantModel
            key={`${item.species.species_name}-${i}`}
            layer={layer}
            speciesName={item.species.species_name}
            commonName={item.species.common_name || ''}
            prominence={item.species.prominence_code || 3.1}
            position={pos}
            onClick={onPlantClick}
          />
        ))
      )}
    </group>
  );
}

/**
 * Ground plane
 */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[SCENE_SIZE, SCENE_SIZE]} />
      <meshStandardMaterial color="#4a6741" />
    </mesh>
  );
}

/**
 * Main scene with all vegetation layers
 */
function VegetationScene({ sceneData, onPlantClick }) {
  // Collect positions from canopy layer first
  const canopyPositions = useMemo(() => {
    if (!sceneData?.layers?.canopy) return [];
    const positions = [];
    sceneData.layers.canopy.forEach((sp) => {
      const count = Math.min(sp.instance_count || 1, 20);
      positions.push(...generatePositions(count, 'canopy', positions));
    });
    return positions;
  }, [sceneData]);

  // Collect shrub positions avoiding canopy
  const shrubPositions = useMemo(() => {
    if (!sceneData?.layers?.shrub) return [];
    const positions = [];
    sceneData.layers.shrub.forEach((sp) => {
      const count = Math.min(sp.instance_count || 1, 20);
      positions.push(...generatePositions(count, 'shrub', [...canopyPositions, ...positions]));
    });
    return positions;
  }, [sceneData, canopyPositions]);

  if (!sceneData) return null;

  return (
    <>
      <Ground />

      {/* Render layers */}
      <VegetationLayer
        species={sceneData.layers?.ground || []}
        layer="ground"
        existingPositions={[...canopyPositions, ...shrubPositions]}
        onPlantClick={onPlantClick}
      />
      <VegetationLayer
        species={sceneData.layers?.shrub || []}
        layer="shrub"
        existingPositions={canopyPositions}
        onPlantClick={onPlantClick}
      />
      <VegetationLayer
        species={sceneData.layers?.canopy || []}
        layer="canopy"
        existingPositions={[]}
        onPlantClick={onPlantClick}
      />
    </>
  );
}

function DioramaView() {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const setViewMode = useMapStore((state) => state.setViewMode);

  const [sceneParams, setSceneParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(null);

  // Handle plant click
  const handlePlantClick = useCallback((plantData) => {
    setSelectedPlant(plantData);
  }, []);

  // Close info panel
  const handleClosePanel = useCallback(() => {
    setSelectedPlant(null);
  }, []);

  // Load scene parameters
  useEffect(() => {
    fetch('/data/scene_parameters.json')
      .then((res) => res.json())
      .then((data) => {
        setSceneParams(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load scene parameters:', err);
        setLoading(false);
      });
  }, []);

  // Get scene data for selected vegetation type
  const sceneData = useMemo(() => {
    if (!sceneParams || !selectedEVC?.vegetationType) return null;
    return sceneParams.scenes?.[selectedEVC.vegetationType] || null;
  }, [sceneParams, selectedEVC]);

  // Calculate plant counts
  const plantCounts = useMemo(() => {
    if (!sceneData) return { canopy: 0, shrub: 0, ground: 0 };
    return {
      canopy: sceneData.layers?.canopy?.reduce((sum, s) => sum + (s.instance_count || 0), 0) || 0,
      shrub: sceneData.layers?.shrub?.reduce((sum, s) => sum + (s.instance_count || 0), 0) || 0,
      ground: sceneData.layers?.ground?.reduce((sum, s) => sum + (s.instance_count || 0), 0) || 0,
    };
  }, [sceneData]);

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
        <div className="diorama-loading">Loading 3D scene...</div>
      ) : !sceneData ? (
        <div className="diorama-loading">No scene data available</div>
      ) : (
        <Canvas
          camera={{ position: [6, 5, 6], fov: 50 }}
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

          <VegetationScene sceneData={sceneData} onPlantClick={handlePlantClick} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2.1}
          />

          <Environment preset="forest" />
        </Canvas>
      )}

      {/* Species info panel */}
      <DioramaInfoPanel
        selectedPlant={selectedPlant}
        onClose={handleClosePanel}
      />

      <div className="diorama-legend">
        <div className="legend-item">
          <span className="legend-canopy">●</span> Trees: {plantCounts.canopy}
        </div>
        <div className="legend-item">
          <span className="legend-shrub">●</span> Shrubs: {plantCounts.shrub}
        </div>
        <div className="legend-item">
          <span className="legend-ground">●</span> Ground: {plantCounts.ground}
        </div>
        <div className="legend-scene">5m × 5m scene</div>
      </div>
    </div>
  );
}

export default DioramaView;
