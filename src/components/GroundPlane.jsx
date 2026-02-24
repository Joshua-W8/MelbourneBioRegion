/**
 * GroundPlane — 10×10m ground surface derived from benchmark data.
 *
 * Colour shifts based on organic litter and bryophyte percentages.
 * Future: terrain mesh, soil cross-sections, log placement.
 */

import { useMemo } from 'react';

const SCENE_SIZE = 10;

function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

export default function GroundPlane({ ground }) {
  const color = useMemo(() => {
    if (!ground) return '#4a6741';

    const litter = (ground.organic_litter_pct ?? 30) / 100;
    const bryo = (ground.bryophyte_pct ?? 0) / 100;

    // Base green, shift toward brown with litter, toward darker green with bryophytes
    const BASE = '#4a6741';
    const LITTER = '#6b5a3e';
    const BRYO = '#2d5428';

    let c = lerpColor(BASE, LITTER, litter * 0.6);
    c = lerpColor(c, BRYO, bryo * 0.4);
    return c;
  }, [ground]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[SCENE_SIZE, SCENE_SIZE]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
