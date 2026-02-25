import useMapStore from '../../store/useMapStore';

function VegetationTypeLabel() {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  const vegetationType = selectedEVC?.vegetationType;

  if (!vegetationType) return null;

  return (
    <div className="evc-list-container">
      <span className="field-label">Vegetation Type</span>
      <div className="evc-list">
        <div className="evc-item">
          <span className="evc-item-name">{vegetationType}</span>
        </div>
      </div>
    </div>
  );
}

export default VegetationTypeLabel;
