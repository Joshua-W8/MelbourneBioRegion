#!/usr/bin/env python3
"""
AusTraits Trait Matcher for Pre-colonial Melbourne Vegetation Project
======================================================================

This script matches species from the pre-colonial plant list against
AusTraits data to extract traits needed for 3D model assignment.

SETUP INSTRUCTIONS:
1. Download AusTraits 5.0 from Zenodo: https://zenodo.org/record/10075543
2. Extract the CSV files to: /home/claude/trait_pipeline/austraits_data/
3. Required files: traits.csv, taxa.csv (from the Parquet or CSV release)

Key traits for 3D visualization:
- plant_growth_form: tree, shrub, herb, graminoid, etc.
- plant_height: maximum height in meters
- woodiness: woody, herbaceous, variable
- life_history: annual, perennial, biennial
"""

import json
import csv
from pathlib import Path
from collections import defaultdict
import re

# Configuration
AUSTRAITS_DIR = Path('/Users/joshuawait/Documents/melbourne_bioregion/MelbourneBioRegion/trait_pipeline/austraits_data')
OUTPUT_DIR = Path('/Users/joshuawait/Documents/melbourne_bioregion/MelbourneBioRegion/trait_pipeline/austraits_data')
SPECIES_FILE = OUTPUT_DIR / 'species_diorama.json'
MODEL_TAXONOMY_FILE = Path('/home/claude/trait_pipeline/model_taxonomy.json')

# Traits to extract (AusTraits trait names)
TARGET_TRAITS = [
    'plant_growth_form',
    'plant_height',
    'woodiness', 
    'life_history',
    'leaf_area',
    'leaf_length',
    'fire_response',
    'resprouting_capacity'
]

# Hardcoded species overrides — these override all rule-based assignment
SPECIES_OVERRIDES = {
    'Microlaena stipoides': 'MNG',      # non-tufted spreading grass
    'Gahnia radula': 'LNG',             # large saw-sedge
    'Gahnia sieberiana': 'LNG',         # large saw-sedge
    'Gahnia filum': 'LNG',             # chaffy saw-sedge, large non-tufted
    'Gahnia clarkei': 'LNG',           # tall saw-sedge
    'Gahnia trifida': 'LNG',           # coast saw-sedge
    'Phragmites australis': 'LNG',     # common reed, rhizomatous spreading
    'Tetrarrhena juncea': 'LNG',       # forest wire-grass, non-tufted
    'Bossiaea prostrata': 'PS',         # prostrate shrub
    'Dichondra repens': 'SH',           # prostrate herb/groundcover
}


def normalize_species_name(name):
    """Normalize species name for matching."""
    # Lowercase and strip
    normalized = name.lower().strip()
    
    # Standardize subspecies/variety notation
    normalized = re.sub(r'\s+subsp\.\s+', ' subsp. ', normalized)
    normalized = re.sub(r'\s+ssp\.\s+', ' subsp. ', normalized)
    normalized = re.sub(r'\s+ssp\s+', ' subsp. ', normalized)
    normalized = re.sub(r'\s+var\.\s+', ' var. ', normalized)
    normalized = re.sub(r'\s+var\s+', ' var. ', normalized)
    normalized = re.sub(r'\s+f\.\s+', ' f. ', normalized)
    normalized = re.sub(r'\s+forma\s+', ' f. ', normalized)
    
    return normalized


def get_base_species_name(name):
    """Extract base species name (genus + species) without infraspecific ranks."""
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[1]}"
    return name


def get_genus(name):
    """Extract genus from species name."""
    parts = name.split()
    return parts[0] if parts else name


def load_austraits_traits(traits_file):
    """
    Load AusTraits traits.csv and index by taxon name.
    Returns dict: {taxon_name: {trait_name: [values]}}
    """
    print(f"Loading AusTraits from {traits_file}...")
    traits_by_taxon = defaultdict(lambda: defaultdict(list))
    
    with open(traits_file, 'r', encoding='latin-1') as f:
        reader = csv.DictReader(f)
        for row in reader:
            taxon = row.get('taxon_name', '').strip()
            trait = row.get('trait_name', '').strip()
            value = row.get('value', '').strip()
            
            if taxon and trait and value:
                normalized_taxon = normalize_species_name(taxon)
                traits_by_taxon[normalized_taxon][trait].append(value)
    
    print(f"  Loaded traits for {len(traits_by_taxon)} taxa")
    return traits_by_taxon


def get_consensus_value(values):
    """Get most common value from a list (simple consensus)."""
    if not values:
        return None
    
    # For numeric values, return mean
    try:
        numeric = [float(v) for v in values if v]
        if numeric:
            return sum(numeric) / len(numeric)
    except (ValueError, TypeError):
        pass
    
    # For categorical, return most common
    from collections import Counter
    counts = Counter(values)
    return counts.most_common(1)[0][0] if counts else None


def determine_life_form_code(species_name, traits, height=None):
    """
    Assign a DSE benchmark life form code directly from traits.

    Returns one of: IT, T, MS, SS, PS, LH, MH, SH, LTG, MTG, LNG, MNG, GF, SC, BL

    Priority order:
      1. Hardcoded species overrides
      2. Growth-form + height rules (21 rules)
      3. Woodiness fallback
      4. Default: MH
    """
    # 1. Check hardcoded species overrides (match base name without var./subsp.)
    base = get_base_species_name(species_name)
    if base in SPECIES_OVERRIDES:
        return SPECIES_OVERRIDES[base]
    # Also check full name
    if species_name in SPECIES_OVERRIDES:
        return SPECIES_OVERRIDES[species_name]

    growth_form = traits.get('plant_growth_form')
    woodiness = traits.get('woodiness')
    h = height or 0

    if growth_form:
        gf = growth_form.lower().strip()

        # Rule 1-3: Trees
        if 'tree' in gf:
            if h >= 10:
                return 'IT'   # Immature Canopy Tree / canopy tier
            return 'T'        # Understorey Tree or Large Shrub

        # Rule 4-7: Shrubs (check before graminoid — "subshrub" contains "shrub")
        if 'shrub' in gf:
            if h >= 2:
                return 'T'    # Large shrub = understorey tree tier
            if h >= 0.5:
                return 'MS'   # Medium Shrub
            if h >= 0.1:
                return 'SS'   # Small Shrub
            return 'PS'       # Prostrate Shrub

        # Rule 8-9: Tussock grasses
        if 'tussock' in gf:
            return 'LTG' if h >= 1.0 else 'MTG'

        # Rule 10-11: Other graminoids
        if 'graminoid' in gf:
            # "graminoid_not_tussock" or forms with "non-tufted" / "spreading" → non-tufted
            if 'not_tussock' in gf or 'non' in gf or 'spreading' in gf or 'rhizom' in gf:
                return 'LNG' if h >= 0.5 else 'MNG'
            # Default graminoid → tufted
            return 'LTG' if h >= 1.0 else 'MTG'

        # Rule 12: Ferns
        if 'fern' in gf:
            return 'GF'

        # Rule 13: Climbers / scramblers
        if 'climber' in gf or 'scrambler' in gf or 'vine' in gf:
            return 'SC'

        # Rule 14: Aquatic
        if 'aquatic' in gf or 'emergent' in gf or 'floating' in gf:
            return 'MNG'

        # Rule 15: Rosette herbs
        if 'rosette' in gf:
            return 'SH'

        # Rule 16-18: Herbs (including "herb", "forb", "geophyte", "annual")
        if 'herb' in gf or 'forb' in gf or 'geophyte' in gf or 'annual' in gf:
            if h >= 0.5:
                return 'LH'
            if h >= 0.15:
                return 'MH'
            return 'SH'

        # Rule 19: Succulent / saltmarsh
        if 'succulent' in gf or 'saltmarsh' in gf:
            return 'SH'

        # Rule 20: Parasitic / epiphytic
        if 'parasite' in gf or 'hemiparasite' in gf or 'epiphyte' in gf:
            return 'MS'

    # Fallback to woodiness
    if woodiness:
        if 'woody' in woodiness.lower():
            return 'MS'
        return 'MH'

    # Rule 21: Default fallback
    return 'MH'


def match_species(species_list, austraits_data):
    """
    Match species to AusTraits and extract relevant traits.
    Uses fallback hierarchy: exact name > base species > genus average
    """
    results = []
    matched = 0
    genus_fallback = 0
    no_match = 0
    
    for sp in species_list:
        name = sp['species']
        normalized = normalize_species_name(name)
        base_name = normalize_species_name(get_base_species_name(name))
        genus = get_genus(name).lower()
        
        traits = {}
        match_type = 'none'
        
        # Try exact match
        if normalized in austraits_data:
            raw_traits = austraits_data[normalized]
            match_type = 'exact'
        # Try base species name
        elif base_name in austraits_data:
            raw_traits = austraits_data[base_name]
            match_type = 'base_species'
        else:
            # Genus-level fallback
            genus_traits = defaultdict(list)
            for taxon, taxon_traits in austraits_data.items():
                if taxon.startswith(genus + ' '):
                    for trait, values in taxon_traits.items():
                        genus_traits[trait].extend(values)
            
            if genus_traits:
                raw_traits = genus_traits
                match_type = 'genus'
            else:
                raw_traits = {}
                match_type = 'none'
        
        # Extract target traits
        for trait in TARGET_TRAITS:
            if trait in raw_traits:
                traits[trait] = get_consensus_value(raw_traits[trait])
        
        # Determine life form code
        height = traits.get('plant_height')
        life_form_code = determine_life_form_code(name, traits, height)

        # Update counters
        if match_type in ['exact', 'base_species']:
            matched += 1
        elif match_type == 'genus':
            genus_fallback += 1
        else:
            no_match += 1

        results.append({
            'species': name,
            'common_name': sp.get('common_name', ''),
            'max_prominence': sp.get('max_prominence'),
            'vegetation_types': sp.get('vegetation_types', []),
            'match_type': match_type,
            'traits': traits,
            'life_form_code': life_form_code,
            'needs_manual_review': match_type == 'none'
        })
    
    print(f"\nMatching results:")
    print(f"  Exact/base matches: {matched}")
    print(f"  Genus fallbacks: {genus_fallback}")
    print(f"  No match: {no_match}")
    
    return results


def generate_gap_report(matched_species, prominent_only=False):
    """Generate report of species needing manual trait assignment."""
    gaps = []
    
    for sp in matched_species:
        needs_review = sp['needs_manual_review']
        is_prominent = sp['max_prominence'] >= 3.2
        
        if needs_review or (prominent_only and is_prominent and sp['match_type'] != 'exact'):
            gaps.append({
                'species': sp['species'],
                'common_name': sp['common_name'],
                'prominence': sp['max_prominence'],
                'is_prominent': is_prominent,
                'match_type': sp['match_type'],
                'current_traits': sp['traits'],
                'life_form_code': sp['life_form_code'],
                'vegetation_types': [vt['name'] for vt in sp['vegetation_types']],
                'action_required': 'manual_assignment' if sp['match_type'] == 'none' else 'verify_genus_fallback'
            })
    
    # Sort by prominence (3.2 first) then alphabetically
    gaps.sort(key=lambda x: (-x['prominence'], x['species']))
    
    return gaps


def generate_model_assignments(matched_species):
    """Generate final model assignments for species with valid life form codes."""
    assignments = {}

    for sp in matched_species:
        if sp['life_form_code']:
            assignments[sp['species']] = {
                'life_form_code': sp['life_form_code'],
                'height': sp['traits'].get('plant_height'),
                'growth_form': sp['traits'].get('plant_growth_form'),
                'vegetation_types': [vt['type'] for vt in sp['vegetation_types']],
                'prominence': sp['max_prominence'],
                'confidence': 'high' if sp['match_type'] == 'exact' else
                             'medium' if sp['match_type'] in ['base_species', 'genus'] else 'low'
            }

    return assignments


def main():
    # Check if AusTraits data exists
    traits_file = AUSTRAITS_DIR / 'traits.csv'
    
    if not traits_file.exists():
        print("=" * 60)
        print("AusTraits data not found!")
        print("=" * 60)
        print(f"\nExpected location: {traits_file}")
        print("\nTo proceed:")
        print("1. Download AusTraits 5.0 from: https://zenodo.org/record/10075543")
        print("2. Extract traits.csv to: {AUSTRAITS_DIR}/")
        print("3. Re-run this script")
        print("\nAlternatively, run in DEMO MODE to see workflow with sample data:")
        print("  python3 trait_matcher.py --demo")
        
        # Generate sample output structure for documentation
        generate_sample_output()
        return
    
    # Load species list
    print("Loading species list...")
    with open(SPECIES_FILE, 'r') as f:
        species_list = json.load(f)
    print(f"  Loaded {len(species_list)} species")
    
    # Load AusTraits
    austraits_data = load_austraits_traits(traits_file)
    
    # Match species
    print("\nMatching species to AusTraits...")
    matched = match_species(species_list, austraits_data)
    
    # Save matched traits
    with open(OUTPUT_DIR / 'species_traits.json', 'w') as f:
        json.dump(matched, f, indent=2)
    print(f"\nSaved species traits to: {OUTPUT_DIR / 'species_traits.json'}")
    
    # Generate gap report
    gaps = generate_gap_report(matched)
    with open(OUTPUT_DIR / 'gap_report.json', 'w') as f:
        json.dump(gaps, f, indent=2)
    print(f"Gap report ({len(gaps)} species): {OUTPUT_DIR / 'gap_report.json'}")
    
    # Generate model assignments
    assignments = generate_model_assignments(matched)
    with open(OUTPUT_DIR / 'model_assignments.json', 'w') as f:
        json.dump(assignments, f, indent=2)
    print(f"Model assignments ({len(assignments)} species): {OUTPUT_DIR / 'model_assignments.json'}")
    
    # Summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    lf_counts = defaultdict(int)
    for sp in matched:
        lf_counts[sp['life_form_code']] += 1

    print("\nSpecies by life form code:")
    for code, count in sorted(lf_counts.items(), key=lambda x: -x[1]):
        print(f"  {code}: {count}")
    
    prominent_gaps = [g for g in gaps if g['is_prominent']]
    print(f"\nProminent species (3.2) needing review: {len(prominent_gaps)}")
    for gap in prominent_gaps[:10]:
        print(f"  - {gap['species']} ({gap['match_type']})")
    if len(prominent_gaps) > 10:
        print(f"  ... and {len(prominent_gaps) - 10} more")


def generate_sample_output():
    """Generate sample output structure for documentation/demo purposes."""
    print("\nGenerating sample output structure...")
    
    # Load species list
    with open(SPECIES_FILE, 'r') as f:
        species_list = json.load(f)
    
    # Create sample species_traits.json structure
    sample_traits = []
    for sp in species_list[:5]:  # Just first 5 for sample
        sample_traits.append({
            'species': sp['species'],
            'common_name': sp.get('common_name', ''),
            'max_prominence': sp.get('max_prominence'),
            'match_type': 'pending',
            'traits': {
                'plant_growth_form': None,
                'plant_height': None,
                'woodiness': None
            },
            'life_form_code': None,
            'needs_manual_review': True,
            'note': 'SAMPLE - Awaiting AusTraits integration'
        })
    
    with open(OUTPUT_DIR / 'species_traits_SAMPLE.json', 'w') as f:
        json.dump(sample_traits, f, indent=2)
    
    print(f"  Sample structure saved to: {OUTPUT_DIR / 'species_traits_SAMPLE.json'}")


if __name__ == '__main__':
    import sys
    if '--demo' in sys.argv:
        generate_sample_output()
    else:
        main()
