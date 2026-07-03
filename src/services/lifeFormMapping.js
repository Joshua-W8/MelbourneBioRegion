/**
 * Life Form Mapping — compares species with life_form_code assignments
 * against EVC benchmark understorey structure.
 *
 * Species now carry life_form_code directly (assigned by trait_matcher.py).
 * No translation layer needed — life_form_code is the shared key between
 * benchmark data and species data.
 */

// ── Life form display names ───────────────────────────────────────────────────

const LF_NAMES = {
  IT:  'Immature Canopy Tree',
  T:   'Understorey Tree or Large Shrub',
  MS:  'Medium Shrub',
  SS:  'Small Shrub',
  PS:  'Prostrate Shrub',
  LH:  'Large Herb',
  MH:  'Medium Herb',
  SH:  'Small or Prostrate Herb',
  LTG: 'Large Tufted Graminoid',
  LNG: 'Large Non-tufted Graminoid',
  MTG: 'Medium to Small Tufted Graminoid',
  MNG: 'Medium to Tiny Non-tufted Graminoid',
  GF:  'Ground Fern',
  SC:  'Scrambler or Climber',
  BL:  'Bryophytes/Lichens',
};

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Compare a species list against a benchmark's understorey structure.
 *
 * Groups species by their life_form_code, then logs a side-by-side table
 * showing benchmark targets vs actual species matches, sorted by benchmark
 * cover descending. Also shows model resolution for each species.
 *
 * @param {Array} species   – enriched species array (prominent + present)
 *                            each entry needs: { species, common_name, life_form_code }
 * @param {Object} benchmark – full benchmark entry from evc_benchmarks.json
 * @returns {Array} comparison rows for downstream use
 */
export function matchSpeciesToBenchmark(species, benchmark) {
  if (!species || !benchmark?.understorey) {
    console.warn('matchSpeciesToBenchmark: missing species or benchmark understorey data');
    return null;
  }

  const W = 100;

  // 1. Group species by life_form_code (read directly — no translation)
  const byCode = {};
  species.forEach(s => {
    const code = s.life_form_code || 'MH';
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push(s);
  });

  // 2. Build benchmark rows sorted by cover descending
  const benchRows = [...benchmark.understorey].sort(
    (a, b) => (b.cover_pct || 0) - (a.cover_pct || 0)
  );

  // 3. Collect codes present in species but not in benchmark
  const benchCodes = new Set(benchRows.map(r => r.code));
  const extraCodes = Object.keys(byCode).filter(c => !benchCodes.has(c));

  // 4. Build result rows
  const rows = [];

  benchRows.forEach(u => {
    const matched = byCode[u.code] || [];
    const gap = matched.length - (u.num_species || 0);
    rows.push({
      code: u.code,
      lfName: u.life_form,
      benchCover: u.cover_pct,
      benchSpp: u.num_species,
      matched,
      gap,
      inBenchmark: true,
    });
  });

  extraCodes.forEach(code => {
    rows.push({
      code,
      lfName: LF_NAMES[code] || code,
      benchCover: null,
      benchSpp: null,
      matched: byCode[code],
      gap: null,
      inBenchmark: false,
    });
  });

  // 5. Console output — summary table
  console.log('\n' + '='.repeat(W));
  console.log('  SPECIES ↔ BENCHMARK COMPARISON');
  console.log(`  ${benchmark.evc_name} — ${benchmark.bioregion}`);
  console.log(`  ${species.length} species mapped against ${benchRows.length} understorey life forms`);
  console.log('='.repeat(W));

  const hdr = `  ${pad('LF Code', 6)} ${pad('Life Form', 36)} ${pad('Cover', 6)} ${pad('Bench#', 7)} ${pad('Match#', 7)} ${pad('Gap', 5)} Matched Species`;
  console.log(hdr);
  console.log('  ' + '-'.repeat(W - 2));

  rows.forEach(r => {
    const cover = r.benchCover != null ? `${r.benchCover}%` : '–';
    const bSpp = r.benchSpp != null ? String(r.benchSpp) : 'na';
    const mCount = String(r.matched.length);
    const gap = r.gap != null ? (r.gap >= 0 ? `+${r.gap}` : String(r.gap)) : '–';

    // Truncated species name list
    const names = r.matched.map(s => {
      const cn = s.common_name ? s.common_name.split(',')[0].trim() : null;
      return cn || s.species.split(' ')[0];
    });
    const nameStr = names.length > 0 ? names.join(', ') : '(none)';
    const maxNameLen = 38;
    const truncated = nameStr.length > maxNameLen
      ? nameStr.slice(0, maxNameLen - 3) + '...'
      : nameStr;

    const marker = !r.inBenchmark ? ' *' : '';

    // Summary row — always visible
    console.log(
      `  ${pad(r.code, 6)} ${pad(r.lfName, 36)} ${pad(cover, 6)} ${pad(bSpp, 7)} ${pad(mCount, 7)} ${pad(gap, 5)} ${truncated}${marker}`
    );

    // Per-species detail — collapsed
    if (r.matched.length > 0) {
      console.groupCollapsed(`         ${r.code} species detail (${r.matched.length})`);
      r.matched.forEach(s => {
        const cn = s.common_name ? s.common_name.split(',')[0].trim() : '';
        console.log(`→ ${s.species}${cn ? ` (${cn})` : ''}`);
      });
      console.groupEnd();
    }
  });

  // Summary
  console.log('  ' + '-'.repeat(W - 2));
  const totalMatched = Object.values(byCode).reduce((sum, arr) => sum + arr.length, 0);
  const totalBenchSpp = benchRows.reduce((sum, u) => sum + (u.num_species || 0), 0);
  const coveredCodes = benchRows.filter(u => (byCode[u.code] || []).length > 0).length;
  console.log(`  ${coveredCodes}/${benchRows.length} life forms have species | ${totalMatched}/${totalBenchSpp} benchmark species slots filled`);
  if (extraCodes.length > 0) {
    console.log(`  * ${extraCodes.join(', ')} — species mapped here but no benchmark slot exists`);
  }
  console.log('='.repeat(W) + '\n');

  return rows;
}

// ── Internal helper ───────────────────────────────────────────────────────────

function pad(str, len) {
  const s = String(str ?? '–');
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}
