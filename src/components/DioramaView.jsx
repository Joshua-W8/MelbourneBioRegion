import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import useMapStore from '../store/useMapStore';
import './DioramaView.css';

// Generate random positions for plants
function generatePlantPositions(count, range = 9) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x: (Math.random() - 0.5) * range * 2,
      z: (Math.random() - 0.5) * range * 2,
    });
  }
  return positions;
}

// Tree component (tall cylinder for keystone species)
function Tree({ position }) {
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
    </group>
  );
}

// Shrub component (small sphere for other species)
function Shrub({ position }) {
  return (
    <mesh position={[position.x, 0.3, position.z]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color="#558B2F" />
    </mesh>
  );
}

// Ground plane
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#7CB342" />
    </mesh>
  );
}

// Scene content
function Scene({ plants }) {
  // Separate plants into keystone and other
  const { trees, shrubs } = useMemo(() => {
    const keystoneCodes = ['-', '3.2'];
    const keystone = plants.filter(p => keystoneCodes.includes(p._likelihoodCode));
    const other = plants.filter(p => !keystoneCodes.includes(p._likelihoodCode));

    // Limit to 20 total shapes
    const maxTrees = Math.min(keystone.length, 10);
    const maxShrubs = Math.min(other.length, 10);

    return {
      trees: generatePlantPositions(maxTrees),
      shrubs: generatePlantPositions(maxShrubs),
    };
  }, [plants]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      {/* Ground */}
      <Ground />

      {/* Trees (keystone species) */}
      {trees.map((pos, i) => (
        <Tree key={`tree-${i}`} position={pos} />
      ))}

      {/* Shrubs (other species) */}
      {shrubs.map((pos, i) => (
        <Shrub key={`shrub-${i}`} position={pos} />
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

function DioramaView() {
  const plants = useMapStore((state) => state.plants);
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const setViewMode = useMapStore((state) => state.setViewMode);

  return (
    <div className="diorama-container">
      <div className="diorama-header">
        <button className="back-btn" onClick={() => setViewMode('map')}>
          ← Back to Map
        </button>
        <h2 className="diorama-title">
          {selectedEVC ? selectedEVC.evcName : 'Ecosystem View'}
        </h2>
      </div>

      <Canvas
        camera={{ position: [12, 8, 12], fov: 50 }}
        className="diorama-canvas"
      >
        <Scene plants={plants} />
      </Canvas>

      <div className="diorama-legend">
        <div className="legend-item">
          <span className="legend-tree">●</span> Trees (Keystone species)
        </div>
        <div className="legend-item">
          <span className="legend-shrub">●</span> Shrubs (Other species)
        </div>
      </div>
    </div>
  );
}

export default DioramaView;
