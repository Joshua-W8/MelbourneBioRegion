import { create } from 'zustand';
import { fetchPlantsForEVC } from '../services/plantService';

const useMapStore = create((set, get) => ({
  selectedEVC: null,
  plants: [],
  isLoadingPlants: false,
  viewMode: 'map', // 'map' | 'diorama'

  setSelectedEVC: (evc) => set({
    selectedEVC: evc,
    plants: [],  // Clear plants when EVC changes
  }),

  setViewMode: (mode) => set({ viewMode: mode }),

  fetchPlants: async () => {
    const { selectedEVC } = get();
    if (!selectedEVC) return;

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
