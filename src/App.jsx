import { useEffect } from 'react';
import MapView from './components/MapView';
import InfoPanel from './components/InfoPanel';
import AddressSearch from './components/AddressSearch';
import DioramaView from './components/DioramaView';
import ThemeToggle from './components/ThemeToggle';
import useMapStore from './store/useMapStore';
import './App.css';

function App() {
  const viewMode = useMapStore((state) => state.viewMode);
  const theme = useMapStore((state) => state.theme);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (viewMode === 'diorama') {
    return (
      <>
        <DioramaView />
        <ThemeToggle />
      </>
    );
  }

  return (
    <>
      <MapView />
      <AddressSearch />
      <InfoPanel />
      <ThemeToggle />
    </>
  );
}

export default App;
