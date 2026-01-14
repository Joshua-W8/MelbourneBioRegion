// EVC code to vegetation type mapping
// Based on "Pre-colonial plant list for the City of Melbourne" report
export const evcToVegetationType = {
  // Grasslands and Woodlands on fertile plains
  '132': 'Grasslands and Woodlands on fertile plains',  // Plains Grassland
  '55': 'Grasslands and Woodlands on fertile plains',   // Plains Grassy Woodland
  '175': 'Grasslands and Woodlands on fertile plains',  // Grassy Woodland
  '649': 'Grasslands and Woodlands on fertile plains',  // Stony Knoll Shrubland

  // Freshwater wetland
  '125': 'Freshwater wetland',  // Plains Grassy Wetland
  '647': 'Freshwater wetland',  // Plains Sedgy Wetland
  '136': 'Freshwater wetland',  // Sedge Wetland
  '653': 'Freshwater wetland',  // Aquatic Herbland
  '821': 'Freshwater wetland',  // Tall Marsh
  '932': 'Freshwater wetland',  // Wet Verge Sedgeland

  // River banks and creeklines
  '68': 'River banks and creeklines',   // Creekline Grassy Woodland
  '83': 'River banks and creeklines',   // Swampy Riparian Woodland
  '164': 'River banks and creeklines',  // Creekline Herb-rich Woodland
  '641': 'River banks and creeklines',  // Riparian Woodland
  '654': 'River banks and creeklines',  // Creekline Tussock Grassland
  '707': 'River banks and creeklines',  // Sedgy Swamp Woodland
  '851': 'River banks and creeklines',  // Stream Bank Shrubland

  // Saltmarsh
  '9': 'Saltmarsh',  // Coastal Saltmarsh

  // Coastal marshlands and brackish flats
  '10': 'Coastal marshlands and brackish flats',   // Estuarine Wetland
  '13': 'Coastal marshlands and brackish flats',   // Brackish Sedgeland
  '537': 'Coastal marshlands and brackish flats',  // Brackish Aquatic Herbland
  '538': 'Coastal marshlands and brackish flats',  // Brackish Herbland
  '656': 'Coastal marshlands and brackish flats',  // Brackish Wetland
  '914': 'Coastal marshlands and brackish flats',  // Estuarine Flats Grassland
  '934': 'Coastal marshlands and brackish flats',  // Brackish Grassland
  '952': 'Coastal marshlands and brackish flats',  // Estuarine Reedbed

  // Swamp scrub
  '53': 'Swamp scrub',   // Swamp Scrub
  '953': 'Swamp scrub',  // Estuarine Scrub

  // Woodlands and heathlands on sand
  '3': 'Woodlands and heathlands on sand',    // Damp Sands Herb-rich Woodland
  '6': 'Woodlands and heathlands on sand',    // Sand Heathland
  '48': 'Woodlands and heathlands on sand',   // Heathy Woodland
  '710': 'Woodlands and heathlands on sand',  // Damp Heathland
  '793': 'Woodlands and heathlands on sand',  // Damp Heathy Woodland

  // Wet heathland
  '8': 'Wet heathland',    // Wet Heathland
  '191': 'Wet heathland',  // Riparian Scrub

  // Beach and Dunes
  '2': 'Beach and Dunes',    // Coast Banksia Woodland
  '160': 'Beach and Dunes',  // Coastal Dune Scrub
  '163': 'Beach and Dunes',  // Coastal Tussock Grassland
  '311': 'Beach and Dunes',  // Berm Grassy Shrubland
  '879': 'Beach and Dunes',  // Coastal Dune Grassland

  // Saltwater wetland
  '140': 'Saltwater wetland',  // Mangrove Shrubland
  '842': 'Saltwater wetland',  // Saline Aquatic Meadow

  // Cliffs and escarpments
  '895': 'Cliffs and escarpments',  // Escarpment Shrubland

  // Woodlands and forests on sedimentary hills
  '47': 'Woodlands and forests on sedimentary hills, valleys and ridges',  // Valley Grassy Forest
};

// Likelihood code descriptions
export const LIKELIHOOD_CODES = {
  '-': { label: 'Certain', color: '#2c5f2d' },
  '3.2': { label: 'Highly likely (prominent)', color: '#388e3c' },
  '3.1': { label: 'Highly likely', color: '#66bb6a' },
  '2.2': { label: 'Quite likely (prominent)', color: '#7cb342' },
  '2.1': { label: 'Quite likely', color: '#9ccc65' },
};
