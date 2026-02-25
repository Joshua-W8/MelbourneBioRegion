import useMapStore from '../../store/useMapStore';

const BCS_COLORS = {
  Endangered: '#ef4444',
  Vulnerable: '#f97316',
  Depleted: '#eab308',
  'Least Concern': '#22c55e',
  Rare: '#7b1fa2',
};

function EVCHeader({ children }) {
  const benchmarkData = useMapStore((state) => state.benchmarkData);
  const selectedEVC = useMapStore((state) => state.selectedEVC);

  const bcsColor = BCS_COLORS[selectedEVC?.bcsDesc] || '#666';

  return (
    <div className="evc-description-card">
      <div className="evc-description-heading">
        {benchmarkData?.evc_name || selectedEVC?.evcName}
      </div>
      <div className="evc-description-bioregion">
        {benchmarkData?.bioregion || selectedEVC?.bioregion} bioregion
        {selectedEVC?.bcsDesc && (
          <span
            className="conservation-badge"
            style={{
              backgroundColor: `${bcsColor}20`,
              color: bcsColor,
              borderColor: `${bcsColor}40`,
            }}
          >
            {selectedEVC.bcsDesc}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default EVCHeader;
