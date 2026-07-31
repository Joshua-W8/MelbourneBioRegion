import { useEffect } from 'react';
import MapView from './components/MapView';
import InfoPanel from './components/InfoPanel';
import AddressSearch from './components/AddressSearch';
import ContextFilters from './components/ContextFilters';
import ThemeToggle from './components/ThemeToggle';
import PrintableReport from './components/PrintableReport';
import useMapStore from './store/useMapStore';
import './App.css';

function App() {
  const theme = useMapStore((state) => state.theme);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <div className="screen-only">
        <MapView />
        <AddressSearch />
        <ContextFilters />
        <InfoPanel />
        <ThemeToggle />
      </div>
      <PrintableReport />
    </>
  );
}

export default App;
