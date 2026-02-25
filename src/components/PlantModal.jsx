import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useMemo } from 'react';
import PlantModel from './PlantModel';
import { resolveModel } from '../services/modelResolver';
import './PlantModal.css';

// Determine plant layer based on growth form or name
function getPlantLayer(plant) {
  const name = (plant.species || '').toLowerCase();
  const growthForm = (plant.growth_form || '').toLowerCase();

  // Trees
  if (growthForm.includes('tree') || name.includes('eucalyptus') || name.includes('acacia')) {
    return 'canopy';
  }

  // Shrubs
  if (growthForm.includes('shrub') || name.includes('melaleuca') || name.includes('banksia')) {
    return 'shrub';
  }

  // Default to ground cover
  return 'ground';
}

export default function PlantModal({ plant, onClose }) {
  if (!plant) return null;

  const layer = getPlantLayer(plant);
  const prominence = parseFloat(plant._likelihoodCode) || 3.1;

  const resolved = useMemo(() => resolveModel(plant.species, plant.growth_form), [plant.species, plant.growth_form]);
  const modelPath = resolved?.available ? resolved.path : null;

  return createPortal(
    <div className="plant-modal-overlay">
      <div className="plant-modal">
        <button className="plant-modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="plant-modal-3d">
          <Canvas
            camera={{ position: [0, 3, 8], fov: 45 }}
            shadows
          >
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[5, 10, 5]}
              intensity={1}
              castShadow
            />
            <pointLight position={[-5, 5, -5]} intensity={0.3} />

            <PlantModel
              modelPath={modelPath}
              lifeFormCode={plant.growth_form}
              layer={layer}
              speciesName={plant.species || 'Unknown'}
              commonName={plant.common_name_s || ''}
              prominence={prominence}
              position={[0, 0, 0]}
              height={modelPath ? 5 : undefined}
              scale={modelPath ? 1 : (layer === 'canopy' ? 0.3 : layer === 'shrub' ? 0.8 : 2)}
            />

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <circleGeometry args={[6, 32]} />
              <meshStandardMaterial color="#1a2e1a" roughness={1} />
            </mesh>

            <OrbitControls
              enablePan={false}
              minDistance={3}
              maxDistance={20}
              minPolarAngle={0.2}
              maxPolarAngle={Math.PI / 2 - 0.1}
              autoRotate
              autoRotateSpeed={0.5}
            />
            <Environment preset="forest" />
          </Canvas>
        </div>

        <div className="plant-modal-info">
          <span className="plant-modal-layer">{layer}</span>

          <div className="plant-modal-names">
            <h2 className="plant-modal-common">
              {plant.common_name_s || 'Unknown'}
            </h2>
            <p className="plant-modal-scientific">{plant.species}</p>
          </div>

          {plant.growth_form && (
            <div className="plant-modal-detail">
              <span className="detail-label">Growth Form</span>
              <span className="detail-value">{plant.growth_form}</span>
            </div>
          )}

          <span className="plant-modal-hint">Drag to rotate</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
