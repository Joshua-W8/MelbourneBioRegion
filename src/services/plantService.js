import { evcToVegetationType } from '../data/evcMappings';

// Cache for local plant data
let plantData = null;

// Valid likelihood codes that indicate plant presence (as numbers from the JSON)
const VALID_LIKELIHOOD_VALUES = [1.0, 2.1, 2.2, 3.1, 3.2];

// Map likelihood numbers to display codes
const LIKELIHOOD_MAP = {
  '1': '-',      // Certain
  '2.1': '2.1',  // Quite likely
  '2.2': '2.2',  // Quite likely (prominent)
  '3.1': '3.1',  // Highly likely
  '3.2': '3.2',  // Highly likely (prominent)
};

/**
 * Convert vegetation type display name to JSON field name
 * e.g., "Grasslands and Woodlands on fertile plains" -> "grasslands_and_woodlands_on_fertile_plains"
 */
function vegetationTypeToFieldName(vegetationType) {
  return vegetationType
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/ /g, '_');
}

/**
 * Load local plant data
 */
async function loadPlantData() {
  if (plantData) return plantData;

  try {
    const response = await fetch('/data/pre-colonial-plants.json');
    plantData = await response.json();
    console.log('Local plant data loaded:', plantData.length, 'species');
    return plantData;
  } catch (error) {
    console.error('Error loading local plant data:', error);
    return null;
  }
}

/**
 * Fetch plants for a given EVC code
 * @param {string|number} evcCode - The EVC code
 * @returns {Promise<Array>} Array of plant records
 */
export async function fetchPlantsForEVC(evcCode) {
  const vegetationType = evcToVegetationType[String(evcCode)];

  if (!vegetationType) {
    console.log('No vegetation type mapping for EVC:', evcCode);
    return [];
  }

  console.log('EVC', evcCode, 'maps to:', vegetationType);

  // Load local data
  const plants = await loadPlantData();
  if (!plants) {
    console.error('Failed to load plant data');
    return [];
  }

  // Convert vegetation type to field name
  const fieldName = vegetationTypeToFieldName(vegetationType);
  console.log('Using field:', fieldName);

  // Filter plants that have a valid likelihood for this vegetation type
  const filteredPlants = plants
    .filter(plant => {
      const likelihood = plant[fieldName];
      return likelihood !== null &&
             likelihood !== undefined &&
             likelihood !== 0 &&
             likelihood !== 0.0;
    })
    .map(plant => {
      const likelihood = plant[fieldName];
      // Convert numeric likelihood to string code
      const likelihoodCode = likelihood === 1 || likelihood === 1.0
        ? '-'
        : String(likelihood);

      return {
        ...plant,
        _likelihoodCode: likelihoodCode,
        _vegetationType: vegetationType,
      };
    });

  // Sort by likelihood (most certain first)
  filteredPlants.sort((a, b) => {
    const order = { '-': 0, '3.2': 1, '3.1': 2, '2.2': 3, '2.1': 4 };
    return (order[a._likelihoodCode] ?? 5) - (order[b._likelihoodCode] ?? 5);
  });

  console.log('Found', filteredPlants.length, 'plants for', vegetationType);
  return filteredPlants;
}
