import MapView from './components/MapView';
import InfoPanel from './components/InfoPanel';
import AddressSearch from './components/AddressSearch';
import DioramaView from './components/DioramaView';
import useMapStore from './store/useMapStore';
import './App.css';

function App() {
  const viewMode = useMapStore((state) => state.viewMode);

  if (viewMode === 'diorama') {
    return <DioramaView />;
  }

  return (
    <>
      <MapView />
      <AddressSearch />
      <InfoPanel />
    </>
  );
}

export default App;
