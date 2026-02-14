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

# Growth form to model category mapping
GROWTH_FORM_MAPPING = {
    # Trees
    'tree': 'canopy_tree',
    'mallee': 'subcanopy_tree',
    
    # Shrubs
    'shrub': 'medium_shrub',  # Default, refined by height
    'subshrub': 'low_shrub',
    'prostrate_shrub': 'low_shrub',
    
    # Graminoids
    'graminoid': 'tussock_grass',
    'grass': 'tussock_grass',
    'sedge': 'sedge_rush',
    'rush': 'sedge_rush',
    
    # Herbs
    'herb': 'forb_upright',
    'forb': 'forb_upright',
    'geophyte': 'forb_upright',
    'annual': 'forb_upright',
    
    # Special forms
    'fern': 'fern',
    'climber': 'climber_scrambler',
    'vine': 'climber_scrambler',
    'scrambler': 'climber_scrambler',
    'aquatic': 'aquatic',
    'emergent': 'aquatic',
    'floating': 'aquatic',
    'succulent': 'succulent_saltmarsh',
    'parasite': 'parasitic_epiphyte',
    'hemiparasite': 'parasitic_epiphyte',
    'epiphyte': 'parasitic_epiphyte'
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


def determine_model_category(traits, height=None):
    """
    Determine 3D model category from traits.
    Priority: growth_form > height refinement > woodiness
    """
    growth_form = traits.get('plant_growth_form')
    woodiness = traits.get('woodiness')
    
    # Start with growth form mapping
    if growth_form:
        # Normalize growth form
        gf_lower = growth_form.lower().strip()
        
        # Direct mapping
        if gf_lower in GROWTH_FORM_MAPPING:
            category = GROWTH_FORM_MAPPING[gf_lower]
        else:
            # Try partial match
            category = None
            for key, value in GROWTH_FORM_MAPPING.items():
                if key in gf_lower or gf_lower in key:
                    category = value
                    break
            
            if not category:
                category = 'forb_upright'  # Default fallback
        
        # Refine by height
        if height:
            if category == 'canopy_tree' and height < 10:
                category = 'subcanopy_tree'
            elif category == 'medium_shrub':
                if height > 5:
                    category = 'tall_shrub'
                elif height > 2:
                    category = 'medium_shrub'
                elif height > 0.5:
                    category = 'medium_shrub'
                else:
                    category = 'low_shrub'
        
        return category
    
    # Fallback to woodiness
    if woodiness:
        if 'woody' in woodiness.lower():
            return 'medium_shrub'
        else:
            return 'forb_upright'
    
    return None


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
        
        # Determine model category
        height = traits.get('plant_height')
        model_category = determine_model_category(traits, height)
        
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
            'model_category': model_category,
            'needs_manual_review': match_type == 'none' or model_category is None
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
                'suggested_category': sp['model_category'],
                'vegetation_types': [vt['name'] for vt in sp['vegetation_types']],
                'action_required': 'manual_assignment' if sp['match_type'] == 'none' else 'verify_genus_fallback'
            })
    
    # Sort by prominence (3.2 first) then alphabetically
    gaps.sort(key=lambda x: (-x['prominence'], x['species']))
    
    return gaps


def generate_model_assignments(matched_species):
    """Generate final model assignments for species with valid categories."""
    assignments = {}
    
    for sp in matched_species:
        if sp['model_category']:
            assignments[sp['species']] = {
                'model_category': sp['model_category'],
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
    
    category_counts = defaultdict(int)
    for sp in matched:
        if sp['model_category']:
            category_counts[sp['model_category']] += 1
        else:
            category_counts['unassigned'] += 1
    
    print("\nSpecies by model category:")
    for category, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {category}: {count}")
    
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
            'model_category': None,
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
