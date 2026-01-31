#!/usr/bin/env python3
"""
Generate 3D scene parameters for vegetation dioramas.

Combines vegetation coverage data with species lists to calculate
instance counts for React Three Fiber rendering.

Usage:
    python3 generate_scene_parameters.py

Output:
    trait_pipeline/output/scene_parameters.json
"""

import json
from pathlib import Path
from typing import Dict, List, Any


# Default crown sizes for when trait data is unavailable (in m²)
DEFAULT_CROWN_SIZES = {
    'canopy_tree': 50,
    'subcanopy_tree': 20,
    'tall_shrub': 4,
    'medium_shrub': 2,
    'low_shrub': 1,
    'tussock_grass': 0.5,
    'sedge_rush': 0.3,
    'forb_upright': 0.1,
    'forb_rosette': 0.1,
    'fern': 0.5,
    'climber_scrambler': 2,
    'aquatic': 1,
    'succulent_saltmarsh': 0.2,
    'parasitic_epiphyte': 1
}

# Growth form to layer mapping
GROWTH_FORM_TO_LAYER = {
    'canopy_tree': 'canopy',
    'subcanopy_tree': 'canopy',
    'tall_shrub': 'shrub',
    'medium_shrub': 'shrub',
    'low_shrub': 'shrub',
    'tussock_grass': 'ground',
    'sedge_rush': 'ground',
    'forb_upright': 'ground',
    'forb_rosette': 'ground',
    'fern': 'ground',
    'climber_scrambler': 'shrub',
    'aquatic': 'ground',
    'succulent_saltmarsh': 'ground',
    'parasitic_epiphyte': 'canopy'
}


def load_json(filepath: Path) -> Dict:
    """Load JSON file and return as dictionary."""
    with open(filepath, 'r') as f:
        return json.load(f)


def get_crown_size(model_type: str) -> float:
    """Get typical crown size for a model type in m²."""
    return DEFAULT_CROWN_SIZES.get(model_type, 1.0)


def get_layer(model_type: str) -> str:
    """Get vegetation layer (canopy/shrub/ground) for a model type."""
    return GROWTH_FORM_TO_LAYER.get(model_type, 'ground')


def calculate_instances(
    total_cover_m2: float,
    prominence_allocation_percent: float,
    crown_size_m2: float
) -> int:
    """
    Calculate number of plant instances.

    Args:
        total_cover_m2: Total coverage available for this layer (in m²)
        prominence_allocation_percent: Percentage of layer allocated to this prominence level
        crown_size_m2: Typical crown size for this species

    Returns:
        Number of instances (rounded to nearest integer, minimum 1 if cover > 0)
    """
    allocated_cover = total_cover_m2 * (prominence_allocation_percent / 100)
    instances = allocated_cover / crown_size_m2

    # Round to nearest integer, minimum 1 if we have any coverage
    if allocated_cover > 0:
        return max(1, round(instances))
    return 0


def generate_scene_for_vegetation_type(
    vegetation_type: str,
    coverage_data: Dict,
    species_data: Dict,
    distribution_rules: Dict,
    scene_area_m2: float = 100
) -> Dict:
    """
    Generate scene parameters for one vegetation type.

    Args:
        vegetation_type: Name of vegetation type
        coverage_data: Coverage percentages from vegetation_coverage_base.json
        species_data: Species list from species_by_vegetation_type.json
        distribution_rules: Rules from coverage_distribution_rules.json
        scene_area_m2: Size of scene in square meters (default 10m x 10m = 100m²)

    Returns:
        Scene parameters dict with layers and species instances
    """

    if vegetation_type not in coverage_data['vegetation_types']:
        print(f"Warning: {vegetation_type} not found in coverage data")
        return None

    if vegetation_type not in species_data:
        print(f"Warning: {vegetation_type} not found in species data")
        return None

    veg_coverage = coverage_data['vegetation_types'][vegetation_type]['coverage']
    veg_species = species_data[vegetation_type]

    # Calculate total coverage area for each layer
    canopy_cover_m2 = scene_area_m2 * (veg_coverage['tree_canopy_percent'] / 100)
    shrub_cover_m2 = scene_area_m2 * (veg_coverage['shrub_cover_percent'] / 100)
    ground_cover_m2 = scene_area_m2 * (veg_coverage['groundcover_percent'] / 100)

    scene = {
        'vegetation_type': vegetation_type,
        'scene_area_m2': scene_area_m2,
        'total_coverage': veg_coverage,
        'layers': {
            'canopy': [],
            'shrub': [],
            'ground': []
        },
        'metadata': {
            'canopy_cover_m2': canopy_cover_m2,
            'shrub_cover_m2': shrub_cover_m2,
            'ground_cover_m2': ground_cover_m2
        }
    }

    # Get allocation rules
    canopy_rules = distribution_rules['layer_allocation_rules']['tree_canopy_layer']
    shrub_rules = distribution_rules['layer_allocation_rules']['shrub_layer']
    ground_rules = distribution_rules['layer_allocation_rules']['ground_layer']

    # Process prominent species (3.2)
    prominent = veg_species.get('prominent', [])

    for species in prominent:
        # Determine which layer this species belongs to (based on model_type or growth_form)
        # For now, we'll need to assign this manually or have model_assignments.json
        # This is a simplified version - you'll refine based on actual trait data

        species_dict = {
            'species_name': species.get('species', 'Unknown'),
            'common_name': species.get('common_name', ''),
            'prominence_code': 3.2,
            'prominence_label': 'Prominent',
        }

        # Try to guess layer from species name patterns (temporary solution)
        # Better: integrate with model_assignments.json once trait matching is done
        species_name_lower = species.get('species', '').lower()

        if 'eucalyptus' in species_name_lower or 'acacia' in species_name_lower:
            layer = 'canopy'
            cover_m2 = canopy_cover_m2
            allocation = canopy_rules['code_3.2']['percent_of_layer_min']
            crown_size = get_crown_size('canopy_tree')
        elif any(shrub in species_name_lower for shrub in ['melaleuca', 'leptospermum', 'bursaria', 'cassinia']):
            layer = 'shrub'
            cover_m2 = shrub_cover_m2
            allocation = shrub_rules['code_3.2']['percent_of_layer_min']
            crown_size = get_crown_size('tall_shrub')
        else:
            layer = 'ground'
            cover_m2 = ground_cover_m2
            allocation = ground_rules['code_3.2']['percent_of_layer_min']
            crown_size = get_crown_size('tussock_grass')

        # Calculate instances for this species
        # Distribute allocation evenly among all 3.2 species in this layer
        num_prominent_in_layer = sum(1 for s in prominent if get_layer_from_name(s.get('species', '')) == layer)
        if num_prominent_in_layer == 0:
            continue

        allocation_per_species = allocation / num_prominent_in_layer
        instance_count = calculate_instances(cover_m2, allocation_per_species, crown_size)

        species_dict['instance_count'] = instance_count
        species_dict['model_type'] = 'canopy_tree' if layer == 'canopy' else 'tall_shrub' if layer == 'shrub' else 'tussock_grass'
        species_dict['crown_size_m2'] = crown_size

        scene['layers'][layer].append(species_dict)

    # Process present species (3.1) - similar logic
    present = veg_species.get('present', [])

    for species in present:
        species_dict = {
            'species_name': species.get('species', 'Unknown'),
            'common_name': species.get('common_name', ''),
            'prominence_code': 3.1,
            'prominence_label': 'Present',
        }

        species_name_lower = species.get('species', '').lower()

        if 'eucalyptus' in species_name_lower or 'acacia' in species_name_lower:
            layer = 'canopy'
            cover_m2 = canopy_cover_m2
            allocation = canopy_rules['code_3.1']['percent_of_layer_min']
            crown_size = get_crown_size('subcanopy_tree')
        elif any(shrub in species_name_lower for shrub in ['melaleuca', 'leptospermum', 'bursaria', 'cassinia']):
            layer = 'shrub'
            cover_m2 = shrub_cover_m2
            allocation = shrub_rules['code_3.1']['percent_of_layer_min']
            crown_size = get_crown_size('medium_shrub')
        else:
            layer = 'ground'
            cover_m2 = ground_cover_m2
            allocation = ground_rules['code_3.1']['percent_of_layer_min']
            crown_size = get_crown_size('forb_upright')

        num_present_in_layer = sum(1 for s in present if get_layer_from_name(s.get('species', '')) == layer)
        if num_present_in_layer == 0:
            continue

        allocation_per_species = allocation / num_present_in_layer
        instance_count = calculate_instances(cover_m2, allocation_per_species, crown_size)

        species_dict['instance_count'] = instance_count
        species_dict['model_type'] = 'subcanopy_tree' if layer == 'canopy' else 'medium_shrub' if layer == 'shrub' else 'forb_upright'
        species_dict['crown_size_m2'] = crown_size

        scene['layers'][layer].append(species_dict)

    return scene


def get_layer_from_name(species_name: str) -> str:
    """Simple heuristic to guess layer from species name."""
    species_lower = species_name.lower()

    # Trees
    if any(tree in species_lower for tree in ['eucalyptus', 'acacia', 'allocasuarina', 'banksia']):
        return 'canopy'

    # Shrubs
    if any(shrub in species_lower for shrub in ['melaleuca', 'leptospermum', 'bursaria', 'cassinia', 'correa', 'goodenia']):
        return 'shrub'

    # Default to ground
    return 'ground'


def main():
    """Main execution function."""

    # Define paths
    output_dir = Path(__file__).parent / 'output'

    coverage_path = output_dir / 'vegetation_coverage_base.json'
    species_path = output_dir / 'species_by_vegetation_type.json'
    rules_path = output_dir / 'coverage_distribution_rules.json'
    classifications_path = output_dir / 'structural_classifications.json'

    output_path = output_dir / 'scene_parameters.json'

    # Load data
    print("Loading input files...")
    coverage_data = load_json(coverage_path)
    species_data = load_json(species_path)
    distribution_rules = load_json(rules_path)
    classifications = load_json(classifications_path)

    print(f"Loaded {len(coverage_data['vegetation_types'])} vegetation types")
    print(f"Loaded species data for {len(species_data)} vegetation types")

    # Generate scene parameters for all vegetation types
    all_scenes = {}

    for vegetation_type in coverage_data['vegetation_types'].keys():
        print(f"Generating scene parameters for: {vegetation_type}")

        scene = generate_scene_for_vegetation_type(
            vegetation_type,
            coverage_data,
            species_data,
            distribution_rules,
            scene_area_m2=25  # 5m x 5m scene
        )

        if scene:
            all_scenes[vegetation_type] = scene

            # Print summary
            canopy_count = len(scene['layers']['canopy'])
            shrub_count = len(scene['layers']['shrub'])
            ground_count = len(scene['layers']['ground'])

            print(f"  ✓ {canopy_count} canopy species, {shrub_count} shrub species, {ground_count} ground species")

    # Create output with metadata
    output = {
        'metadata': {
            'generated': '2025-01-31',
            'scene_area_m2': 25,
            'scene_dimensions': '5m x 5m',
            'description': 'Scene parameters for 3D vegetation dioramas',
            'vegetation_types_count': len(all_scenes)
        },
        'scenes': all_scenes
    }

    # Save to file
    print(f"\nWriting output to {output_path}")
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"✓ Generated scene parameters for {len(all_scenes)} vegetation types")
    print(f"✓ Output saved to: {output_path}")


if __name__ == '__main__':
    main()
