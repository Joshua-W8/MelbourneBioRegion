// Shared vegetation-layer grouping used by the on-screen result (InfoPanel)
// and the PDF export (PrintableReport). Kept in its own module so component
// files export only components (react-refresh/only-export-components).

export const LAYER_GROUPS = {
  canopy:    { label: 'Canopy Trees',        color: '#1B5E20', codes: new Set(['IT', 'T']) },
  shrub:     { label: 'Shrubs',              color: '#66BB6A', codes: new Set(['MS', 'SS', 'PS']) },
  graminoid: { label: 'Graminoids',          color: '#b8860b', codes: new Set(['LTG', 'LNG', 'MTG', 'MNG']) },
  herb:      { label: 'Herbs & Wildflowers', color: '#7c5db2', codes: new Set(['LH', 'MH', 'SH']) },
  ground:    { label: 'Ferns & Ground Cover', color: '#228b22', codes: new Set(['GF', 'BL', 'SC']) },
};

export const LAYER_GROUP_ORDER = ['canopy', 'shrub', 'graminoid', 'herb', 'ground'];

// Map life form code → accordion group key
export function lifeFormToGroup(code) {
  if (!code) return 'ground';
  for (const [key, g] of Object.entries(LAYER_GROUPS)) {
    if (g.codes.has(code)) return key;
  }
  return 'ground';
}

// Single source of truth for the landscape-scale / ground-truthing caveat, so
// the on-screen card and the PDF export show identical wording.
export const STRUCTURE_DISCLAIMER =
  'Landscape-scale target for a mature, healthy stand — a revegetation reference that requires site ground-truthing, not a site-specific prescription. Per-hectare figures are for canopy trees only; other layers show projective cover and expected species richness, not stem density.';
