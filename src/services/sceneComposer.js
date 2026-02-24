/**
 * Scene Composer — builds a 10×10m diorama from EVC benchmark data + species traits.
 *
 * Reads benchmark cover percentages and species life form codes to produce
 * ecologically accurate placement. Deterministic via seeded PRNG.
 */

import { resolveModel } from './modelResolver.js';

// ── Scene configuration ───────────────────────────────────────────────────────

const SCENE_SIZE = 10; // metres
const HALF = SCENE_SIZE / 2;

/** Edge bias for canopy trees — fraction of scene radius they're pushed outward */
const CANOPY_COMPRESSION = 0.6;

/** Instances per m² of scene area for each life form code */
const INSTANCES_PER_M2 = {
  IT:  0.02,  // ~2 trees in 100m²
  T:   0.04,
  MS:  0.15,
  SS:  0.25,
  PS:  0.30,
  LH:  0.20,
  MH:  0.35,
  SH:  0.50,
  LTG: 0.30,
  LNG: 0.25,
  MTG: 0.40,
  MNG: 0.45,
  GF:  0.20,
  SC:  0.10,
};

const SCENE_AREA = SCENE_SIZE * SCENE_SIZE; // 100 m²

/** Life form code → layer mapping */
const CODE_TO_LAYER = {
  IT:  'canopy',
  T:   'subcanopy',
  MS:  'shrub',
  SS:  'shrub',
  PS:  'shrub',
  LH:  'ground',
  MH:  'ground',
  SH:  'ground',
  LTG: 'ground',
  LNG: 'ground',
  MTG: 'ground',
  MNG: 'ground',
  GF:  'ground',
  SC:  'ground',
};

/** Minimum spacing (metres) between instances by layer */
const MIN_SPACING = {
  canopy: 2.0,
  subcanopy: 1.2,
  shrub: 0.5,
  ground: 0.2,
};

/** Life form display names */
const LF_NAMES = {
  IT:  'Immature Canopy Tree',
  T:   'Understorey Tree',
  MS:  'Medium Shrub',
  SS:  'Small Shrub',
  PS:  'Prostrate Shrub',
  LH:  'Large Herb',
  MH:  'Medium Herb',
  SH:  'Small Herb',
  LTG: 'Large Tussock',
  LNG: 'Large Non-tufted Gram.',
  MTG: 'Medium Tussock',
  MNG: 'Medium Non-tufted Gram.',
  GF:  'Ground Fern',
  SC:  'Scrambler/Climber',
};

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Placement helpers ─────────────────────────────────────────────────────────

function edgeBiasedPosition(rand) {
  // Push toward edges using CANOPY_COMPRESSION
  const angle = rand() * Math.PI * 2;
  const minR = HALF * CANOPY_COMPRESSION;
  const maxR = HALF - 0.5; // keep 0.5m from edge
  const r = minR + rand() * (maxR - minR);
  return [Math.cos(angle) * r, 0, Math.sin(angle) * r];
}

function randomPosition(rand) {
  return [
    (rand() - 0.5) * (SCENE_SIZE - 0.5),
    0,
    (rand() - 0.5) * (SCENE_SIZE - 0.5),
  ];
}

function isTooClose(pos, placed, minDist) {
  for (const p of placed) {
    const dx = pos[0] - p[0];
    const dz = pos[2] - p[2];
    if (dx * dx + dz * dz < minDist * minDist) return true;
  }
  return false;
}

function placeInstance(rand, placed, layer, edgeBias) {
  const minDist = MIN_SPACING[layer] || 0.3;
  for (let attempt = 0; attempt < 40; attempt++) {
    const pos = edgeBias ? edgeBiasedPosition(rand) : randomPosition(rand);
    if (!isTooClose(pos, placed, minDist)) {
      placed.push(pos);
      return pos;
    }
  }
  // Fallback — place anyway
  const pos = randomPosition(rand);
  placed.push(pos);
  return pos;
}

/** Minimum visible height in the scene (metres) */
const MIN_VISIBLE_HEIGHT = 0.15;

// ── Instance variation helpers ────────────────────────────────────────────────

/**
 * Generate per-instance variation: randomised height within species range,
 * Y rotation, and XZ asymmetry skew.
 */
function randomInstanceProps(rand, sp, fallbackHeight, canopyHeightCap) {
  const meanH = sp?.traits?.plant_height || fallbackHeight;
  const hMin = sp?.traits?.plant_height_min || meanH * 0.75;
  const hMax = sp?.traits?.plant_height_max || meanH * 1.25;
  let instanceHeight = hMin + rand() * (hMax - hMin);

  // Cap canopy trees at benchmark canopy height
  if (canopyHeightCap != null && instanceHeight > canopyHeightCap) {
    instanceHeight = canopyHeightCap;
  }

  // Clamp to minimum visible size
  if (instanceHeight < MIN_VISIBLE_HEIGHT) {
    instanceHeight = MIN_VISIBLE_HEIGHT;
  }

  return {
    instance_height: instanceHeight,
    rotation_y: rand() * Math.PI * 2,
    xz_skew: 0.85 + rand() * 0.3,
  };
}

// ── Species selection helpers ─────────────────────────────────────────────────

function pickSpeciesWeighted(candidates, rand) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Weight by prominence_code (3.2 = prominent, 3.1 = present)
  const weights = candidates.map(s => {
    const p = s.prominence_code ?? 3.1;
    return p >= 3.2 ? 3 : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// ── Main composer ─────────────────────────────────────────────────────────────

/**
 * Compose a 10×10m scene from benchmark + species data.
 *
 * @param {Object} benchmark  — EVC benchmark entry (from benchmarkService)
 * @param {Object} species    — { prominent: [...], present: [...] } from speciesService
 * @param {Function} resolveModelFn — resolveModel(scientificName, lifeFormCode)
 * @returns {{ instances: Array, ground: Object, stats: Object }}
 */
export function composeScene(benchmark, species, resolveModelFn) {
  if (!benchmark || !species) return null;

  const seed = hashSeed(`${benchmark.evc_number}_${benchmark.bioregion}`);
  const rand = mulberry32(seed);

  const allSpecies = [...(species.prominent || []), ...(species.present || [])];
  const instances = [];
  const placed = []; // all placed positions for collision avoidance
  const stats = {}; // { code: { name, count, cover_pct } }
  let nextId = 1;

  // ── Phase 1: Canopy trees (IT) ────────────────────────────────────────

  if (benchmark.canopy) {
    const canopySpecies = allSpecies.filter(s => s.life_form_code === 'IT');
    const coverPct = benchmark.canopy.cover_pct || 0;
    const instanceCount = Math.max(1, Math.round(coverPct / 100 * SCENE_AREA * INSTANCES_PER_M2.IT));
    const capped = Math.min(instanceCount, 5); // max 5 canopy trees

    for (let i = 0; i < capped; i++) {
      const sp = canopySpecies.length > 0
        ? pickSpeciesWeighted(canopySpecies, rand)
        : (benchmark.canopy.character_species?.[0]
            ? { species: benchmark.canopy.character_species[0].scientific_name,
                common_name: benchmark.canopy.character_species[0].common_name,
                life_form_code: 'IT',
                traits: { plant_height: benchmark.canopy.height_m || 15 },
                prominence_code: 3.2 }
            : null);

      if (!sp) continue;

      const pos = placeInstance(rand, placed, 'canopy', true);
      const height = sp.traits?.plant_height || benchmark.canopy.height_m || 15;
      const model = resolveModelFn(sp.species, 'IT');
      const variation = randomInstanceProps(rand, sp, height, benchmark.canopy.height_m);

      instances.push({
        id: nextId++,
        species: sp.species,
        common_name: sp.common_name || '',
        life_form_code: 'IT',
        position: pos,
        height,
        ...variation,
        model_path: model?.path || null,
        model_available: model?.available || false,
        model_level: model?.level || null,
        layer: 'canopy',
        prominence: sp.prominence_code ?? 3.2,
      });
    }

    stats.IT = { name: LF_NAMES.IT, count: capped, cover_pct: coverPct };
  }

  // ── Phase 2: Understorey ───────────────────────────────────────────────

  if (benchmark.understorey) {
    // Group species by LF code
    const speciesByCode = {};
    allSpecies.forEach(s => {
      const code = s.life_form_code || 'MH';
      if (!speciesByCode[code]) speciesByCode[code] = [];
      speciesByCode[code].push(s);
    });

    // Index benchmark typical_species by code for priority placement
    const typicalByCode = {};
    if (benchmark.typical_species) {
      for (const ts of benchmark.typical_species) {
        const code = ts.code;
        if (!typicalByCode[code]) typicalByCode[code] = [];
        typicalByCode[code].push(ts);
      }
    }

    for (const row of benchmark.understorey) {
      const code = row.code;
      if (code === 'BL') continue;  // no geometry for bryophytes/lichens
      if (code === 'IT') continue;  // handled by Phase 1
      const coverPct = row.cover_pct || 0;
      const density = INSTANCES_PER_M2[code] || 0.2;
      const rawCount = Math.round(coverPct / 100 * SCENE_AREA * density);
      const instanceCount = Math.min(
        Math.max(rawCount, coverPct > 0 ? 1 : 0),  // at least 1 if cover > 0
        60
      );
      const layer = CODE_TO_LAYER[code] || 'ground';
      const candidates = speciesByCode[code] || [];

      // Identify typical species for this code that exist in our species list
      const typicalForCode = typicalByCode[code] || [];
      const typicalCandidates = [];
      for (const ts of typicalForCode) {
        const match = candidates.find(c => c.species === ts.scientific_name);
        if (match) typicalCandidates.push(match);
      }

      let placed_count = 0;

      // Place typical species first — one instance each, up to instanceCount
      for (const sp of typicalCandidates) {
        if (placed_count >= instanceCount) break;

        const speciesName = sp.species;
        const commonName = sp.common_name || '';
        const height = sp.traits?.plant_height || 0.5;
        const prominence = sp.prominence_code ?? 3.2;

        const pos = placeInstance(rand, placed, layer, false);
        const model = resolveModelFn(speciesName, code);
        const variation = randomInstanceProps(rand, sp, height, null);

        instances.push({
          id: nextId++,
          species: speciesName,
          common_name: commonName,
          life_form_code: code,
          position: pos,
          height,
          ...variation,
          model_path: model?.path || null,
          model_available: model?.available || false,
          model_level: model?.level || null,
          layer,
          prominence,
        });
        placed_count++;
      }

      // Fill remaining slots with weighted random selection
      for (; placed_count < instanceCount; placed_count++) {
        const sp = pickSpeciesWeighted(candidates, rand);

        const speciesName = sp?.species || `Unknown ${LF_NAMES[code] || code}`;
        const commonName = sp?.common_name || '';
        const height = sp?.traits?.plant_height || 0.5;
        const prominence = sp?.prominence_code ?? 3.1;

        const pos = placeInstance(rand, placed, layer, false);
        const model = resolveModelFn(speciesName, code);
        const variation = randomInstanceProps(rand, sp, height, null);

        instances.push({
          id: nextId++,
          species: speciesName,
          common_name: commonName,
          life_form_code: code,
          position: pos,
          height,
          ...variation,
          model_path: model?.path || null,
          model_available: model?.available || false,
          model_level: model?.level || null,
          layer,
          prominence,
        });
      }

      if (instanceCount > 0 || coverPct > 0) {
        stats[code] = {
          name: LF_NAMES[code] || code,
          count: instanceCount,
          cover_pct: coverPct,
        };
      }
    }
  }

  // ── Phase 3: Ground surface ────────────────────────────────────────────

  const ground = {
    organic_litter_pct: benchmark.ground_surface?.organic_litter_pct ?? 30,
    bryophyte_pct: 0,
    logs_m: benchmark.ground_surface?.logs_m_per_0_1_ha ?? 0,
  };

  // Check for bryophyte cover in understorey
  const bryRow = benchmark.understorey?.find(u => u.code === 'BL');
  if (bryRow) {
    ground.bryophyte_pct = bryRow.cover_pct || 0;
  }

  // ── Console log composition breakdown ──────────────────────────────────

  console.log('\n' + '='.repeat(70));
  console.log('  SCENE COMPOSITION — 10×10m plot');
  console.log(`  EVC ${benchmark.evc_number}: ${benchmark.evc_name}`);
  console.log('='.repeat(70));
  console.log(`  Total instances: ${instances.length}`);
  console.log('');

  Object.entries(stats)
    .sort((a, b) => (b[1].cover_pct || 0) - (a[1].cover_pct || 0))
    .forEach(([code, s]) => {
      console.log(`  [${code}] ${s.name}: ${s.count} instances (${s.cover_pct}% cover)`);
    });

  console.log(`\n  Ground: ${ground.organic_litter_pct}% litter, ${ground.bryophyte_pct}% bryophytes, ${ground.logs_m}m logs`);
  console.log('='.repeat(70) + '\n');

  return { instances, ground, stats };
}
