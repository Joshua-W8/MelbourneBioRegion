# Pre-colonial Melbourne Vegetation: Trait Pipeline

## Overview

This pipeline extracts species from the ARI pre-colonial plant database and prepares them for integration with AusTraits to enable 3D diorama visualization.

## Key Statistics

| Metric | Count |
|--------|-------|
| Total species in database | 1,067 |
| **Diorama species (3.1+)** | **437** |
| Prominent species (3.2) - visual anchors | 65 |
| Plant list species (2.1+) | 706 |
| Certain historical records | 175 |

### Species by Vegetation Type (3.1+ threshold)

| Vegetation Type | Species Count | Prominent (3.2) |
|----------------|---------------|-----------------|
| Woodlands & Forests on Sedimentary Hills | 159 | 20 |
| Grasslands & Woodlands on Fertile Plains | 145 | 16 |
| Woodlands & Heathlands on Sand | 97 | 9 |
| River Banks & Creeklines | 75 | 14 |
| Coastal Marshlands & Brackish Flats | 61 | 6 |
| Cliffs & Escarpments | 60 | 5 |
| Freshwater Wetland | 54 | 2 |
| Swamp Scrub | 40 | 2 |
| Beach & Dunes | 37 | 5 |
| Saltmarsh | 32 | 11 |
| Wet Heathland | 13 | 2 |

*Note: Saltwater Wetland has 0 species at 3.1+ threshold (all species below certainty threshold)*

---

## File Structure

```
trait_pipeline/
├── extract_species.py      # Species extraction script
├── trait_matcher.py        # AusTraits integration script
├── model_taxonomy.json     # 3D model category definitions
└── output/
    ├── species_diorama.json           # 437 species for 3D visualization
    ├── species_prominent.json         # 65 visual anchor species
    ├── species_plantlist.json         # 706 species for info panels
    ├── species_by_vegetation_type.json # Grouped by vegetation type
    ├── austraits_query_list.json      # Species names for AusTraits matching
    └── statistics.json                # Summary statistics
```

---

## 3D Model Taxonomy

The `model_taxonomy.json` defines 14 model categories for Three.js rendering:

| Category | Description | Height Range | Examples |
|----------|-------------|--------------|----------|
| `canopy_tree` | Tall trees (>10m) | 10-40m | River Red Gum |
| `subcanopy_tree` | Medium trees | 5-10m | Drooping She-oak |
| `tall_shrub` | Large shrubs | 2-5m | Sweet Bursaria |
| `medium_shrub` | Medium shrubs | 0.5-2m | Correa, Cassinia |
| `low_shrub` | Ground-hugging woody | <0.5m | Cranberry Heath |
| `tussock_grass` | Tussock-forming grasses | 0.3-1.5m | Kangaroo Grass |
| `sedge_rush` | Wetland graminoids | 0.2-2m | Sea Rush |
| `forb_upright` | Upright herbs | 0.1-1m | Chocolate Lily |
| `forb_rosette` | Ground covers | 0.05-0.3m | Kidney-weed |
| `fern` | Ferns | 0.1-2m | Bracken |
| `climber_scrambler` | Vines | Variable | Clematis |
| `aquatic` | Water plants | Variable | Common Reed |
| `succulent_saltmarsh` | Coastal succulents | 0.1-1m | Glasswort |
| `parasitic_epiphyte` | Mistletoes | 0.5-2m | Box Mistletoe |

---

## Next Steps

### 1. Download AusTraits (Required)

```bash
# Download from Zenodo (latest version 5.0)
# URL: https://zenodo.org/record/10075543
# Download the CSV version (~200MB)

# Extract to:
mkdir -p trait_pipeline/austraits_data
# Place traits.csv in austraits_data/
```

### 2. Run Trait Matching

```bash
cd trait_pipeline
python3 trait_matcher.py
```

This will generate:
- `species_traits.json` - All species with matched traits
- `gap_report.json` - Species needing manual assignment
- `model_assignments.json` - Final 3D category assignments

### 3. Manual Trait Assignment

Review `gap_report.json` for species without AusTraits data. Priority:
1. **65 prominent species (3.2)** - These are visual anchors and must be correct
2. Genus-level fallbacks - Verify accuracy
3. Complete gaps - Research or assign default categories

### 4. Generate React Three Fiber Data

After trait matching, run:
```bash
python3 generate_r3f_data.py  # (To be created)
```

Output: JSON files ready for import into your React Three Fiber diorama components.

---

## Integration with Existing Pipeline

This trait pipeline connects to your existing data architecture:

```
[EVC 1750] → vegetation_polygons.geojson → Map View
    ↓
[ARI Plant List] → This Pipeline → species_by_vegetation.json
    ↓                    ↓
[AusTraits]     →   model_assignments.json → 3D Diorama
```

When a user clicks a map polygon:
1. Get `vegetation_type` from polygon
2. Look up species in `species_by_vegetation_type.json`
3. For each species, get model from `model_assignments.json`
4. Render 3D scene with appropriate density (3.2 = dense, 3.1 = sparse)

---

## Code Example: Loading Species for a Vegetation Type

```javascript
// React component example
import speciesByType from './data/species_by_vegetation_type.json';
import modelAssignments from './data/model_assignments.json';

function getDioramaSpecies(vegetationType) {
  const vegData = speciesByType[vegetationType];
  if (!vegData) return [];
  
  const species = [
    ...vegData.prominent.map(sp => ({ ...sp, density: 'high' })),
    ...vegData.present.map(sp => ({ ...sp, density: 'low' }))
  ];
  
  return species.map(sp => ({
    ...sp,
    model: modelAssignments[sp.species]?.model_category || 'forb_upright',
    height: modelAssignments[sp.species]?.height
  }));
}
```

---

## License & Attribution

- **ARI Plant List**: CC-BY 4.0 - Sinclair, Sutter & Duncan (2021)
- **AusTraits**: CC-BY 4.0 - Zenodo DOI: 10.5281/zenodo.3568417
- **EVC Data**: Victorian Government Open Data

---

*Pipeline created January 2026 for MDIT Thesis Project*
