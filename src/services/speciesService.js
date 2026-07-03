/**
 * Species Service - Loads species data with traits from AusTraits
 */

// Cache for species data
let speciesData = null;
let speciesTraits = null;

/**
 * Load species by vegetation type data
 */
export async function loadSpeciesData() {
  if (speciesData) return speciesData;

  try {
    const response = await fetch('/data/species_by_vegetation_type.json');
    speciesData = await response.json();
    console.log('Species data loaded:', Object.keys(speciesData).length, 'vegetation types');
    return speciesData;
  } catch (error) {
    console.error('Error loading species data:', error);
    return null;
  }
}

/**
 * Load species traits data from AusTraits
 */
export async function loadSpeciesTraits() {
  if (speciesTraits) return speciesTraits;

  try {
    const response = await fetch('/data/species_traits.json');
    const traitsArray = await response.json();

    // Convert array to map keyed by species name for fast lookup
    speciesTraits = {};
    traitsArray.forEach(species => {
      speciesTraits[species.species] = species;
    });

    console.log('Species traits loaded:', traitsArray.length, 'species');
    return speciesTraits;
  } catch (error) {
    console.error('Error loading species traits:', error);
    return null;
  }
}

/**
 * Format height for display
 */
function formatHeight(height) {
  if (!height) return 'unknown';
  if (height < 1) return `${Math.round(height * 100)}cm`;
  return `${height.toFixed(1)}m`;
}

/**
 * Format leaf area for display
 */
function formatLeafArea(area) {
  if (!area) return 'unknown';
  if (area < 100) return `${area.toFixed(1)}mm²`;
  return `${(area / 100).toFixed(1)}cm²`;
}

/**
 * Log species for a vegetation type with traits
 */
export async function logSpeciesForVegetationType(vegetationTypeKey) {
  // Load both data sources
  const [vegData, traits] = await Promise.all([
    loadSpeciesData(),
    loadSpeciesTraits()
  ]);

  if (!vegData) {
    console.error('Species data not available');
    return null;
  }

  const vegType = vegData[vegetationTypeKey];
  if (!vegType) {
    console.error('Vegetation type not found:', vegetationTypeKey);
    console.log('Available types:', Object.keys(vegData));
    return null;
  }

  // Format header
  console.log('\n' + '='.repeat(70));
  console.log(`  ${vegType.name}`);
  console.log('='.repeat(70));

  // Helper to log species with traits
  const logSpeciesWithTraits = (speciesList, prominence) => {
    speciesList.forEach(s => {
      const traitData = traits?.[s.species];
      const commonName = s.common_name ? s.common_name.split(',')[0] : '';

      // Species name line
      console.log(`\n  ${s.species}${commonName ? ` (${commonName})` : ''}`);

      if (traitData) {
        const t = traitData.traits;
        const lfCode = traitData.life_form_code || 'MH';

        // Life form and growth form
        console.log(`    Life form: ${lfCode} | Growth form: ${t.plant_growth_form || 'unknown'}`);

        // Physical traits
        const height = formatHeight(t.plant_height);
        const leafLen = t.leaf_length ? `${t.leaf_length.toFixed(0)}mm` : 'unknown';
        console.log(`    Height: ${height} | Leaf length: ${leafLen}`);

        // Life history
        const traits_summary = [
          t.woodiness,
          t.life_history,
          t.resprouting_capacity
        ].filter(Boolean).join(', ');
        if (traits_summary) {
          console.log(`    Traits: ${traits_summary}`);
        }
      } else {
        console.log(`    (no trait data available)`);
      }
    });
  };

  // Log prominent species (3.2 code)
  console.log(`\n  PROMINENT SPECIES (${vegType.prominent_count}) - render densely`);
  console.log('  ' + '-'.repeat(66));
  logSpeciesWithTraits(vegType.prominent, 3.2);

  // Log present species (3.1 code)
  console.log(`\n  PRESENT SPECIES (${vegType.present_count}) - render sparsely`);
  console.log('  ' + '-'.repeat(66));
  logSpeciesWithTraits(vegType.present, 3.1);

  // Summary stats
  console.log('\n' + '='.repeat(70));

  // Count species with traits
  const allSpecies = [...vegType.prominent, ...vegType.present];
  const withTraits = allSpecies.filter(s => traits?.[s.species]).length;

  console.log(`  Total: ${vegType.total_count} species | ${withTraits} with trait data`);
  console.log(`  Prominent: ${vegType.prominent_count} | Present: ${vegType.present_count}`);
  console.log('='.repeat(70) + '\n');

  // Return enriched data for the vegetation profile / species list
  return {
    name: vegType.name,
    prominent: vegType.prominent.map(s => ({
      ...s,
      ...(traits?.[s.species] || {}),
    })),
    present: vegType.present.map(s => ({
      ...s,
      ...(traits?.[s.species] || {}),
    })),
  };
}
