import useMapStore from '../../store/useMapStore';

function UnderstoreyStructure() {
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const understorey = benchmarkData?.understorey;

  if (!understorey || understorey.length === 0) return null;

  const maxCover = Math.max(...understorey.map(u => u.cover_pct || 0));

  return (
    <div className="understorey-structure">
      <span className="field-label">Understorey Structure</span>
      <div className="understorey-rows">
        {understorey.map(row => (
          <div key={row.life_form_code} className="understorey-row">
            <div className="understorey-name">
              <span className="understorey-lf-name">{row.life_form_name}</span>
              <span className="understorey-lf-code">{row.life_form_code}</span>
            </div>
            <div className="understorey-bar-track">
              <div
                className="understorey-bar"
                style={{ width: `${maxCover > 0 ? (row.cover_pct / maxCover) * 100 : 0}%` }}
              />
            </div>
            <div className="understorey-stats">
              <span className="understorey-cover">{row.cover_pct}%</span>
              {row.num_species != null && (
                <span className="understorey-spp">{row.num_species} spp</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UnderstoreyStructure;
