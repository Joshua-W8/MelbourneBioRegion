import { create } from 'zustand';
import { fetchPlantsForEVC } from '../services/plantService';
import { logSpeciesForVegetationType } from '../services/speciesService';

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

  setSelectedEVC: async (evc) => {
    set({
      selectedEVC: evc,
      plants: [],  // Clear plants when selection changes
      speciesData: null,
    });

    // Log species data with traits for the vegetation type
    if (evc?.vegetationType) {
      const vegKey = vegetationTypeToKey(evc.vegetationType);
      if (vegKey) {
        const speciesResult = await logSpeciesForVegetationType(vegKey);
        if (speciesResult) {
          set({ speciesData: speciesResult });
        }
      }
    }
  },

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
