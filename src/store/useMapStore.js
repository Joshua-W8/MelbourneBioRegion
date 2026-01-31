import { create } from 'zustand';
import { fetchPlantsForEVC } from '../services/plantService';

const useMapStore = create((set, get) => ({
  selectedEVC: null,
  plants: [],
  isLoadingPlants: false,
  viewMode: 'map', // 'map' | 'diorama'

  setSelectedEVC: (evc) => set({
    selectedEVC: evc,
    plants: [],  // Clear plants when selection changes
  }),

  setViewMode: (mode) => set({ viewMode: mode }),

  fetchPlants: async () => {
    const { selectedEVC } = get();
    if (!selectedEVC) return;

    set({ isLoadingPlants: true });

    try {
      // Fetch plants for all EVCs in the vegetation type
      const evcs = selectedEVC.evcs || [];
      if (evcs.length === 0) {
        set({ plants: [], isLoadingPlants: false });
        return;
      }

      // Fetch plants for each EVC and combine results
      const allPlants = [];
      const seenSpecies = new Set();

      for (const evc of evcs) {
        try {
          const plants = await fetchPlantsForEVC(evc.evc);
          plants.forEach(plant => {
            // Deduplicate by species name
            if (!seenSpecies.has(plant.species)) {
              seenSpecies.add(plant.species);
              allPlants.push(plant);
            }
          });
        } catch (err) {
          console.warn(`Failed to fetch plants for EVC ${evc.evc}`);
        }
      }

      set({ plants: allPlants, isLoadingPlants: false });
    } catch (error) {
      console.error('Error fetching plants:', error);
      set({ plants: [], isLoadingPlants: false });
    }
  },
}));

export default useMapStore;
