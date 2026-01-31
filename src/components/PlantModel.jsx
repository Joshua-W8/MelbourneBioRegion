import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Stylized 3D Plant Models
 *
 * Usage:
 *   <PlantModel
 *     layer="canopy"
 *     speciesName="Eucalyptus camaldulensis"
 *     prominence={3.2}
 *     position={[0, 0, 0]}
 *   />
 */

// Color palettes for variety
const CANOPY_COLORS = {
  trunk: ['#5D4037', '#6D4C41', '#4E342E', '#795548'],
  foliage: ['#1B5E20', '#2E7D32', '#388E3C', '#1565C0'], // Last one bluish for River Red Gum
};

const SHRUB_COLORS = ['#43A047', '#66BB6A', '#4CAF50', '#81C784'];

const GROUND_COLORS = {
  grass: ['#7CB342', '#8BC34A', '#9CCC65', '#AED581'],
  forb: ['#558B2F', '#689F38', '#7CB342', '#8BC34A'],
};

// Get consistent color based on species name (deterministic)
function getColorFromName(name, palette) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

/**
 * Canopy Tree Model
 * Green cone on brown cylinder trunk
 * Prominent (3.2) trees are taller and wider
 */
function CanopyTree({ speciesName, prominence, scale = 1 }) {
  const isProminent = prominence >= 3.2;

  // Size based on prominence
  const height = isProminent ? 12 + Math.random() * 8 : 6 + Math.random() * 6;
  const crownWidth = isProminent ? 2 + Math.random() * 1.5 : 1 + Math.random() * 1;
  const trunkRadius = isProminent ? 0.15 : 0.1;

  const trunkHeight = height * 0.35;
  const crownHeight = height * 0.65;

  const trunkColor = getColorFromName(speciesName, CANOPY_COLORS.trunk);
  const foliageColor = getColorFromName(speciesName, CANOPY_COLORS.foliage);

  // Add slight lean for natural look
  const lean = (Math.random() - 0.5) * 0.1;

  return (
    <group scale={scale} rotation={[lean, Math.random() * Math.PI * 2, 0]}>
      {/* Trunk - tapered cylinder */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[trunkRadius * 0.7, trunkRadius, trunkHeight, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>

      {/* Main crown - cone */}
      <mesh position={[0, trunkHeight + crownHeight * 0.4, 0]} castShadow>
        <coneGeometry args={[crownWidth, crownHeight * 0.8, 8]} />
        <meshStandardMaterial color={foliageColor} roughness={0.8} />
      </mesh>

      {/* Secondary smaller cone on top for fuller look */}
      {isProminent && (
        <mesh position={[0, trunkHeight + crownHeight * 0.7, 0]} castShadow>
          <coneGeometry args={[crownWidth * 0.5, crownHeight * 0.4, 6]} />
          <meshStandardMaterial color={foliageColor} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Shrub Model
 * Cluster of green spheres
 * Prominent shrubs are larger with more spheres
 */
function ShrubCluster({ speciesName, prominence, scale = 1 }) {
  const isProminent = prominence >= 3.2;

  const baseSize = isProminent ? 0.6 : 0.4;
  const height = isProminent ? 2 + Math.random() * 1.5 : 1 + Math.random() * 1;

  const color = getColorFromName(speciesName, SHRUB_COLORS);

  // Generate sphere positions for cluster
  const spheres = useMemo(() => {
    const count = isProminent ? 5 : 3;
    const positions = [];

    // Central sphere
    positions.push({ x: 0, y: height * 0.5, z: 0, size: baseSize });

    // Surrounding spheres
    for (let i = 1; i < count; i++) {
      const angle = (i / (count - 1)) * Math.PI * 2;
      const radius = baseSize * 0.6;
      positions.push({
        x: Math.cos(angle) * radius,
        y: height * 0.3 + Math.random() * height * 0.3,
        z: Math.sin(angle) * radius,
        size: baseSize * (0.6 + Math.random() * 0.3),
      });
    }

    return positions;
  }, [isProminent, baseSize, height]);

  return (
    <group scale={scale}>
      {spheres.map((sphere, i) => (
        <mesh
          key={i}
          position={[sphere.x, sphere.y, sphere.z]}
          castShadow
        >
          <sphereGeometry args={[sphere.size, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Ground Cover Model
 * Flat planes arranged as grass tufts or low plants
 * Uses billboard-style crossed planes for grass effect
 */
function GroundCover({ speciesName, prominence, scale = 1 }) {
  const isProminent = prominence >= 3.2;

  const height = isProminent ? 0.4 + Math.random() * 0.3 : 0.2 + Math.random() * 0.2;
  const width = isProminent ? 0.3 : 0.2;

  // Determine if it's grass-like or forb-like based on name
  const isGrass = speciesName.toLowerCase().includes('grass') ||
                  speciesName.toLowerCase().includes('stipa') ||
                  speciesName.toLowerCase().includes('themeda') ||
                  speciesName.toLowerCase().includes('poa');

  const color = getColorFromName(
    speciesName,
    isGrass ? GROUND_COLORS.grass : GROUND_COLORS.forb
  );

  if (isGrass) {
    // Grass tuft - multiple crossed planes
    return (
      <group scale={scale}>
        {[0, 60, 120].map((rotation, i) => (
          <mesh
            key={i}
            position={[0, height / 2, 0]}
            rotation={[0, (rotation * Math.PI) / 180, 0]}
          >
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
              color={color}
              side={THREE.DoubleSide}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>
    );
  } else {
    // Forb/herb - small dome shape
    return (
      <group scale={scale}>
        <mesh position={[0, height * 0.3, 0]}>
          <sphereGeometry args={[width, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      </group>
    );
  }
}

/**
 * Main PlantModel Component
 *
 * Props:
 *   - layer: 'canopy' | 'shrub' | 'ground'
 *   - speciesName: string (for color variation)
 *   - commonName: string (for display)
 *   - prominence: 3.1 | 3.2 (affects size)
 *   - position: [x, y, z] (optional, default [0,0,0])
 *   - scale: number (optional, default 1)
 *   - onClick: function (optional, called when plant is clicked)
 */
export default function PlantModel({
  layer,
  speciesName = 'Unknown',
  commonName = '',
  prominence = 3.1,
  position = [0, 0, 0],
  scale = 1,
  onClick,
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        speciesName,
        commonName,
        layer,
        prominence,
      });
    }
  };

  return (
    <group position={position} onClick={handleClick}>
      {layer === 'canopy' && (
        <CanopyTree speciesName={speciesName} prominence={prominence} scale={scale} />
      )}
      {layer === 'shrub' && (
        <ShrubCluster speciesName={speciesName} prominence={prominence} scale={scale} />
      )}
      {layer === 'ground' && (
        <GroundCover speciesName={speciesName} prominence={prominence} scale={scale} />
      )}
    </group>
  );
}

// Export individual components for direct use if needed
export { CanopyTree, ShrubCluster, GroundCover };
