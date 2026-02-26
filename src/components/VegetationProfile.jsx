import { useState, useMemo, useCallback } from 'react';
import useMapStore from '../store/useMapStore';
import './VegetationProfile.css';

// ── Profile layer groups (6 groups for ecological cross-section) ──────────────

const PROFILE_GROUPS = {
  canopy:    { label: 'Canopy Trees',       color: '#1B5E20', codes: new Set(['IT']) },
  subcanopy: { label: 'Understorey Trees',  color: '#2E7D32', codes: new Set(['T']) },
  shrub:     { label: 'Shrubs',             color: '#66BB6A', codes: new Set(['MS', 'SS', 'PS']) },
  graminoid: { label: 'Graminoids',         color: '#b8860b', codes: new Set(['LTG', 'LNG', 'MTG', 'MNG']) },
  herb:      { label: 'Herbs & Wildflowers', color: '#7c5db2', codes: new Set(['LH', 'MH', 'SH']) },
  ground:    { label: 'Ferns & Ground Cover', color: '#228b22', codes: new Set(['GF', 'BL', 'SC']) },
};

const PROFILE_GROUP_ORDER = ['canopy', 'subcanopy', 'shrub', 'graminoid', 'herb', 'ground'];

const LAYER_DESCRIPTIONS = {
  canopy: 'The structural canopy \u2014 eucalypts that define the woodland character. Their shade regime determines which understorey species can grow beneath.',
  subcanopy: 'Mid-storey layer creating vertical complexity. Shelter for small birds, alternative food sources. Links the canopy to the shrub layer.',
  shrub: 'Dense woody layer providing nesting habitat and wind protection. Many are host plants for butterfly larvae.',
  graminoid: 'The dominant ground layer \u2014 tussock grasses hold soil, manage water infiltration, and fuel the cool burns that maintained this ecosystem for millennia.',
  herb: 'The diversity engine \u2014 seasonal blooms support pollinators that sustain the entire food web. Often the most species-rich layer.',
  ground: 'Nutrient cycling, moisture retention, and microhabitat for invertebrates. Indicators of overall ecosystem health.',
};

// Default heights per life form code when traits data is missing
const DEFAULT_HEIGHTS = {
  IT: 12, T: 5, MS: 1.5, SS: 0.6, PS: 0.15,
  LH: 0.7, MH: 0.3, SH: 0.05,
  LTG: 0.8, LNG: 0.5, MTG: 0.3, MNG: 0.15,
  GF: 0.2, SC: 0.02, BL: 0.02,
};

function codeToGroup(code) {
  for (const [key, g] of Object.entries(PROFILE_GROUPS)) {
    if (g.codes.has(code)) return key;
  }
  return 'ground';
}

// ── SVG silhouette shapes per growth form ──────────────────────────────────────

function CanopyTreeSVG({ w, h }) {
  const tw = w * 0.12;
  const th = h * 0.35;
  const cw = w * 0.9;
  const ch = h * 0.7;
  return (
    <g>
      <rect x={(w - tw) / 2} y={h - th} width={tw} height={th} fill="#5D4037" rx={1} />
      <ellipse cx={w / 2} cy={h - th - ch * 0.35} rx={cw / 2} ry={ch / 2} fill="#2E7D32" />
      <ellipse cx={w / 2 - cw * 0.15} cy={h - th - ch * 0.5} rx={cw * 0.3} ry={ch * 0.35} fill="#1B5E20" opacity={0.7} />
    </g>
  );
}

function SubcanopyTreeSVG({ w, h }) {
  const tw = w * 0.1;
  const th = h * 0.3;
  const cw = w * 0.75;
  const ch = h * 0.7;
  return (
    <g>
      <rect x={(w - tw) / 2} y={h - th} width={tw} height={th} fill="#6D4C41" rx={1} />
      <ellipse cx={w / 2} cy={h - th - ch * 0.35} rx={cw / 2} ry={ch / 2} fill="#388E3C" />
    </g>
  );
}

function ShrubSVG({ w, h }) {
  return (
    <g>
      <ellipse cx={w / 2} cy={h * 0.55} rx={w * 0.45} ry={h * 0.45} fill="#4CAF50" />
      <ellipse cx={w * 0.35} cy={h * 0.5} rx={w * 0.3} ry={h * 0.35} fill="#43A047" opacity={0.8} />
    </g>
  );
}

function TussockGrassSVG({ w, h }) {
  const cx = w / 2;
  const base = h;
  return (
    <g>
      {[-0.3, -0.15, 0, 0.15, 0.3].map((offset, i) => (
        <line
          key={i}
          x1={cx + offset * w}
          y1={base}
          x2={cx + offset * w * 1.8}
          y2={h * 0.1}
          stroke="#8BC34A"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}
      <ellipse cx={cx} cy={base - 2} rx={w * 0.2} ry={3} fill="#7CB342" />
    </g>
  );
}

function GrassSVG({ w, h }) {
  const cx = w / 2;
  const base = h;
  return (
    <g>
      {[-0.25, -0.1, 0.05, 0.2].map((offset, i) => (
        <line
          key={i}
          x1={cx + offset * w}
          y1={base}
          x2={cx + offset * w * 2}
          y2={h * 0.2}
          stroke="#9CCC65"
          strokeWidth={1}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function HerbSVG({ w, h }) {
  const cx = w / 2;
  return (
    <g>
      <line x1={cx} y1={h} x2={cx} y2={h * 0.3} stroke="#689F38" strokeWidth={1} />
      <ellipse cx={cx - w * 0.15} cy={h * 0.55} rx={w * 0.18} ry={h * 0.12} fill="#558B2F" opacity={0.8} />
      <ellipse cx={cx + w * 0.15} cy={h * 0.45} rx={w * 0.15} ry={h * 0.1} fill="#689F38" opacity={0.8} />
      <circle cx={cx} cy={h * 0.25} r={w * 0.12} fill="#7c5db2" opacity={0.6} />
    </g>
  );
}

function FernSVG({ w, h }) {
  const cx = w / 2;
  return (
    <g>
      {[-35, -15, 5, 25, 45].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const len = h * 0.7;
        return (
          <line
            key={i}
            x1={cx}
            y1={h * 0.9}
            x2={cx + Math.sin(rad) * len * 0.5}
            y2={h * 0.9 - Math.cos(rad) * len}
            stroke="#2E7D32"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function GroundCoverSVG({ w, h }) {
  return (
    <g>
      <ellipse cx={w / 2} cy={h * 0.7} rx={w * 0.4} ry={h * 0.25} fill="#388E3C" opacity={0.6} />
      <ellipse cx={w * 0.35} cy={h * 0.75} rx={w * 0.25} ry={h * 0.15} fill="#2E7D32" opacity={0.5} />
    </g>
  );
}

function SVGPlaceholder({ group, lifeFormCode, w, h }) {
  switch (group) {
    case 'canopy':    return <CanopyTreeSVG w={w} h={h} />;
    case 'subcanopy': return <SubcanopyTreeSVG w={w} h={h} />;
    case 'shrub':     return <ShrubSVG w={w} h={h} />;
    case 'graminoid':
      return (lifeFormCode === 'LTG' || lifeFormCode === 'MTG')
        ? <TussockGrassSVG w={w} h={h} />
        : <GrassSVG w={w} h={h} />;
    case 'herb':      return <HerbSVG w={w} h={h} />;
    case 'ground':
      return lifeFormCode === 'GF'
        ? <FernSVG w={w} h={h} />
        : <GroundCoverSVG w={w} h={h} />;
    default:          return <HerbSVG w={w} h={h} />;
  }
}

// ── PlantSilhouette — the swappable component ─────────────────────────────────

function PlantSilhouette({ species, width, height, group, lifeFormCode, highlighted, dimmed, onHover, onLeave }) {
  // FUTURE: when we have PNGs, this becomes:
  // if (species.thumbnailUrl) {
  //   return <image href={species.thumbnailUrl} width={width} height={height}
  //     opacity={dimmed ? 0.12 : 1} style={{ transition: 'opacity 0.2s' }} />
  // }

  return (
    <g
      opacity={dimmed ? 0.12 : highlighted ? 1 : 0.85}
      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <SVGPlaceholder group={group} lifeFormCode={lifeFormCode} w={width} h={height} />
    </g>
  );
}

// ── Scene layout constants ────────────────────────────────────────────────────

const SCENE_HEIGHT = 260;
const GROUND_HEIGHT = 38;
const TOP_PADDING = 12;
const SCALE_WIDTH = 28;
const SCENE_AREA_TOP = TOP_PADDING;
const SCENE_AREA_BOTTOM = SCENE_HEIGHT - GROUND_HEIGHT;

// ── Build plant instances from species data + benchmark ───────────────────────

function buildInstances(speciesData, benchmarkData) {
  const prominent = speciesData?.prominent || [];
  if (prominent.length === 0) return [];

  // Collect unique species with heights
  const seen = new Set();
  const instances = [];

  for (const sp of prominent) {
    if (seen.has(sp.species)) continue;
    seen.add(sp.species);

    const code = sp.life_form_code || 'MH';
    const group = codeToGroup(code);
    const heightM = sp.traits?.plant_height || DEFAULT_HEIGHTS[code] || 0.3;

    instances.push({
      species: sp.species,
      commonName: sp.commonName || sp.common_name || '',
      lifeFormCode: code,
      group,
      heightM,
      thumbnailUrl: sp.thumbnailUrl || null,
    });
  }

  // Sort: tallest first (rendered in back)
  instances.sort((a, b) => b.heightM - a.heightM);
  return instances;
}

// ── Height scale marks ────────────────────────────────────────────────────────

function getScaleMarks(maxHeight) {
  const candidates = [0.5, 1, 2, 5, 10, 15, 20, 25, 30];
  return candidates.filter(m => m <= maxHeight);
}

// ── Main VegetationProfile component ──────────────────────────────────────────

export default function VegetationProfile({ activeLayer, onLayerChange }) {
  const speciesData = useMapStore((state) => state.speciesData);
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const understorey = benchmarkData?.understorey;

  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const instances = useMemo(
    () => buildInstances(speciesData, benchmarkData),
    [speciesData, benchmarkData]
  );

  const maxHeight = useMemo(() => {
    if (instances.length === 0) return 10;
    const canopyH = benchmarkData?.canopy_height_m || 0;
    const tallest = Math.max(...instances.map(i => i.heightM), canopyH);
    return Math.max(tallest, 2);
  }, [instances, benchmarkData]);

  const scaleMarks = useMemo(() => getScaleMarks(maxHeight), [maxHeight]);

  // Map metres to Y pixel (bottom = ground, up = higher)
  const mToY = useCallback((metres) => {
    const plantAreaH = SCENE_AREA_BOTTOM - SCENE_AREA_TOP;
    const frac = metres / maxHeight;
    return SCENE_AREA_BOTTOM - frac * plantAreaH;
  }, [maxHeight]);

  // Build layer stats from understorey benchmark
  const layerStats = useMemo(() => {
    if (!understorey) return {};
    const stats = {};
    for (const row of understorey) {
      const g = codeToGroup(row.code);
      if (!stats[g]) stats[g] = { cover: 0, spp: 0 };
      stats[g].cover += row.cover_pct || 0;
      if (row.num_species != null) stats[g].spp += row.num_species;
    }
    return stats;
  }, [understorey]);

  const handlePlantHover = useCallback((inst, e) => {
    setHoveredPlant(inst);
    const svg = e.currentTarget.closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handlePlantLeave = useCallback(() => {
    setHoveredPlant(null);
  }, []);

  const toggleLayer = useCallback((groupKey) => {
    if (onLayerChange) {
      onLayerChange(activeLayer === groupKey ? null : groupKey);
    }
  }, [activeLayer, onLayerChange]);

  if (instances.length === 0) return null;

  // Distribute plants horizontally
  const plantAreaW = 100; // percentage-based for SVG viewBox
  const totalW = plantAreaW - (SCALE_WIDTH / 2.72); // approx scale area in viewBox units

  return (
    <div className="veg-profile">
      <span className="field-label">Vegetation Profile</span>

      <div className="veg-profile-scene">
        <svg
          viewBox={`0 0 272 ${SCENE_HEIGHT}`}
          width="100%"
          height={SCENE_HEIGHT}
          className="veg-profile-svg"
        >
          {/* Sky gradient */}
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8d8e4" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#e8e4d8" stopOpacity={0.15} />
            </linearGradient>
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B7355" />
              <stop offset="100%" stopColor="#6B5340" />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect x={SCALE_WIDTH} y={0} width={272 - SCALE_WIDTH} height={SCENE_AREA_BOTTOM} fill="url(#skyGrad)" />

          {/* Ground */}
          <rect x={SCALE_WIDTH} y={SCENE_AREA_BOTTOM} width={272 - SCALE_WIDTH} height={GROUND_HEIGHT} fill="url(#groundGrad)" rx={0} />

          {/* Height scale lines and labels */}
          {scaleMarks.map(m => {
            const y = mToY(m);
            return (
              <g key={m}>
                <line x1={SCALE_WIDTH} y1={y} x2={272} y2={y} stroke="var(--panel-border)" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />
                <text x={SCALE_WIDTH - 3} y={y + 3} textAnchor="end" fontSize={8} fill="var(--text-muted)" opacity={0.7}>
                  {m >= 1 ? `${m}m` : `${m * 100}cm`}
                </text>
              </g>
            );
          })}

          {/* Ground line */}
          <line x1={SCALE_WIDTH} y1={SCENE_AREA_BOTTOM} x2={272} y2={SCENE_AREA_BOTTOM} stroke="#6B5340" strokeWidth={1} />

          {/* Plant silhouettes — tallest first (background) */}
          {instances.map((inst, i) => {
            const group = inst.group;
            const isActive = activeLayer === group;
            const isDimmed = activeLayer != null && !isActive;

            // Plant dimensions in SVG units
            const heightPx = Math.max((inst.heightM / maxHeight) * (SCENE_AREA_BOTTOM - SCENE_AREA_TOP), 6);
            const widthPx = Math.min(Math.max(heightPx * 0.5, 10), 40);

            // Horizontal distribution: spread across available width
            const slotW = (272 - SCALE_WIDTH - 8) / instances.length;
            const x = SCALE_WIDTH + 4 + i * slotW + slotW * 0.5 - widthPx / 2;
            const y = SCENE_AREA_BOTTOM - heightPx;

            return (
              <g key={`${inst.species}-${i}`} transform={`translate(${x}, ${y})`}>
                <PlantSilhouette
                  species={inst}
                  width={widthPx}
                  height={heightPx}
                  group={group}
                  lifeFormCode={inst.lifeFormCode}
                  highlighted={isActive}
                  dimmed={isDimmed}
                  onHover={(e) => handlePlantHover(inst, e)}
                  onLeave={handlePlantLeave}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredPlant && (
          <div
            className="veg-profile-tooltip"
            style={{
              left: Math.min(tooltipPos.x, 200),
              top: Math.max(tooltipPos.y - 60, 0),
            }}
          >
            <div className="veg-profile-tooltip-common">
              {(hoveredPlant.commonName || '').split(',')[0].trim() || 'Unknown'}
            </div>
            <div className="veg-profile-tooltip-sci">{hoveredPlant.species}</div>
            <div className="veg-profile-tooltip-meta">
              {hoveredPlant.heightM.toFixed(1)}m · {hoveredPlant.lifeFormCode}
            </div>
          </div>
        )}
      </div>

      {/* Layer toggle buttons */}
      <div className="veg-profile-layers">
        {PROFILE_GROUP_ORDER.map(key => {
          const g = PROFILE_GROUPS[key];
          const hasInstances = instances.some(i => i.group === key);
          if (!hasInstances) return null;
          const isActive = activeLayer === key;
          return (
            <button
              key={key}
              className={`veg-profile-layer-btn ${isActive ? 'veg-profile-layer-btn--active' : ''}`}
              style={{
                borderColor: isActive ? g.color : undefined,
                color: isActive ? g.color : undefined,
              }}
              onClick={() => toggleLayer(key)}
            >
              <span className="veg-profile-layer-dot" style={{ backgroundColor: g.color }} />
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Layer detail card */}
      {activeLayer && PROFILE_GROUPS[activeLayer] && (
        <div className="veg-profile-detail" style={{ borderLeftColor: PROFILE_GROUPS[activeLayer].color }}>
          <div className="veg-profile-detail-header">
            <span className="veg-profile-detail-name">{PROFILE_GROUPS[activeLayer].label}</span>
            {layerStats[activeLayer] && (
              <span className="veg-profile-detail-stats">
                {layerStats[activeLayer].cover}% cover · {layerStats[activeLayer].spp} spp
              </span>
            )}
          </div>
          <div className="veg-profile-detail-desc">
            {LAYER_DESCRIPTIONS[activeLayer]}
          </div>
        </div>
      )}
    </div>
  );
}
