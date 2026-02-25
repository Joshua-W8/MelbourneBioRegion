const SCENE_SIZE = 10;

const LF_COLORS = {
  IT:  '#1B5E20',
  T:   '#2E7D32',
  MS:  '#43A047',
  SS:  '#66BB6A',
  PS:  '#81C784',
  LH:  '#558B2F',
  MH:  '#689F38',
  SH:  '#7CB342',
  LTG: '#8BC34A',
  LNG: '#9CCC65',
  MTG: '#AED581',
  MNG: '#C5E1A5',
  GF:  '#388E3C',
  SC:  '#795548',
};

function SceneLegend({ stats }) {
  if (!stats) return null;

  return (
    <div className="diorama-legend diorama-legend--inline">
      <div className="legend-lf-list">
        {Object.entries(stats)
          .sort((a, b) => (b[1].cover_pct || 0) - (a[1].cover_pct || 0))
          .map(([code, s]) => (
            <div key={code} className="legend-lf-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: LF_COLORS[code] || '#666' }}
              />
              <span className="legend-lf-code">{code}</span>
              <span className="legend-lf-name">{s.name}</span>
              <span className="legend-lf-count">{s.count}</span>
            </div>
          ))}
      </div>
      <div className="legend-scene">{SCENE_SIZE}m × {SCENE_SIZE}m scene</div>
    </div>
  );
}

export default SceneLegend;
