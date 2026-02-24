/**
 * Benchmark Service - Loads EVC bioregional benchmark data
 */

// Cache for benchmark data
let benchmarkData = null;

/**
 * Load EVC benchmark data
 */
async function loadBenchmarkData() {
  if (benchmarkData) return benchmarkData;

  try {
    const response = await fetch('/data/evc_benchmarks.json');
    benchmarkData = await response.json();
    const entryCount = Object.keys(benchmarkData).filter(k => k !== '_meta').length;
    console.log('EVC benchmark data loaded:', entryCount, 'entries');
    return benchmarkData;
  } catch (error) {
    console.error('Error loading EVC benchmark data:', error);
    return null;
  }
}

/**
 * Build composite key from EVC number and bioregion name.
 * e.g. evcNumber=55, bioregion="Gippsland Plain" → "evc_55_gippsland_plain"
 */
function buildKey(evcNumber, bioregion) {
  const slug = bioregion.toLowerCase().replace(/\s+/g, '_');
  return `evc_${evcNumber}_${slug}`;
}

/**
 * Pad string to fixed width
 */
function pad(str, len) {
  const s = String(str ?? '–');
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

/**
 * Log full benchmark breakdown to console
 */
function logBenchmark(b) {
  const W = 70;

  // ── Header ──────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(W));
  console.log(`  EVC ${b.evc_number}: ${b.evc_name}`);
  console.log(`  ${b.bioregion} bioregion`);
  console.log(`  Vegetation type: ${b.vegetation_type}`);
  if (b.recruitment) {
    console.log(`  Recruitment: ${b.recruitment}`);
  }
  console.log('='.repeat(W));

  // ── 1. Canopy ───────────────────────────────────────────────────────
  console.log('\n  CANOPY');
  console.log('  ' + '-'.repeat(W - 2));
  if (b.canopy) {
    console.log(`  Height: ${b.canopy.height_m ?? '?'}m | Cover: ${b.canopy.cover_pct}%`);
    console.log('  Character species:');
    b.canopy.character_species.forEach(s => {
      console.log(`    ${s.scientific_name} (${s.common_name})`);
    });
  } else {
    console.log('  No canopy (treeless community)');
  }

  // ── 2. Large Trees ──────────────────────────────────────────────────
  console.log('\n  LARGE TREES');
  console.log('  ' + '-'.repeat(W - 2));
  if (b.large_trees) {
    const lt = b.large_trees;
    console.log(`  ${lt.genus} | DBH: ${lt.dbh_cm}cm | Density: ${lt.density_per_ha ?? '–'}/ha`);
  } else {
    console.log('  No large trees');
  }

  // ── 3. Understorey Structure ────────────────────────────────────────
  console.log('\n  UNDERSTOREY STRUCTURE');
  console.log('  ' + '-'.repeat(W - 2));
  if (b.understorey && b.understorey.length > 0) {
    // Column header
    console.log(`  ${pad('Life Form', 40)} ${pad('Code', 5)} ${pad('#Spp', 6)} Cover`);

    // Sort by cover descending
    const sorted = [...b.understorey].sort((a, c) => (c.cover_pct || 0) - (a.cover_pct || 0));
    sorted.forEach(u => {
      const spp = u.num_species != null ? String(u.num_species) : 'na';
      console.log(`  ${pad(u.life_form, 40)} ${pad(u.code, 5)} ${pad(spp, 6)} ${u.cover_pct}%`);
    });

    const totalCover = b.understorey.reduce((sum, u) => sum + (u.cover_pct || 0), 0);
    console.log(`  ${' '.repeat(51)} ────`);
    console.log(`  ${pad('', 51)} ${totalCover}% (sum)`);
  } else {
    console.log('  No understorey data');
  }

  // ── 4. Typical Species ──────────────────────────────────────────────
  console.log('\n  TYPICAL SPECIES');
  console.log('  ' + '-'.repeat(W - 2));
  if (b.typical_species && b.typical_species.length > 0) {
    console.log(`  ${b.typical_species.length} species total\n`);

    // Group by LF code
    const groups = {};
    b.typical_species.forEach(s => {
      const code = s.code || '??';
      if (!groups[code]) groups[code] = [];
      groups[code].push(s);
    });

    // Log each group
    Object.entries(groups).forEach(([code, species]) => {
      console.log(`  [${code}] (${species.length})`);
      species.forEach(s => {
        console.log(`    ${s.scientific_name} — ${s.common_name}`);
      });
    });
  } else {
    console.log('  No typical species data');
  }

  // ── 5. Ground Surface ──────────────────────────────────────────────
  console.log('\n  GROUND SURFACE');
  console.log('  ' + '-'.repeat(W - 2));
  if (b.ground_surface) {
    const gs = b.ground_surface;
    const litter = gs.organic_litter_pct != null ? `${gs.organic_litter_pct}%` : '–';
    const logs = gs.logs_m_per_0_1_ha != null ? `${gs.logs_m_per_0_1_ha} m/0.1ha` : '–';
    console.log(`  Organic litter: ${litter} | Logs: ${logs}`);
  } else {
    console.log('  No ground surface data');
  }

  console.log('\n' + '='.repeat(W) + '\n');
}

/**
 * Get benchmark entry for a given EVC number and bioregion.
 * @param {number|string} evcNumber
 * @param {string} bioregion - e.g. "Gippsland Plain"
 * @returns {Promise<Object|null>} Benchmark entry or null
 */
export async function getBenchmark(evcNumber, bioregion) {
  if (!evcNumber || !bioregion) return null;

  const data = await loadBenchmarkData();
  if (!data) return null;

  const key = buildKey(evcNumber, bioregion);
  const entry = data[key] || null;

  if (entry) {
    logBenchmark(entry);
  } else {
    console.warn(`No benchmark found for key: ${key}`);
  }

  return entry;
}
