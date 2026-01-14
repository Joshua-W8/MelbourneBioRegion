import { evcToVegetationType } from '../data/evcMappings';

const PLANT_API_URL = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pre-colonial-plant-list/records';

// Valid likelihood codes that indicate plant presence
const VALID_LIKELIHOOD_CODES = ['-', '2.1', '2.2', '3.1', '3.2'];

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

  try {
    // First, fetch a sample record to discover field names
    const sampleResponse = await fetch(`${PLANT_API_URL}?limit=1`);
    if (!sampleResponse.ok) {
      throw new Error('Failed to fetch sample record');
    }

    const sampleData = await sampleResponse.json();
    if (!sampleData.results || sampleData.results.length === 0) {
      throw new Error('No sample data returned');
    }

    // Find the field name for this vegetation type
    const sampleRecord = sampleData.results[0];
    const fieldNames = Object.keys(sampleRecord);

    // Try to match the vegetation type to a field name
    const vegetationFieldName = findVegetationField(fieldNames, vegetationType);

    if (!vegetationFieldName) {
      console.log('Could not find field for:', vegetationType);
      console.log('Available fields:', fieldNames);
      return [];
    }

    console.log('Using field:', vegetationFieldName);

    // Fetch records (paginated)
    let allPlants = [];
    let offset = 0;
    const limit = 100;

    while (allPlants.length < 50) {
      const response = await fetch(`${PLANT_API_URL}?limit=${limit}&offset=${offset}`);
      if (!response.ok) break;

      const data = await response.json();
      if (!data.results || data.results.length === 0) break;

      // Filter for plants with valid likelihood codes
      const filtered = data.results.filter(record => {
        const code = String(record[vegetationFieldName] || '');
        return VALID_LIKELIHOOD_CODES.includes(code);
      });

      // Add field name and likelihood to each plant
      const plantsWithMeta = filtered.map(plant => ({
        ...plant,
        _likelihoodCode: String(plant[vegetationFieldName]),
        _vegetationType: vegetationType,
      }));

      allPlants = allPlants.concat(plantsWithMeta);

      if (data.results.length < limit) break;
      offset += limit;
    }

    // Sort by likelihood (most certain first)
    allPlants.sort((a, b) => {
      const order = { '-': 0, '3.2': 1, '3.1': 2, '2.2': 3, '2.1': 4 };
      return (order[a._likelihoodCode] ?? 5) - (order[b._likelihoodCode] ?? 5);
    });

    // Limit to 50 plants
    return allPlants.slice(0, 50);

  } catch (error) {
    console.error('Error fetching plant data:', error);
    return [];
  }
}

/**
 * Find the vegetation field name in the API response
 */
function findVegetationField(fieldNames, vegetationType) {
  // Create possible field name variations
  const normalized = vegetationType
    .toLowerCase()
    .replace(/ and /g, '_and_')
    .replace(/, /g, '_')
    .replace(/ /g, '_');

  // Try exact match first
  for (const field of fieldNames) {
    const lowerField = field.toLowerCase();
    if (lowerField === normalized) {
      return field;
    }
  }

  // Try partial match (first 15 chars)
  const prefix = normalized.substring(0, 15);
  for (const field of fieldNames) {
    if (field.toLowerCase().includes(prefix)) {
      return field;
    }
  }

  return null;
}
