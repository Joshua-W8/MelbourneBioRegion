import useMapStore from '../store/useMapStore';
import './ContextFilters.css';

function ContextFilters() {
  const showNeighbourhoods = useMapStore((state) => state.showNeighbourhoods);
  const showUrbanContext = useMapStore((state) => state.showUrbanContext);
  const toggleNeighbourhoods = useMapStore((state) => state.toggleNeighbourhoods);
  const toggleUrbanContext = useMapStore((state) => state.toggleUrbanContext);

  return (
    <div className="context-filters">
      <button
        className={`context-filter-btn ${showNeighbourhoods ? 'active' : ''}`}
        onClick={toggleNeighbourhoods}
        title="Toggle neighbourhood labels"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Neighbourhoods</span>
      </button>
      <button
        className={`context-filter-btn ${showUrbanContext ? 'active' : ''}`}
        onClick={toggleUrbanContext}
        title="Toggle urban context"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="6" width="6" height="16" />
          <rect x="9" y="2" width="6" height="20" />
          <rect x="17" y="8" width="6" height="14" />
        </svg>
        <span>Urban context</span>
      </button>
    </div>
  );
}

export default ContextFilters;
