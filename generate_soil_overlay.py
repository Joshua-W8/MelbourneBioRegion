#!/usr/bin/env python3
"""
Generate Soil Overlay and Pre-join to EVC Polygons

Downloads/processes soil type data from City of Melbourne Open Data,
clips to study area, and pre-joins soil information to EVC polygons
so the info panel can display soil context at runtime without
additional network requests.

Usage:
    python generate_soil_overlay.py
"""

import os
import sys
import json
import requests
from pathlib import Path
from typing import Optional, Dict, List, Any

try:
    import geopandas as gpd
    from shapely.geometry import shape, mapping
    from shapely.validation import make_valid
    import pandas as pd
except ImportError as e:
    print("Missing required packages. Install with:")
    print("  pip install geopandas shapely requests pandas")
    sys.exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent
STUDY_AREA_FILE = PROJECT_ROOT / "ari_study_area_boundary.geojson"
SOIL_RAW_FILE = PROJECT_ROOT / "data_processing" / "soil_types_raw.geojson"
SOIL_OUTPUT_FILE = PROJECT_ROOT / "public" / "data" / "soil_types.geojson"
VEGETATION_FILE = PROJECT_ROOT / "public" / "data" / "vegetation_polygons.geojson"

# Soil data URL
SOIL_DATA_URL = "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/soil-types-by-area-urban-forest/exports/geojson"

# Simplification tolerance (slightly less than vegetation for smooth boundaries)
SIMPLIFY_TOLERANCE = 0.00002


# =============================================================================
# DATA DOWNLOAD
# =============================================================================

def download_soil_data() -> bool:
    """Download soil data from City of Melbourne Open Data"""
    print("\n" + "=" * 60)
    print("STEP 1: Downloading soil data")
    print("=" * 60)

    if SOIL_RAW_FILE.exists():
        print(f"✓ Using cached data: {SOIL_RAW_FILE}")
        return True

    print(f"Downloading from: {SOIL_DATA_URL}")

    try:
        response = requests.get(SOIL_DATA_URL, timeout=60)
        response.raise_for_status()

        SOIL_RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SOIL_RAW_FILE, 'w') as f:
            f.write(response.text)

        file_size = SOIL_RAW_FILE.stat().st_size / 1024
        print(f"✓ Downloaded: {file_size:.1f} KB")
        return True

    except Exception as e:
        print(f"✗ Download failed: {e}")
        print("\nPlease download manually from:")
        print("  https://data.melbourne.vic.gov.au/explore/dataset/soil-types-by-area-urban-forest/")
        print(f"\nSave as: {SOIL_RAW_FILE}")
        return False


# =============================================================================
# PROCESSING FUNCTIONS
# =============================================================================

def load_study_area() -> gpd.GeoDataFrame:
    """Load the study area boundary"""
    print(f"\nLoading study area: {STUDY_AREA_FILE}")

    if not STUDY_AREA_FILE.exists():
        print(f"ERROR: Study area file not found: {STUDY_AREA_FILE}")
        sys.exit(1)

    gdf = gpd.read_file(STUDY_AREA_FILE)
    print(f"  ✓ Loaded study area ({len(gdf)} features)")
    return gdf


def process_soil_data(study_area: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Process soil data: clip, simplify, standardize"""
    print("\n" + "=" * 60)
    print("STEP 2: Processing soil data")
    print("=" * 60)

    # Load raw soil data
    print(f"\nLoading: {SOIL_RAW_FILE}")
    soil_gdf = gpd.read_file(SOIL_RAW_FILE)
    print(f"  Raw features: {len(soil_gdf)}")

    # Ensure CRS is WGS84
    if soil_gdf.crs is None:
        soil_gdf = soil_gdf.set_crs("EPSG:4326")
    elif soil_gdf.crs != "EPSG:4326":
        soil_gdf = soil_gdf.to_crs("EPSG:4326")

    # Make geometries valid
    soil_gdf['geometry'] = soil_gdf['geometry'].apply(
        lambda g: make_valid(g) if g is not None else g
    )

    # Clip to study area
    study_area_wgs84 = study_area.to_crs("EPSG:4326")
    study_boundary = study_area_wgs84.union_all()

    print("  Clipping to study area...")
    soil_clipped = gpd.clip(soil_gdf, study_boundary)
    print(f"  Clipped features: {len(soil_clipped)}")

    # Simplify geometry
    print(f"  Simplifying (tolerance: {SIMPLIFY_TOLERANCE})...")
    soil_clipped['geometry'] = soil_clipped['geometry'].simplify(
        SIMPLIFY_TOLERANCE, preserve_topology=True
    )

    # Standardize properties - keep only what we need
    output_gdf = gpd.GeoDataFrame({
        'soil_type': soil_clipped['soil'],
        'sub_base': soil_clipped['sub_base'],
        'geometry': soil_clipped['geometry']
    }, crs="EPSG:4326")

    # Remove any empty geometries
    output_gdf = output_gdf[~output_gdf.geometry.is_empty].copy()

    print(f"\n  ✓ Processed {len(output_gdf)} soil polygons")
    print(f"  Unique soil types: {output_gdf['soil_type'].nunique()}")

    return output_gdf


def save_soil_geojson(soil_gdf: gpd.GeoDataFrame):
    """Save processed soil data"""
    print("\n" + "=" * 60)
    print("STEP 3: Saving soil GeoJSON")
    print("=" * 60)

    SOIL_OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    soil_gdf.to_file(SOIL_OUTPUT_FILE, driver='GeoJSON')

    file_size = SOIL_OUTPUT_FILE.stat().st_size / 1024
    print(f"  ✓ Saved to: {SOIL_OUTPUT_FILE}")
    print(f"  ✓ File size: {file_size:.1f} KB")


def prejoin_soil_to_vegetation(soil_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Pre-join soil types to vegetation polygons"""
    print("\n" + "=" * 60)
    print("STEP 4: Pre-joining soil to EVC polygons")
    print("=" * 60)

    # Load vegetation polygons
    print(f"\nLoading: {VEGETATION_FILE}")
    veg_gdf = gpd.read_file(VEGETATION_FILE)
    print(f"  EVC polygons: {len(veg_gdf)}")

    # Ensure same CRS
    if veg_gdf.crs != "EPSG:4326":
        veg_gdf = veg_gdf.to_crs("EPSG:4326")

    # Make soil geometries valid
    soil_gdf['geometry'] = soil_gdf['geometry'].apply(
        lambda g: make_valid(g) if g is not None else g
    )

    # For each EVC polygon, find overlapping soil types
    results = []

    print("\n  Processing intersections...")
    for idx, veg_row in veg_gdf.iterrows():
        veg_geom = veg_row.geometry
        if veg_geom is None or veg_geom.is_empty:
            results.append({
                'soil_type': None,
                'soil_sub_base': None,
                'soil_types_all': None
            })
            continue

        # Find intersecting soil polygons
        intersections = []
        for _, soil_row in soil_gdf.iterrows():
            soil_geom = soil_row.geometry
            if soil_geom is None or soil_geom.is_empty:
                continue

            try:
                if veg_geom.intersects(soil_geom):
                    intersection = veg_geom.intersection(soil_geom)
                    if not intersection.is_empty:
                        # Calculate overlap area (project to metric CRS)
                        veg_projected = gpd.GeoSeries([veg_geom], crs="EPSG:4326").to_crs("EPSG:28355")
                        int_projected = gpd.GeoSeries([intersection], crs="EPSG:4326").to_crs("EPSG:28355")
                        overlap_area = int_projected.area.iloc[0]

                        intersections.append({
                            'soil_type': soil_row['soil_type'],
                            'sub_base': soil_row['sub_base'],
                            'overlap_area': overlap_area
                        })
            except Exception as e:
                # Skip problematic geometries
                continue

        if not intersections:
            results.append({
                'soil_type': None,
                'soil_sub_base': None,
                'soil_types_all': None
            })
            continue

        # Sort by overlap area (largest first)
        intersections.sort(key=lambda x: x['overlap_area'], reverse=True)

        # Dominant soil type
        dominant = intersections[0]

        # All overlapping types (unique, excluding None)
        all_types = list(dict.fromkeys([i['soil_type'] for i in intersections if i['soil_type'] is not None]))

        results.append({
            'soil_type': dominant['soil_type'],
            'soil_sub_base': dominant['sub_base'],
            'soil_types_all': all_types if len(all_types) > 1 else None
        })

    # Add soil columns to vegetation GeoDataFrame
    veg_gdf['soil_type'] = [r['soil_type'] for r in results]
    veg_gdf['soil_sub_base'] = [r['soil_sub_base'] for r in results]
    veg_gdf['soil_types_all'] = [json.dumps(r['soil_types_all']) if r['soil_types_all'] else None for r in results]

    # Count results
    assigned = veg_gdf['soil_type'].notna().sum()
    unassigned = veg_gdf['soil_type'].isna().sum()

    print(f"\n  ✓ Assigned soil type: {assigned} polygons")
    if unassigned > 0:
        print(f"  ⚠ No soil data for: {unassigned} polygons (outside coverage)")

    return veg_gdf


def save_vegetation_with_soil(veg_gdf: gpd.GeoDataFrame):
    """Save updated vegetation polygons"""
    print("\n" + "=" * 60)
    print("STEP 5: Saving updated vegetation polygons")
    print("=" * 60)

    # Ensure WGS84
    if veg_gdf.crs != "EPSG:4326":
        veg_gdf = veg_gdf.to_crs("EPSG:4326")

    # Save
    veg_gdf.to_file(VEGETATION_FILE, driver='GeoJSON')

    file_size = VEGETATION_FILE.stat().st_size / 1024
    print(f"  ✓ Saved to: {VEGETATION_FILE}")
    print(f"  ✓ File size: {file_size:.1f} KB")


def print_report(veg_gdf: gpd.GeoDataFrame, soil_gdf: gpd.GeoDataFrame):
    """Print verification report"""
    print("\n" + "=" * 60)
    print("VERIFICATION REPORT")
    print("=" * 60)

    print(f"\n1. Soil Data Summary:")
    print(f"   - Processed polygons: {len(soil_gdf)}")
    print(f"   - Unique soil types: {soil_gdf['soil_type'].nunique()}")
    print(f"   - Soil types:")
    for soil_type in sorted([s for s in soil_gdf['soil_type'].unique() if s is not None]):
        count = len(soil_gdf[soil_gdf['soil_type'] == soil_type])
        print(f"       • {soil_type} ({count} polygons)")

    print(f"\n2. EVC → Soil Type Mapping:")
    print("-" * 80)
    print(f"{'EVC':<6} {'EVC Name':<35} {'Soil Type':<35}")
    print("-" * 80)

    # Group by EVC and show mapping
    for evc in sorted(veg_gdf['evc_number'].unique()):
        evc_rows = veg_gdf[veg_gdf['evc_number'] == evc]
        evc_name = evc_rows['evc_name'].iloc[0]
        if len(evc_name) > 33:
            evc_name = evc_name[:30] + "..."

        # Get dominant soil types for this EVC
        soil_types = evc_rows['soil_type'].value_counts()
        dominant = soil_types.index[0] if len(soil_types) > 0 and pd.notna(soil_types.index[0]) else "No data"
        if len(str(dominant)) > 33:
            dominant = str(dominant)[:30] + "..."

        print(f"{evc:<6} {evc_name:<35} {dominant:<35}")

    print("-" * 80)

    # Check for nulls
    null_count = veg_gdf['soil_type'].isna().sum()
    if null_count > 0:
        print(f"\n⚠ WARNING: {null_count} EVC polygons have no soil data")
        null_evcs = veg_gdf[veg_gdf['soil_type'].isna()]['patch_id'].tolist()
        print(f"   Patches: {', '.join(null_evcs[:5])}{'...' if len(null_evcs) > 5 else ''}")

    print(f"\n3. Output Files:")
    print(f"   - Soil GeoJSON: {SOIL_OUTPUT_FILE} ({SOIL_OUTPUT_FILE.stat().st_size / 1024:.1f} KB)")
    print(f"   - Vegetation GeoJSON: {VEGETATION_FILE} ({VEGETATION_FILE.stat().st_size / 1024:.1f} KB)")

    # Verify all original properties preserved
    expected_cols = ['patch_id', 'evc_number', 'evc_name', 'vegetation_type', 'hectares',
                     'bioregion', 'bcs', 'bcs_desc']
    missing = [col for col in expected_cols if col not in veg_gdf.columns]
    if missing:
        print(f"\n✗ ERROR: Missing original columns: {missing}")
    else:
        print(f"\n4. ✓ All original EVC properties preserved")
        print(f"   New properties added: soil_type, soil_sub_base, soil_types_all")

    print("\n" + "=" * 60)
    print("✓ PROCESSING COMPLETE")
    print("=" * 60)


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("SOIL TYPE OVERLAY GENERATOR")
    print("=" * 60)

    # Download soil data if needed
    if not download_soil_data():
        sys.exit(1)

    # Load study area
    study_area = load_study_area()

    # Process soil data
    soil_gdf = process_soil_data(study_area)

    # Save processed soil GeoJSON
    save_soil_geojson(soil_gdf)

    # Pre-join soil to vegetation polygons
    veg_with_soil = prejoin_soil_to_vegetation(soil_gdf)

    # Save updated vegetation
    save_vegetation_with_soil(veg_with_soil)

    # Print report
    print_report(veg_with_soil, soil_gdf)


if __name__ == "__main__":
    main()
