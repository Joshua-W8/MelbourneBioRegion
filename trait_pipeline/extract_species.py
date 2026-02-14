#!/usr/bin/env python3
"""
Species Extraction Script for Pre-colonial Melbourne Vegetation Project
Run from the trait_pipeline directory: python3 extract_species.py
"""

import json
from collections import defaultdict
from pathlib import Path

VEGETATION_TYPES = [
    'beach_and_dunes',
    'saltmarsh', 
    'coastal_marshlands_and_brackish_flats',
    'swamp_scrub',
    'woodlands_and_heathlands_on_sand',
    'woodlands_and_forests_on_sedimentary_hills_valleys_and_ridges',
    'grasslands_and_woodlands_on_fertile_plains',
    'cliffs_and_escarpments',
    'river_banks_and_creeklines',
    'wet_heathland',
    'freshwater_wetland',
    'saltwater_wetland'
]

VEG_TYPE_NAMES = {
    'beach_and_dunes': 'Beach and Dunes',
    'saltmarsh': 'Saltmarsh',
    'coastal_marshlands_and_brackish_flats': 'Coastal Marshlands and Brackish Flats',
    'swamp_scrub': 'Swamp Scrub',
    'woodlands_and_heathlands_on_sand': 'Woodlands and Heathlands on Sand',
    'woodlands_and_forests_on_sedimentary_hills_valleys_and_ridges': 'Woodlands and Forests on Sedimentary Hills',
    'grasslands_and_woodlands_on_fertile_plains': 'Grasslands and Woodlands on Fertile Plains',
    'cliffs_and_escarpments': 'Cliffs and Escarpments',
    'river_banks_and_creeklines': 'River Banks and Creeklines',
    'wet_heathland': 'Wet Heathland',
    'freshwater_wetland': 'Freshwater Wetland',
    'saltwater_wetland': 'Saltwater Wetland'
}


def find_plant_list():
    """Find the plant list JSON file."""
    script_dir = Path(__file__).parent
    possible_paths = [
        script_dir / 'pre-colonial-plant-list.json',
        script_dir.parent / 'pre-colonial-plant-list.json',
        script_dir.parent / 'data' / 'pre-colonial-plant-list.json',
        script_dir / 'data' / 'pre-colonial-plant-list.json',
        script_dir.parent / 'precolonial-melbourne' / 'pre-colonial-plant-list.json',
    ]
    for p in possible_paths:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"Could not find pre-colonial-plant-list.json.\n"
        f"Searched in: {[str(p) for p in possible_paths]}\n"
        f"Please place it in the trait_pipeline directory."
    )


def get_max_occurrence(species_record):
    max_val = 0
    for veg_type in VEGETATION_TYPES:
        val = species_record.get(veg_type, 0)
        if val is not None and val > max_val:
            max_val = val
    return max_val


def get_vegetation_types_for_species(species_record, threshold=3.1):
    veg_types = []
    for veg_type in VEGETATION_TYPES:
        val = species_record.get(veg_type, 0)
        if val is not None and val >= threshold:
            veg_types.append({
                'type': veg_type,
                'name': VEG_TYPE_NAMES[veg_type],
                'prominence_code': val
            })
    return veg_types


def extract_species_by_threshold(plant_list, threshold):
    species = []
    for record in plant_list:
        max_occurrence = get_max_occurrence(record)
        if max_occurrence >= threshold:
            species.append({
                'species': record['species'],
                'common_name': record.get('common_name_s', ''),
                'certain': record.get('certain') == 1,
                'max_prominence': max_occurrence,
                'vegetation_types': get_vegetation_types_for_species(record, threshold)
            })
    return species


def extract_prominent_species(plant_list):
    species = []
    for record in plant_list:
        max_occurrence = get_max_occurrence(record)
        if max_occurrence >= 3.2:
            prominent_in = []
            for veg_type in VEGETATION_TYPES:
                val = record.get(veg_type, 0)
                if val is not None and val >= 3.2:
                    prominent_in.append(VEG_TYPE_NAMES[veg_type])
            
            species.append({
                'species': record['species'],
                'common_name': record.get('common_name_s', ''),
                'certain': record.get('certain') == 1,
                'prominent_in': prominent_in,
                'trait_status': 'pending_manual_assignment'
            })
    return species


def group_by_vegetation_type(plant_list, threshold=3.1):
    grouped = defaultdict(lambda: {'prominent': [], 'present': []})
    
    for record in plant_list:
        for veg_type in VEGETATION_TYPES:
            val = record.get(veg_type, 0)
            if val is None:
                continue
                
            if val >= 3.2:
                grouped[veg_type]['prominent'].append({
                    'species': record['species'],
                    'common_name': record.get('common_name_s', ''),
                    'prominence_code': val
                })
            elif val >= threshold:
                grouped[veg_type]['present'].append({
                    'species': record['species'],
                    'common_name': record.get('common_name_s', ''),
                    'prominence_code': val
                })
    
    result = {}
    for veg_type, species_lists in grouped.items():
        result[veg_type] = {
            'name': VEG_TYPE_NAMES[veg_type],
            'prominent_count': len(species_lists['prominent']),
            'present_count': len(species_lists['present']),
            'total_count': len(species_lists['prominent']) + len(species_lists['present']),
            'prominent': sorted(species_lists['prominent'], key=lambda x: x['species']),
            'present': sorted(species_lists['present'], key=lambda x: x['species'])
        }
    
    return result


def generate_statistics(plant_list):
    stats = {
        'total_species': len(plant_list),
        'by_threshold': {},
        'by_vegetation_type': {},
        'certain_records': 0
    }
    
    thresholds = [3.2, 3.1, 2.2, 2.1, 1.0]
    for thresh in thresholds:
        count = sum(1 for r in plant_list if get_max_occurrence(r) >= thresh)
        stats['by_threshold'][str(thresh)] = count
    
    for veg_type in VEGETATION_TYPES:
        count = sum(1 for r in plant_list 
                   if r.get(veg_type, 0) is not None and r.get(veg_type, 0) >= 3.1)
        stats['by_vegetation_type'][VEG_TYPE_NAMES[veg_type]] = count
    
    stats['certain_records'] = sum(1 for r in plant_list if r.get('certain') == 1)
    
    return stats


def main():
    # Use relative paths from script location
    script_dir = Path(__file__).parent
    output_dir = script_dir / 'output'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find input file
    input_path = find_plant_list()
    
    print(f"Loading plant list from {input_path}...")
    with open(input_path, 'r') as f:
        plant_list = json.load(f)
    print(f"Loaded {len(plant_list)} species records")
    
    # Generate statistics
    print("\nGenerating statistics...")
    stats = generate_statistics(plant_list)
    print(f"  Total species: {stats['total_species']}")
    print(f"  3.2 (prominent): {stats['by_threshold']['3.2']}")
    print(f"  3.1+ (diorama): {stats['by_threshold']['3.1']}")
    print(f"  2.1+ (plant list): {stats['by_threshold']['2.1']}")
    print(f"  Certain records: {stats['certain_records']}")
    
    # Extract species lists
    print("\nExtracting species lists...")
    
    diorama_species = extract_species_by_threshold(plant_list, 3.1)
    with open(output_dir / 'species_diorama.json', 'w') as f:
        json.dump(diorama_species, f, indent=2)
    print(f"  Diorama species (3.1+): {len(diorama_species)}")
    
    prominent_species = extract_prominent_species(plant_list)
    with open(output_dir / 'species_prominent.json', 'w') as f:
        json.dump(prominent_species, f, indent=2)
    print(f"  Prominent species (3.2): {len(prominent_species)}")
    
    plantlist_species = extract_species_by_threshold(plant_list, 2.1)
    with open(output_dir / 'species_plantlist.json', 'w') as f:
        json.dump(plantlist_species, f, indent=2)
    print(f"  Plant list species (2.1+): {len(plantlist_species)}")
    
    grouped = group_by_vegetation_type(plant_list, 3.1)
    with open(output_dir / 'species_by_vegetation_type.json', 'w') as f:
        json.dump(grouped, f, indent=2)
    print(f"  Grouped into {len(grouped)} vegetation types")
    
    query_list = [{'species': sp['species'], 'common_name': sp.get('common_name', '')} 
                  for sp in diorama_species]
    with open(output_dir / 'austraits_query_list.json', 'w') as f:
        json.dump(query_list, f, indent=2)
    print(f"  AusTraits query list: {len(query_list)} species")
    
    with open(output_dir / 'statistics.json', 'w') as f:
        json.dump(stats, f, indent=2)
    
    print("\nSpecies by vegetation type (3.1+ threshold):")
    for veg_type, data in sorted(grouped.items(), key=lambda x: x[1]['total_count'], reverse=True):
        print(f"  {data['name']}: {data['total_count']} ({data['prominent_count']} prominent)")
    
    print(f"\n✓ Output written to: {output_dir.absolute()}")


if __name__ == '__main__':
    main()
