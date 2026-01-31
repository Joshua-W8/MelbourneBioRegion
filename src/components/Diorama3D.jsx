import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Scene dimensions (5m x 5m)
const SCENE_SIZE = 5;
const HALF_SIZE = SCENE_SIZE / 2;

// Height ranges for each layer (in meters)
const LAYER_HEIGHTS = {
  canopy: { min: 8, max: 25 },    // Trees: 8-25m tall
  shrub: { min: 1, max: 4 },      // Shrubs: 1-4m tall
  ground: { min: 0.1, max: 0.8 }, // Ground cover: 0.1-0.8m tall
};

// Colors for placeholder models (until real models are added)
const LAYER_COLORS = {
  canopy: '#228B22',   // Forest green
  shrub: '#32CD32',    // Lime green
  ground: '#90EE90',   // Light green
};

/**
 * Generate random positions within the scene bounds
 * Ensures plants don't overlap too much
 */
function generatePositions(count, layer, existingPositions = []) {
  const positions = [];
  const minDistance = layer === 'canopy' ? 2 : layer === 'shrub' ? 0.8 : 0.3;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let position;

    do {
      position = [
        (Math.random() - 0.5) * (SCENE_SIZE - 1),
        0,
        (Math.random() - 0.5) * (SCENE_SIZE - 1),
      ];
      attempts++;
    } while (
      attempts < 50 &&
      [...existingPositions, ...positions].some(
        (p) => Math.hypot(p[0] - position[0], p[2] - position[2]) < minDistance
      )
    );

    positions.push(position);
  }

  return positions;
}

/**
 * Placeholder plant component - renders a simple cone/cylinder shape
 * Replace with actual 3D models later
 */
function PlaceholderPlant({ position, layer, species }) {
  const height = useMemo(() => {
    const { min, max } = LAYER_HEIGHTS[layer];
    return min + Math.random() * (max - min);
  }, [layer]);

  const width = useMemo(() => {
    if (layer === 'canopy') return 1 + Math.random() * 2;
    if (layer === 'shrub') return 0.5 + Math.random() * 1;
    return 0.2 + Math.random() * 0.3;
  }, [layer]);

  const color = LAYER_COLORS[layer];

  // Position Y at half height so plant sits on ground
  const yPos = height / 2;

  return (
    <group position={[position[0], yPos, position[2]]}>
      {layer === 'canopy' ? (
        // Tree: trunk + canopy
        <>
          <mesh position={[0, -height * 0.3, 0]}>
            <cylinderGeometry args={[0.1, 0.15, height * 0.4, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, height * 0.1, 0]}>
            <coneGeometry args={[width, height * 0.6, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </>
      ) : layer === 'shrub' ? (
        // Shrub: rounded bush shape
        <mesh>
          <sphereGeometry args={[width, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ) : (
        // Ground cover: small grass tuft
        <mesh>
          <coneGeometry args={[width, height, 6]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Renders all plants for a single layer
 */
function VegetationLayer({ species, layer, existingPositions }) {
  const allPositions = useMemo(() => {
    let positions = [...existingPositions];
    const speciesWithPositions = [];

    for (const sp of species) {
      const count = sp.instance_count || 1;
      const newPositions = generatePositions(count, layer, positions);
      positions = [...positions, ...newPositions];
      speciesWithPositions.push({
        ...sp,
        positions: newPositions,
      });
    }

    return speciesWithPositions;
  }, [species, layer, existingPositions]);

  return (
    <group name={`layer-${layer}`}>
      {allPositions.map((sp, speciesIndex) =>
        sp.positions.map((pos, posIndex) => (
          <PlaceholderPlant
            key={`${sp.species_name}-${posIndex}`}
            position={pos}
            layer={layer}
            species={sp}
          />
        ))
      )}
    </group>
  );
}

/**
 * Ground plane with grass texture
 */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[SCENE_SIZE, SCENE_SIZE]} />
      <meshStandardMaterial color="#3d5c3d" />
    </mesh>
  );
}

/**
 * Main vegetation scene component
 */
function VegetationScene({ sceneData }) {
  const canopyPositions = useMemo(() => {
    if (!sceneData?.layers?.canopy) return [];
    return sceneData.layers.canopy.flatMap((sp) =>
      generatePositions(sp.instance_count || 1, 'canopy')
    );
  }, [sceneData]);

  const shrubPositions = useMemo(() => {
    if (!sceneData?.layers?.shrub) return [];
    let positions = [...canopyPositions];
    return sceneData.layers.shrub.flatMap((sp) => {
      const newPos = generatePositions(sp.instance_count || 1, 'shrub', positions);
      positions = [...positions, ...newPos];
      return newPos;
    });
  }, [sceneData, canopyPositions]);

  if (!sceneData) {
    return (
      <Html center>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
      </Html>
    );
  }

  return (
    <>
      <Ground />

      {/* Render layers from bottom to top */}
      <VegetationLayer
        species={sceneData.layers?.ground || []}
        layer="ground"
        existingPositions={[...canopyPositions, ...shrubPositions]}
      />
      <VegetationLayer
        species={sceneData.layers?.shrub || []}
        layer="shrub"
        existingPositions={canopyPositions}
      />
      <VegetationLayer
        species={sceneData.layers?.canopy || []}
        layer="canopy"
        existingPositions={[]}
      />
    </>
  );
}

/**
 * Main Diorama3D component
 *
 * Usage:
 *   <Diorama3D vegetationType="Grasslands and Woodlands on fertile plains" />
 */
export default function Diorama3D({ vegetationType }) {
  const [sceneParams, setSceneParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data/scene_parameters.json')
      .then((res) => res.json())
      .then((data) => {
        setSceneParams(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load scene parameters:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const sceneData = useMemo(() => {
    if (!sceneParams || !vegetationType) return null;
    return sceneParams.scenes?.[vegetationType] || null;
  }, [sceneParams, vegetationType]);

  if (loading) {
    return (
      <div className="diorama-loading">
        Loading 3D scene...
      </div>
    );
  }

  if (error) {
    return (
      <div className="diorama-error">
        Error loading scene: {error}
      </div>
    );
  }

  if (!sceneData) {
    return (
      <div className="diorama-error">
        No scene data for: {vegetationType}
      </div>
    );
  }

  // Calculate total plant count for display
  const plantCounts = {
    canopy: sceneData.layers?.canopy?.reduce((sum, s) => sum + (s.instance_count || 0), 0) || 0,
    shrub: sceneData.layers?.shrub?.reduce((sum, s) => sum + (s.instance_count || 0), 0) || 0,
    ground: sceneData.layers?.ground?.reduce((sum, s) => sum + (s.instance_count || 0), 0) || 0,
  };

  return (
    <div className="diorama-container">
      <div className="diorama-header">
        <h3>{vegetationType}</h3>
        <div className="diorama-stats">
          <span>Trees: {plantCounts.canopy}</span>
          <span>Shrubs: {plantCounts.shrub}</span>
          <span>Ground: {plantCounts.ground}</span>
        </div>
      </div>

      <Canvas
        camera={{
          position: [8, 6, 8],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <VegetationScene sceneData={sceneData} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={3}
          maxDistance={20}
        />

        <Environment preset="forest" />
      </Canvas>
    </div>
  );
}
