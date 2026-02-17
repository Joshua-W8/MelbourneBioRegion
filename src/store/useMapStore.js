import { create } from 'zustand';
import { fetchPlantsForEVC } from '../services/plantService';
import { logSpeciesForVegetationType } from '../services/speciesService';
import { getBenchmark } from '../services/benchmarkService';
import { matchSpeciesToBenchmark } from '../services/lifeFormMapping';
import { initModelResolver } from '../services/modelResolver';

/**
 * Convert vegetation type display name to snake_case key
 * e.g., "Grasslands and Woodlands on fertile plains" -> "grasslands_and_woodlands_on_fertile_plains"
 */
function vegetationTypeToKey(vegetationType) {
  if (!vegetationType) return null;
  return vegetationType
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '_');         // Replace spaces with underscores
}

const useMapStore = create((set, get) => ({
  selectedEVC: null,
  plants: [],
  isLoadingPlants: false,
  viewMode: 'map', // 'map' | 'diorama'
  speciesData: null, // Species with traits for selected vegetation type
  benchmarkData: null, // EVC benchmark for selected polygon
  theme: 'light', // 'dark' | 'light'
  showNeighbourhoods: false,
  showUrbanContext: false,

  toggleTheme: () => set((state) => ({
    theme: state.theme === 'dark' ? 'light' : 'dark'
  })),

  setTheme: (theme) => set({ theme }),

  toggleNeighbourhoods: () => set((state) => ({
    showNeighbourhoods: !state.showNeighbourhoods,
  })),

  toggleUrbanContext: () => set((state) => ({
    showUrbanContext: !state.showUrbanContext,
  })),

  setSelectedEVC: async (evc) => {
    set({
      selectedEVC: evc,
      plants: [],  // Clear plants when selection changes
      speciesData: null,
      benchmarkData: null,
    });

    if (evc) {
      // Auto-fetch plants when an EVC is selected
      get().fetchPlants();

      // Ensure model registry is loaded before logging species
      await initModelResolver();

      // Fetch benchmark and species data concurrently
      const benchmarkPromise = (evc.evc && evc.bioregion)
        ? getBenchmark(evc.evc, evc.bioregion)
        : Promise.resolve(null);

      const vegType = evc.vegetationType || evc.groupName;
      const vegKey = vegType ? vegetationTypeToKey(vegType) : null;
      const speciesPromise = vegKey
        ? logSpeciesForVegetationType(vegKey)
        : Promise.resolve(null);

      const [benchmark, speciesResult] = await Promise.all([benchmarkPromise, speciesPromise]);

      if (benchmark) {
        set({ benchmarkData: benchmark });
      }
      if (speciesResult) {
        set({ speciesData: speciesResult });
      }

      // Run comparison once both are available
      if (benchmark && speciesResult) {
        const allSpecies = [...speciesResult.prominent, ...speciesResult.present];
        matchSpeciesToBenchmark(allSpecies, benchmark);
      }
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  fetchPlants: async () => {
    const { selectedEVC } = get();
    if (!selectedEVC?.evc) return;

    set({ isLoadingPlants: true });

    try {
      const plants = await fetchPlantsForEVC(selectedEVC.evc);
      set({ plants, isLoadingPlants: false });
    } catch (error) {
      console.error('Error fetching plants:', error);
      set({ plants: [], isLoadingPlants: false });
    }
  },
}));

export default useMapStore;
