#!/usr/bin/env python3
"""
Generate Local EVC Boundary GeoJSON

Downloads NV1750 EVCBCS vector data from Victorian Government,
clips to study area, adds vegetation type mapping, cleans polygons,
and outputs production-ready GeoJSON for the web app.

Usage:
    python generate_local_evc_geojson.py
"""

import os
import sys
import json
import requests
from pathlib import Path
from typing import Optional, Dict, Any

try:
    import geopandas as gpd
    from shapely.geometry import shape, mapping
    from shapely.ops import unary_union
    from shapely.validation import make_valid
    import pandas as pd
except ImportError as e:
    print("Missing required packages. Install with:")
    print("  pip install geopandas shapely fiona requests pyproj pandas")
    sys.exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================

# Paths
PROJECT_ROOT = Path(__file__).parent
STUDY_AREA_FILE = PROJECT_ROOT / "ari_study_area_boundary.geojson"
OUTPUT_FILE = PROJECT_ROOT / "public" / "data" / "vegetation_polygons.geojson"
CACHE_DIR = PROJECT_ROOT / "data_processing"
CACHED_RAW_FILE = CACHE_DIR / "nv1750_evcbcs_raw.gpkg"

# Melbourne bounding box (with buffer for WFS query)
MELBOURNE_BBOX = "144.80,-38.00,145.15,-37.65"

# Minimum polygon area in hectares (slivers below this are removed)
MIN_HECTARES = 0.5

# Simplification tolerance in degrees (~2m at Melbourne's latitude)
SIMPLIFY_TOLERANCE = 0.00002

# =============================================================================
# EVC TO VEGETATION TYPE MAPPING
# =============================================================================

EVC_TO_VEGETATION_TYPE = {
    # Beach and Dunes
    311: 'Beach and Dunes',    # Berm Grassy Shrubland
    2: 'Beach and Dunes',      # Coast Banksia Woodland
    879: 'Beach and Dunes',    # Coastal Dune Grassland
    160: 'Beach and Dunes',    # Coastal Dune Scrub
    163: 'Beach and Dunes',    # Coastal Tussock Grassland
    921: 'Beach and Dunes',    # Coast Banksia Woodland/Coastal Dune Scrub Mosaic

    # Cliffs and escarpments
    895: 'Cliffs and escarpments',  # Escarpment Shrubland

    # Coastal marshlands and brackish flats
    934: 'Coastal marshlands and brackish flats',  # Brackish Grassland
    538: 'Coastal marshlands and brackish flats',  # Brackish Herbland
    13: 'Coastal marshlands and brackish flats',   # Brackish Sedgeland
    636: 'Coastal marshlands and brackish flats',  # Brackish Lake Aggregate
    656: 'Coastal marshlands and brackish flats',  # Brackish Wetland (Aggregate)
    914: 'Coastal marshlands and brackish flats',  # Estuarine Flats Grassland
    952: 'Coastal marshlands and brackish flats',  # Estuarine Reedbed
    10: 'Coastal marshlands and brackish flats',   # Estuarine Wetland

    # Freshwater wetland
    300: 'Freshwater wetland',  # Reed Swamp
    653: 'Freshwater wetland',  # Aquatic Herbland
    647: 'Freshwater wetland',  # Plains Sedgy Wetland
    125: 'Freshwater wetland',  # Plains Grassy Wetland
    136: 'Freshwater wetland',  # Sedge Wetland
    821: 'Freshwater wetland',  # Tall Marsh
    932: 'Freshwater wetland',  # Emergent Wetland Complex
    992: 'Freshwater wetland',  # Water Body - Fresh

    # Grasslands and Woodlands on fertile plains
    55: 'Grasslands and Woodlands on fertile plains',   # Plains Grassy Woodland
    132: 'Grasslands and Woodlands on fertile plains',  # Plains Grassland
    175: 'Grasslands and Woodlands on fertile plains',  # Grassy Woodland
    649: 'Grasslands and Woodlands on fertile plains',  # Stony Knoll Shrubland

    # River banks and creeklines
    18: 'River banks and creeklines',   # Riparian Forest
    56: 'River banks and creeklines',   # Floodplain Riparian Woodland
    68: 'River banks and creeklines',   # Creekline Grassy Woodland
    83: 'River banks and creeklines',   # Swampy Riparian Woodland
    164: 'River banks and creeklines',  # Creekline Herb-rich Woodland
    641: 'River banks and creeklines',  # Riparian Woodland
    654: 'River banks and creeklines',  # Creekline Tussock Grassland
    707: 'River banks and creeklines',  # Sedgy Swamp Woodland
    851: 'River banks and creeklines',  # Stream Bank Shrubland
    892: 'River banks and creeklines',  # Waterbody (unknown type)
    897: 'River banks and creeklines',  # Plains Floodplain Wetland Aggregate

    # Saltmarsh
    9: 'Saltmarsh',  # Coastal Saltmarsh

    # Saltwater wetland
    140: 'Saltwater wetland',  # Mangrove Shrubland
    537: 'Saltwater wetland',  # Coastal Dry Saltmarsh
    842: 'Saltwater wetland',  # Saline Aquatic Meadow
    991: 'Saltwater wetland',  # Water body - salt

    # Swamp scrub
    53: 'Swamp scrub',   # Swamp Scrub
    953: 'Swamp scrub',  # Estuarine Scrub Complex

    # Wet heathland
    8: 'Wet heathland',    # Wet Heathland
    191: 'Wet heathland',  # Riparian Scrub

    # Woodlands and forests on sedimentary hills
    47: 'Woodlands and forests on sedimentary hills',  # Valley Grassy Forest

    # Woodlands and heathlands on sand
    3: 'Woodlands and heathlands on sand',    # Damp Sands Herb-rich Woodland
    6: 'Woodlands and heathlands on sand',    # Sand Heathland
    48: 'Woodlands and heathlands on sand',   # Heathy Woodland
    710: 'Woodlands and heathlands on sand',  # Damp Heathland
    793: 'Woodlands and heathlands on sand',  # Damp Heathy Woodland
}

# =============================================================================
# WFS DOWNLOAD
# =============================================================================

WFS_ENDPOINTS = [
    {
        "name": "DataVic OpenData WFS (v2.0.0)",
        "url": "https://opendata.maps.vic.gov.au/geoserver/wfs",
        "params": {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typeName": "open-data-platform:nv1750_evcbcs",
            "outputFormat": "application/json",
            "srsName": "EPSG:4326",
            "bbox": MELBOURNE_BBOX + ",EPSG:4326"
        }
    },
    {
        "name": "DataVic OpenData WFS (v1.1.0)",
        "url": "https://opendata.maps.vic.gov.au/geoserver/wfs",
        "params": {
            "service": "WFS",
            "version": "1.1.0",
            "request": "GetFeature",
            "typeName": "open-data-platform:nv1750_evcbcs",
            "outputFormat": "application/json",
            "srsName": "EPSG:4326",
            "bbox": MELBOURNE_BBOX
        }
    },
]


def download_wfs_data() -> Optional[gpd.GeoDataFrame]:
    """Try to download EVC data via WFS"""
    print("\n" + "=" * 60)
    print("STEP 1: Downloading EVC data from WFS")
    print("=" * 60)

    # Check cache first
    if CACHED_RAW_FILE.exists():
        print(f"\n✓ Using cached data: {CACHED_RAW_FILE}")
        return gpd.read_file(CACHED_RAW_FILE)

    CACHE_DIR.mkdir(exist_ok=True)

    # Try GeoPandas direct WFS read first
    print("\nMethod 1: GeoPandas WFS reader")
    try:
        wfs_url = f"WFS:https://opendata.maps.vic.gov.au/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=open-data-platform:nv1750_evcbcs&srsName=EPSG:4326&bbox={MELBOURNE_BBOX}"
        print(f"  Attempting direct WFS read...")
        gdf = gpd.read_file(wfs_url)
        if len(gdf) > 0:
            print(f"  ✓ Success! Got {len(gdf)} features")
            # Cache for future runs
            gdf.to_file(CACHED_RAW_FILE, driver="GPKG")
            return gdf
        else:
            print(f"  ✗ Empty response")
    except Exception as e:
        print(f"  ✗ Failed: {e}")

    # Fallback: HTTP requests
    for endpoint in WFS_ENDPOINTS:
        print(f"\nTrying: {endpoint['name']}")
        try:
            response = requests.get(
                endpoint['url'],
                params=endpoint['params'],
                timeout=180
            )

            if response.status_code == 200:
                try:
                    data = response.json()
                    if 'features' in data and len(data['features']) > 0:
                        print(f"  ✓ Success! Got {len(data['features'])} features")
                        gdf = gpd.GeoDataFrame.from_features(data['features'], crs="EPSG:4326")
                        gdf.to_file(CACHED_RAW_FILE, driver="GPKG")
                        return gdf
                except json.JSONDecodeError:
                    print(f"  ✗ Response is not JSON")
            else:
                print(f"  ✗ HTTP {response.status_code}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")

    return None


def prompt_manual_download():
    """Print instructions for manual download"""
    print("\n" + "=" * 60)
    print("MANUAL DOWNLOAD REQUIRED")
    print("=" * 60)
    print("""
All WFS endpoints failed. Please download the dataset manually:

OPTION 1: DataShare (recommended)
  1. Go to: https://datashare.maps.vic.gov.au/
  2. Search for "NV1750 EVCBCS" or "Native Vegetation Modelled 1750"
  3. Add to cart and checkout (free, requires registration)
  4. Download the Shapefile ZIP
  5. Extract and place in: {cache_dir}/
  6. Re-run this script

OPTION 2: Direct download
  1. Go to: https://discover.data.vic.gov.au/dataset/native-vegetation-modelled-1750-ecological-vegetation-classes
  2. Download the Shapefile
  3. Extract to: {cache_dir}/
  4. Re-run this script

After downloading, place the shapefile (.shp + associated files) in:
  {cache_dir}/

The script will detect it on the next run.
""".format(cache_dir=CACHE_DIR))


def find_local_shapefile() -> Optional[Path]:
    """Look for manually downloaded shapefile"""
    if not CACHE_DIR.exists():
        return None

    for f in CACHE_DIR.glob("*.shp"):
        if "nv1750" in f.name.lower() or "evc" in f.name.lower():
            return f

    # Also check for any .shp file
    shapefiles = list(CACHE_DIR.glob("*.shp"))
    if len(shapefiles) == 1:
        return shapefiles[0]

    return None


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


def clip_to_study_area(evc_gdf: gpd.GeoDataFrame, study_area: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Clip EVC data to study area boundary"""
    print("\n" + "=" * 60)
    print("STEP 2: Clipping to study area")
    print("=" * 60)

    # Ensure same CRS
    if evc_gdf.crs != study_area.crs:
        study_area = study_area.to_crs(evc_gdf.crs)

    # Get the study area polygon
    study_boundary = study_area.unary_union

    print(f"  Input features: {len(evc_gdf)}")

    # Clip
    clipped = gpd.clip(evc_gdf, study_boundary)

    print(f"  ✓ Clipped to {len(clipped)} features")
    return clipped


def identify_evc_columns(gdf: gpd.GeoDataFrame) -> Dict[str, str]:
    """Identify the correct column names for EVC data"""
    columns = {}

    # EVC number column
    for col in ['evc', 'EVC', 'evc_no', 'EVC_NO', 'x_evc', 'X_EVC']:
        if col in gdf.columns:
            columns['evc_number'] = col
            break

    # EVC name column
    for col in ['x_evcname', 'X_EVCNAME', 'evc_name', 'EVC_NAME', 'evcname']:
        if col in gdf.columns:
            columns['evc_name'] = col
            break

    # Bioregion column
    for col in ['bioregion', 'BIOREGION', 'x_bioregion', 'X_BIOREGION']:
        if col in gdf.columns:
            columns['bioregion'] = col
            break

    # BCS columns
    for col in ['evc_bcs', 'EVC_BCS', 'x_evcbcs', 'bcs']:
        if col in gdf.columns:
            columns['bcs'] = col
            break

    for col in ['evc_bcs_desc', 'EVC_BCS_DESC', 'bcs_desc', 'x_evcbcsdesc']:
        if col in gdf.columns:
            columns['bcs_desc'] = col
            break

    print(f"\n  Identified columns: {columns}")
    return columns


def add_vegetation_type_mapping(gdf: gpd.GeoDataFrame, col_map: Dict[str, str]) -> gpd.GeoDataFrame:
    """Add vegetation type based on EVC number"""
    print("\n" + "=" * 60)
    print("STEP 3: Adding vegetation type mapping")
    print("=" * 60)

    evc_col = col_map.get('evc_number')
    if not evc_col:
        print("  ERROR: Could not identify EVC number column")
        print(f"  Available columns: {list(gdf.columns)}")
        sys.exit(1)

    # Map vegetation types
    def get_veg_type(evc_num):
        try:
            evc_int = int(evc_num)
            return EVC_TO_VEGETATION_TYPE.get(evc_int, 'Unmapped')
        except (ValueError, TypeError):
            return 'Unmapped'

    gdf['vegetation_type'] = gdf[evc_col].apply(get_veg_type)

    # Count unmapped
    unmapped = gdf[gdf['vegetation_type'] == 'Unmapped']
    if len(unmapped) > 0:
        print(f"\n  ⚠ Found {len(unmapped)} features with unmapped EVC codes:")
        unmapped_evcs = unmapped[evc_col].unique()
        for evc in unmapped_evcs:
            evc_name_col = col_map.get('evc_name', evc_col)
            name = unmapped[unmapped[evc_col] == evc][evc_name_col].iloc[0] if evc_name_col in gdf.columns else 'Unknown'
            print(f"      EVC {evc}: {name}")

    mapped = gdf[gdf['vegetation_type'] != 'Unmapped']
    print(f"\n  ✓ Mapped {len(mapped)} features to vegetation types")
    print(f"  Unique vegetation types: {gdf['vegetation_type'].nunique()}")

    return gdf


def dissolve_and_explode(gdf: gpd.GeoDataFrame, col_map: Dict[str, str]) -> gpd.GeoDataFrame:
    """Dissolve same-EVC polygons, then explode by spatial contiguity"""
    print("\n" + "=" * 60)
    print("STEP 4: Dissolve and explode polygons")
    print("=" * 60)

    evc_col = col_map.get('evc_number')
    evc_name_col = col_map.get('evc_name', evc_col)
    bioregion_col = col_map.get('bioregion')
    bcs_col = col_map.get('bcs')
    bcs_desc_col = col_map.get('bcs_desc')

    print(f"  Input features: {len(gdf)}")

    # Make geometries valid
    gdf['geometry'] = gdf['geometry'].apply(lambda g: make_valid(g) if g is not None else g)

    # Build aggregation dict
    agg_dict = {
        'vegetation_type': 'first',
    }
    if evc_name_col and evc_name_col in gdf.columns:
        agg_dict[evc_name_col] = 'first'
    if bioregion_col and bioregion_col in gdf.columns:
        agg_dict[bioregion_col] = 'first'
    if bcs_col and bcs_col in gdf.columns:
        agg_dict[bcs_col] = 'first'
    if bcs_desc_col and bcs_desc_col in gdf.columns:
        agg_dict[bcs_desc_col] = 'first'

    # Dissolve by EVC number
    dissolved = gdf.dissolve(by=evc_col, aggfunc=agg_dict).reset_index()
    print(f"  After dissolve: {len(dissolved)} features")

    # Explode multipolygons to separate features
    exploded = dissolved.explode(index_parts=False).reset_index(drop=True)
    print(f"  After explode: {len(exploded)} features")

    return exploded


def remove_slivers(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Remove polygon slivers smaller than MIN_HECTARES"""
    print("\n" + "=" * 60)
    print("STEP 5: Removing slivers")
    print("=" * 60)

    print(f"  Input features: {len(gdf)}")

    # Calculate area in hectares (project to a metric CRS for accurate area)
    gdf_projected = gdf.to_crs('EPSG:28355')  # MGA Zone 55
    gdf['hectares'] = gdf_projected.geometry.area / 10000  # m² to hectares

    # Filter
    before = len(gdf)
    gdf = gdf[gdf['hectares'] >= MIN_HECTARES].copy()
    removed = before - len(gdf)

    print(f"  Removed {removed} slivers < {MIN_HECTARES} ha")
    print(f"  ✓ Remaining: {len(gdf)} features")

    return gdf


def simplify_geometry(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Simplify geometry for web performance"""
    print("\n" + "=" * 60)
    print("STEP 6: Simplifying geometry")
    print("=" * 60)

    original_size = gdf.to_json().__sizeof__()

    gdf['geometry'] = gdf['geometry'].simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)

    simplified_size = gdf.to_json().__sizeof__()
    reduction = (1 - simplified_size / original_size) * 100

    print(f"  Tolerance: {SIMPLIFY_TOLERANCE} degrees (~10m)")
    print(f"  ✓ Size reduced by {reduction:.1f}%")

    return gdf


def add_patch_ids(gdf: gpd.GeoDataFrame, col_map: Dict[str, str]) -> gpd.GeoDataFrame:
    """Add unique patch IDs to each feature"""
    print("\n" + "=" * 60)
    print("STEP 7: Adding patch IDs")
    print("=" * 60)

    evc_col = col_map.get('evc_number')

    # Sort by EVC and area for consistent ordering
    gdf = gdf.sort_values([evc_col, 'hectares'], ascending=[True, False]).reset_index(drop=True)

    # Add patch IDs
    patch_counts = {}
    patch_ids = []

    for idx, row in gdf.iterrows():
        evc = int(row[evc_col])
        patch_counts[evc] = patch_counts.get(evc, 0) + 1
        patch_ids.append(f"evc{evc}_patch{patch_counts[evc]}")

    gdf['patch_id'] = patch_ids

    print(f"  ✓ Added {len(gdf)} unique patch IDs")

    return gdf


def standardize_properties(gdf: gpd.GeoDataFrame, col_map: Dict[str, str]) -> gpd.GeoDataFrame:
    """Standardize property names for output"""
    print("\n" + "=" * 60)
    print("STEP 8: Standardizing properties")
    print("=" * 60)

    # Create output dataframe with standardized columns
    output_cols = {
        'patch_id': gdf['patch_id'],
        'evc_number': gdf[col_map['evc_number']].astype(int),
        'evc_name': gdf[col_map.get('evc_name', col_map['evc_number'])],
        'vegetation_type': gdf['vegetation_type'],
        'hectares': gdf['hectares'].round(2),
        'geometry': gdf['geometry'],
    }

    # Add optional columns if available
    if col_map.get('bioregion') and col_map['bioregion'] in gdf.columns:
        output_cols['bioregion'] = gdf[col_map['bioregion']]

    if col_map.get('bcs') and col_map['bcs'] in gdf.columns:
        output_cols['bcs'] = gdf[col_map['bcs']]

    if col_map.get('bcs_desc') and col_map['bcs_desc'] in gdf.columns:
        output_cols['bcs_desc'] = gdf[col_map['bcs_desc']]

    output_gdf = gpd.GeoDataFrame(output_cols, crs=gdf.crs)

    print(f"  ✓ Output columns: {list(output_gdf.columns)}")

    return output_gdf


def save_output(gdf: gpd.GeoDataFrame):
    """Save the final GeoJSON"""
    print("\n" + "=" * 60)
    print("STEP 9: Saving output")
    print("=" * 60)

    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Ensure WGS84
    if gdf.crs != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")

    # Save
    gdf.to_file(OUTPUT_FILE, driver='GeoJSON')

    file_size = OUTPUT_FILE.stat().st_size / 1024  # KB
    print(f"  ✓ Saved to: {OUTPUT_FILE}")
    print(f"  ✓ File size: {file_size:.1f} KB")


def print_report(gdf: gpd.GeoDataFrame):
    """Print verification report"""
    print("\n" + "=" * 60)
    print("VERIFICATION REPORT")
    print("=" * 60)

    print(f"\n1. Total features: {len(gdf)}")
    print(f"2. Unique EVC numbers: {gdf['evc_number'].nunique()}")
    print(f"3. Unique vegetation types: {gdf['vegetation_type'].nunique()}")

    # Check for unmapped
    unmapped = gdf[gdf['vegetation_type'] == 'Unmapped']
    if len(unmapped) > 0:
        print(f"\n⚠ WARNING: {len(unmapped)} features have unmapped EVC codes!")
        for evc in unmapped['evc_number'].unique():
            name = unmapped[unmapped['evc_number'] == evc]['evc_name'].iloc[0]
            count = len(unmapped[unmapped['evc_number'] == evc])
            print(f"   - EVC {evc}: {name} ({count} patches)")

    print("\n4. EVC Summary Table:")
    print("-" * 90)
    print(f"{'EVC':<6} {'EVC Name':<40} {'Vegetation Type':<25} {'Patches':<8} {'Hectares':<10}")
    print("-" * 90)

    summary = gdf.groupby(['evc_number', 'evc_name', 'vegetation_type']).agg({
        'patch_id': 'count',
        'hectares': 'sum'
    }).reset_index()
    summary.columns = ['evc_number', 'evc_name', 'vegetation_type', 'patches', 'total_ha']
    summary = summary.sort_values('evc_number')

    for _, row in summary.iterrows():
        evc_name = row['evc_name'][:38] if len(str(row['evc_name'])) > 38 else row['evc_name']
        veg_type = row['vegetation_type'][:23] if len(row['vegetation_type']) > 23 else row['vegetation_type']
        print(f"{row['evc_number']:<6} {evc_name:<40} {veg_type:<25} {row['patches']:<8} {row['total_ha']:.1f}")

    print("-" * 90)
    print(f"{'TOTAL':<6} {'':<40} {'':<25} {len(gdf):<8} {gdf['hectares'].sum():.1f}")

    print(f"\n5. Output file: {OUTPUT_FILE}")
    print(f"6. File size: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")
    print(f"7. CRS: {gdf.crs}")

    print("\n" + "=" * 60)
    print("✓ PROCESSING COMPLETE")
    print("=" * 60)


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("EVC BOUNDARY GEOJSON GENERATOR")
    print("=" * 60)

    # Try to load data
    evc_gdf = None

    # Check for cached data first
    if CACHED_RAW_FILE.exists():
        print(f"\nUsing cached data: {CACHED_RAW_FILE}")
        evc_gdf = gpd.read_file(CACHED_RAW_FILE)
    else:
        # Try WFS download
        evc_gdf = download_wfs_data()

    # Check for manually downloaded shapefile
    if evc_gdf is None:
        local_shp = find_local_shapefile()
        if local_shp:
            print(f"\nFound local shapefile: {local_shp}")
            evc_gdf = gpd.read_file(local_shp)
            # Cache it
            evc_gdf.to_file(CACHED_RAW_FILE, driver="GPKG")

    if evc_gdf is None:
        prompt_manual_download()
        sys.exit(1)

    print(f"\nLoaded {len(evc_gdf)} raw EVC features")
    print(f"Columns: {list(evc_gdf.columns)}")

    # Identify column mapping
    col_map = identify_evc_columns(evc_gdf)

    # Load study area and clip
    study_area = load_study_area()
    clipped = clip_to_study_area(evc_gdf, study_area)

    # Add vegetation type mapping
    mapped = add_vegetation_type_mapping(clipped, col_map)

    # Dissolve and explode
    dissolved = dissolve_and_explode(mapped, col_map)

    # Remove slivers
    cleaned = remove_slivers(dissolved)

    # Simplify geometry
    simplified = simplify_geometry(cleaned)

    # Add patch IDs
    with_ids = add_patch_ids(simplified, col_map)

    # Standardize properties
    final = standardize_properties(with_ids, col_map)

    # Save output
    save_output(final)

    # Print report
    print_report(final)


if __name__ == "__main__":
    main()
