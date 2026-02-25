import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

/**
 * Stylized 3D Plant Models — dispatches geometry by life_form_code.
 *
 * 13 life form codes → distinct visual forms:
 *   IT  → CanopyTree (tall trunk + double cone crown)
 *   T   → SubcanopyTree (shorter, narrower variant)
 *   MS  → ShrubCluster (sphere cluster)
 *   SS  → SmallShrub (low hemisphere)
 *   PS  → ProstrateShrub (flat hemisphere)
 *   LTG → TussockGrass (tall crossed planes)
 *   MTG → TussockGrass (medium crossed planes)
 *   LNG → SpreadingGrass (low spreading planes)
 *   MNG → SpreadingGrass (smaller spreading planes)
 *   LH  → HerbDome (medium dome)
 *   MH  → HerbDome (small dome)
 *   SH  → ProstrateHerb (flat disc)
 *   GF  → FernFan (crossed planes with green)
 *   SC  → Scrambler (thin vertical form)
 *
 * Falls back to layer-based selection when no lifeFormCode provided.
 */

// ── Color palettes ────────────────────────────────────────────────────────────

const CANOPY_COLORS = {
  trunk: ['#5D4037', '#6D4C41', '#4E342E', '#795548'],
  foliage: ['#1B5E20', '#2E7D32', '#388E3C', '#1565C0'],
};

const SHRUB_COLORS = ['#43A047', '#66BB6A', '#4CAF50', '#81C784'];

const GROUND_COLORS = {
  grass: ['#7CB342', '#8BC34A', '#9CCC65', '#AED581'],
  forb: ['#558B2F', '#689F38', '#7CB342', '#8BC34A'],
  fern: ['#2E7D32', '#388E3C', '#43A047', '#4CAF50'],
};

function getColorFromName(name, palette) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

// ── Geometry components ───────────────────────────────────────────────────────

function CanopyTree({ speciesName, prominence, height: propHeight, scale = 1 }) {
  const isProminent = prominence >= 3.2;
  const height = propHeight || (isProminent ? 15 : 8);
  const crownWidth = isProminent ? 2.5 : 1.5;
  const trunkRadius = isProminent ? 0.15 : 0.1;
  const trunkHeight = height * 0.35;
  const crownHeight = height * 0.65;

  const trunkColor = getColorFromName(speciesName, CANOPY_COLORS.trunk);
  const foliageColor = getColorFromName(speciesName, CANOPY_COLORS.foliage);

  return (
    <group scale={scale}>
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[trunkRadius * 0.7, trunkRadius, trunkHeight, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, trunkHeight + crownHeight * 0.4, 0]} castShadow>
        <coneGeometry args={[crownWidth, crownHeight * 0.8, 8]} />
        <meshStandardMaterial color={foliageColor} roughness={0.8} />
      </mesh>
      {isProminent && (
        <mesh position={[0, trunkHeight + crownHeight * 0.7, 0]} castShadow>
          <coneGeometry args={[crownWidth * 0.5, crownHeight * 0.4, 6]} />
          <meshStandardMaterial color={foliageColor} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

function SubcanopyTree({ speciesName, prominence, height: propHeight, scale = 1 }) {
  const height = propHeight || 5;
  const crownWidth = 1.0 + (prominence >= 3.2 ? 0.5 : 0);
  const trunkRadius = 0.08;
  const trunkHeight = height * 0.3;
  const crownHeight = height * 0.7;

  const trunkColor = getColorFromName(speciesName, CANOPY_COLORS.trunk);
  const foliageColor = getColorFromName(speciesName, CANOPY_COLORS.foliage);

  return (
    <group scale={scale}>
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[trunkRadius * 0.7, trunkRadius, trunkHeight, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, trunkHeight + crownHeight * 0.4, 0]} castShadow>
        <coneGeometry args={[crownWidth, crownHeight * 0.8, 7]} />
        <meshStandardMaterial color={foliageColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

function ShrubCluster({ speciesName, prominence, height: propHeight, scale = 1 }) {
  const isProminent = prominence >= 3.2;
  const baseSize = isProminent ? 0.6 : 0.4;
  const height = propHeight || (isProminent ? 2.5 : 1.5);
  const color = getColorFromName(speciesName, SHRUB_COLORS);

  const spheres = useMemo(() => {
    const count = isProminent ? 5 : 3;
    const positions = [{ x: 0, y: height * 0.5, z: 0, size: baseSize }];
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
      {spheres.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} castShadow>
          <sphereGeometry args={[s.size, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function SmallShrub({ speciesName, height: propHeight, scale = 1 }) {
  const h = propHeight || 0.6;
  const radius = h * 0.6;
  const color = getColorFromName(speciesName, SHRUB_COLORS);

  return (
    <group scale={scale}>
      <mesh position={[0, h * 0.3, 0]} castShadow>
        <sphereGeometry args={[radius, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function ProstrateShrub({ speciesName, height: propHeight, scale = 1 }) {
  const h = propHeight || 0.3;
  const radius = h * 1.2;
  const color = getColorFromName(speciesName, SHRUB_COLORS);

  return (
    <group scale={scale}>
      <mesh position={[0, h * 0.15, 0]} castShadow>
        <sphereGeometry args={[radius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 3]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function TussockGrass({ speciesName, height: propHeight, large, scale = 1 }) {
  const h = propHeight || (large ? 0.6 : 0.35);
  const w = large ? 0.35 : 0.25;
  const color = getColorFromName(speciesName, GROUND_COLORS.grass);

  return (
    <group scale={scale}>
      {[0, 60, 120].map((rot, i) => (
        <mesh key={i} position={[0, h / 2, 0]} rotation={[0, (rot * Math.PI) / 180, 0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function SpreadingGrass({ speciesName, height: propHeight, large, scale = 1 }) {
  const h = propHeight || (large ? 0.4 : 0.25);
  const w = large ? 0.5 : 0.35;
  const color = getColorFromName(speciesName, GROUND_COLORS.grass);

  return (
    <group scale={scale}>
      {[0, 90].map((rot, i) => (
        <mesh key={i} position={[0, h * 0.3, 0]} rotation={[(15 * Math.PI) / 180, (rot * Math.PI) / 180, 0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function HerbDome({ speciesName, height: propHeight, large, scale = 1 }) {
  const h = propHeight || (large ? 0.5 : 0.3);
  const radius = large ? 0.3 : 0.2;
  const color = getColorFromName(speciesName, GROUND_COLORS.forb);

  return (
    <group scale={scale}>
      <mesh position={[0, h * 0.3, 0]}>
        <sphereGeometry args={[radius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function ProstrateHerb({ speciesName, scale = 1 }) {
  const color = getColorFromName(speciesName, GROUND_COLORS.forb);

  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function FernFan({ speciesName, height: propHeight, scale = 1 }) {
  const h = propHeight || 0.4;
  const w = 0.3;
  const color = getColorFromName(speciesName, GROUND_COLORS.fern);

  return (
    <group scale={scale}>
      {[0, 72, 144, 216, 288].map((rot, i) => (
        <mesh key={i} position={[0, h / 2, 0]} rotation={[0.15, (rot * Math.PI) / 180, 0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Scrambler({ speciesName, height: propHeight, scale = 1 }) {
  const h = propHeight || 1.0;
  const color = getColorFromName(speciesName, GROUND_COLORS.forb);

  return (
    <group scale={scale}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, h, 5]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.05, h * 0.7, 0]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ── Geometry dispatch by life form code ───────────────────────────────────────

function GeometryByLifeForm({ lifeFormCode, speciesName, prominence, height, scale }) {
  const props = { speciesName, prominence, height, scale };

  switch (lifeFormCode) {
    case 'IT':  return <CanopyTree {...props} />;
    case 'T':   return <SubcanopyTree {...props} />;
    case 'MS':  return <ShrubCluster {...props} />;
    case 'SS':  return <SmallShrub {...props} />;
    case 'PS':  return <ProstrateShrub {...props} />;
    case 'LTG': return <TussockGrass {...props} large />;
    case 'MTG': return <TussockGrass {...props} />;
    case 'LNG': return <SpreadingGrass {...props} large />;
    case 'MNG': return <SpreadingGrass {...props} />;
    case 'LH':  return <HerbDome {...props} large />;
    case 'MH':  return <HerbDome {...props} />;
    case 'SH':  return <ProstrateHerb speciesName={speciesName} scale={scale} />;
    case 'GF':  return <FernFan {...props} />;
    case 'SC':  return <Scrambler {...props} />;
    default:    return <HerbDome {...props} />;
  }
}

// ── Legacy geometry dispatch by layer ─────────────────────────────────────────

function GeometryByLayer({ layer, speciesName, prominence, height, scale }) {
  switch (layer) {
    case 'canopy':
      return <CanopyTree speciesName={speciesName} prominence={prominence} height={height} scale={scale} />;
    case 'shrub':
      return <ShrubCluster speciesName={speciesName} prominence={prominence} height={height} scale={scale} />;
    case 'ground':
    default: {
      const isGrass = speciesName.toLowerCase().match(/grass|stipa|themeda|poa/);
      return isGrass
        ? <TussockGrass speciesName={speciesName} height={height} scale={scale} />
        : <HerbDome speciesName={speciesName} height={height} scale={scale} />;
    }
  }
}

// ── GLB Model loader ──────────────────────────────────────────────────────────

function GLBModel({ modelPath, scale = 1 }) {
  const { scene } = useGLTF(`/models/${modelPath}`);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={clonedScene} scale={scale} />;
}

// ── Main PlantModel Component ─────────────────────────────────────────────────

/**
 * Props:
 *   - layer: 'canopy' | 'shrub' | 'ground' (legacy, used as fallback)
 *   - lifeFormCode: string (e.g. 'IT', 'MTG') — preferred dispatch key
 *   - speciesName: string
 *   - commonName: string
 *   - prominence: number (3.1 | 3.2)
 *   - height: number (metres, from traits)
 *   - position: [x, y, z]
 *   - scale: number
 *   - modelPath: string (TODO: future GLB loading)
 *   - onClick: function
 */
export default function PlantModel({
  layer,
  lifeFormCode,
  speciesName = 'Unknown',
  commonName = '',
  prominence = 3.1,
  height,
  position = [0, 0, 0],
  scale = 1,
  modelPath,
  onClick,
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        speciesName,
        commonName,
        layer,
        lifeFormCode,
        height,
        prominence,
      });
    }
  };

  if (modelPath) {
    return (
      <group position={position} onClick={handleClick}>
        <GLBModel modelPath={modelPath} scale={scale} />
      </group>
    );
  }

  return (
    <group position={position} onClick={handleClick}>
      {lifeFormCode ? (
        <GeometryByLifeForm
          lifeFormCode={lifeFormCode}
          speciesName={speciesName}
          prominence={prominence}
          height={height}
          scale={scale}
        />
      ) : (
        <GeometryByLayer
          layer={layer}
          speciesName={speciesName}
          prominence={prominence}
          height={height}
          scale={scale}
        />
      )}
    </group>
  );
}

export { CanopyTree, ShrubCluster, TussockGrass as GroundCover };

useGLTF.preload('/models/eucalyptus_camaldulensis/mature.glb');
useGLTF.preload('/models/themeda_triandra/tussock_01.glb');
