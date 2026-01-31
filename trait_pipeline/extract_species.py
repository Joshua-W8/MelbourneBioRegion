#!/usr/bin/env python3
"""
Extract species data from ARI Pre-colonial Plant List PDF.

Reads Table 4 (pages 19-32) from the PDF and creates:
- species_by_vegetation_type.json (grouped by vegetation type and prominence)
- species_diorama.json (all species with codes 3.1+)
- species_prominent.json (species with code 3.2)
- species_plantlist.json (all species with codes 2.1+)

Usage:
    python3 extract_species.py
"""

import json
from pathlib import Path
import re

# The 12 vegetation types (in order as they appear in PDF table columns)
VEGETATION_TYPES = [
    "Beach and Dunes",
    "Saltmarsh",
    "Coastal marshlands and brackish flats",
    "Swamp scrub",
    "Woodlands and heathlands on sand",
    "Woodlands and forests on sedimentary hills",
    "Grasslands and Woodlands on fertile plains",
    "Cliffs and escarpments",
    "River banks and creeklines",
    "Wet heathland",
    "Freshwater wetland",
    "Saltwater wetland"
]


def parse_pdf_with_pdfplumber():
    """
    Extract table data from PDF using pdfplumber.
    Returns list of species dictionaries.
    """
    try:
        import pdfplumber
    except ImportError:
        print("Error: pdfplumber not installed")
        print("Install it with: pip install pdfplumber --break-system-packages")
        return None

    pdf_path = Path(__file__).parent.parent / 'ari_plant_list.pdf'

    if not pdf_path.exists():
        print(f"Error: PDF not found at {pdf_path}")
        return None

    print(f"Reading PDF: {pdf_path}")

    all_species = []

    # Table 4 spans pages 19-32 (PDF pages 19-32, index 18-31)
    with pdfplumber.open(pdf_path) as pdf:
        for page_num in range(18, 32):  # Pages 19-32 in PDF (0-indexed)
            print(f"Processing page {page_num + 1}...")

            page = pdf.pages[page_num]
            tables = page.extract_tables()

            if not tables:
                continue

            # The main table should be the first/largest table on each page
            table = tables[0]

            # Skip header rows
            for row in table[1:]:  # Skip first row (header)
                if not row or not row[0]:  # Skip empty rows
                    continue

                species_name = row[0].strip() if row[0] else None

                if not species_name or species_name == 'Species':  # Skip header repeats
                    continue

                # Extract data
                species_dict = {
                    'species': species_name,
                    'common_name': row[1].strip() if len(row) > 1 and row[1] else '',
                    'certain': bool(row[2]) if len(row) > 2 and row[2] else False,
                    'codes': {}
                }

                # Extract codes for each vegetation type (columns 3-14)
                for i, veg_type in enumerate(VEGETATION_TYPES):
                    col_idx = i + 3  # Codes start at column index 3

                    if col_idx < len(row) and row[col_idx]:
                        code_str = str(row[col_idx]).strip()

                        # Parse code (could be 0, 1, 2.1, 2.2, 3.1, 3.2)
                        try:
                            if '.' in code_str:
                                code = float(code_str)
                            else:
                                code = int(code_str)

                            species_dict['codes'][veg_type] = code
                        except ValueError:
                            species_dict['codes'][veg_type] = 0
                    else:
                        species_dict['codes'][veg_type] = 0

                # Calculate "most likely occurrence" (highest code across all veg types)
                max_code = max(species_dict['codes'].values()) if species_dict['codes'] else 0
                species_dict['most_likely_occurrence'] = max_code

                all_species.append(species_dict)

    print(f"Extracted {len(all_species)} species from PDF")
    return all_species


def create_species_by_vegetation_type(all_species):
    """
    Group species by vegetation type and prominence code.

    Returns dict with structure:
    {
        "Vegetation Type": {
            "prominent": [species with code 3.2],
            "present": [species with code 3.1]
        }
    }
    """
    result = {}

    for veg_type in VEGETATION_TYPES:
        prominent = []
        present = []

        for species in all_species:
            code = species['codes'].get(veg_type, 0)

            if code == 3.2:
                prominent.append({
                    'species': species['species'],
                    'common_name': species['common_name'],
                    'code': 3.2
                })
            elif code == 3.1:
                present.append({
                    'species': species['species'],
                    'common_name': species['common_name'],
                    'code': 3.1
                })

        result[veg_type] = {
            'prominent': prominent,
            'present': present
        }

    return result


def create_diorama_species(all_species):
    """Species with codes 3.1+ (for 3D dioramas)."""
    return [
        {
            'species': s['species'],
            'common_name': s['common_name'],
            'most_likely_occurrence': s['most_likely_occurrence'],
            'certain': s['certain']
        }
        for s in all_species
        if s['most_likely_occurrence'] >= 3.1
    ]


def create_prominent_species(all_species):
    """Species with code 3.2 (prominent/visual anchors)."""
    return [
        {
            'species': s['species'],
            'common_name': s['common_name'],
            'certain': s['certain']
        }
        for s in all_species
        if s['most_likely_occurrence'] == 3.2
    ]


def create_plantlist_species(all_species):
    """Species with codes 2.1+ (for plant lists)."""
    return [
        {
            'species': s['species'],
            'common_name': s['common_name'],
            'most_likely_occurrence': s['most_likely_occurrence'],
            'certain': s['certain']
        }
        for s in all_species
        if s['most_likely_occurrence'] >= 2.1
    ]


def main():
    """Main execution function."""

    print("=" * 60)
    print("ARI Species Data Extraction")
    print("=" * 60)

    # Extract species from PDF
    all_species = parse_pdf_with_pdfplumber()

    if not all_species:
        print("\nERROR: Could not extract species data from PDF")
        print("\nAlternative: Use the Melbourne Open Data CSV version")
        print("Download from: https://data.melbourne.vic.gov.au/")
        return

    # Create output directory
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)

    # Generate all output files
    print("\nGenerating output files...")

    # 1. Species by vegetation type (main file for scene generation)
    species_by_veg = create_species_by_vegetation_type(all_species)
    output_path = output_dir / 'species_by_vegetation_type.json'
    with open(output_path, 'w') as f:
        json.dump(species_by_veg, f, indent=2)
    print(f"✓ Created: {output_path}")

    # Print summary
    for veg_type, data in species_by_veg.items():
        prominent_count = len(data['prominent'])
        present_count = len(data['present'])
        print(f"  {veg_type}: {prominent_count} prominent, {present_count} present")

    # 2. Diorama species (3.1+)
    diorama_species = create_diorama_species(all_species)
    output_path = output_dir / 'species_diorama.json'
    with open(output_path, 'w') as f:
        json.dump(diorama_species, f, indent=2)
    print(f"\n✓ Created: {output_path} ({len(diorama_species)} species)")

    # 3. Prominent species (3.2)
    prominent_species = create_prominent_species(all_species)
    output_path = output_dir / 'species_prominent.json'
    with open(output_path, 'w') as f:
        json.dump(prominent_species, f, indent=2)
    print(f"✓ Created: {output_path} ({len(prominent_species)} species)")

    # 4. Plant list species (2.1+)
    plantlist_species = create_plantlist_species(all_species)
    output_path = output_dir / 'species_plantlist.json'
    with open(output_path, 'w') as f:
        json.dump(plantlist_species, f, indent=2)
    print(f"✓ Created: {output_path} ({len(plantlist_species)} species)")

    # 5. Statistics
    stats = {
        'total_species': len(all_species),
        'diorama_species_3.1+': len(diorama_species),
        'prominent_species_3.2': len(prominent_species),
        'plantlist_species_2.1+': len(plantlist_species),
        'certain_species': sum(1 for s in all_species if s['certain']),
        'by_vegetation_type': {
            veg_type: {
                'prominent_3.2': len(data['prominent']),
                'present_3.1': len(data['present'])
            }
            for veg_type, data in species_by_veg.items()
        }
    }

    output_path = output_dir / 'statistics.json'
    with open(output_path, 'w') as f:
        json.dump(stats, f, indent=2)
    print(f"✓ Created: {output_path}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total species extracted: {stats['total_species']}")
    print(f"Diorama species (3.1+): {stats['diorama_species_3.1+']}")
    print(f"Prominent species (3.2): {stats['prominent_species_3.2']}")
    print(f"Plant list species (2.1+): {stats['plantlist_species_2.1+']}")
    print(f"Certain historical records: {stats['certain_species']}")
    print("\n✓ All files created successfully!")


if __name__ == '__main__':
    main()
