#!/usr/bin/env python3
"""
Fetch AusTraits data for Acacia species relevant to PlantFactory modelling.
Extracts dimensional and morphological traits needed to parameterize the
Rauh's model wattle template.

Usage: python3 scripts/plantfactory/fetch_acacia_traits.py
"""

import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path

AUSTRAITS_CSV = Path(__file__).resolve().parent.parent.parent / "trait_pipeline" / "austraits_data" / "traits.csv"
OUTPUT_FILE = Path(__file__).resolve().parent / "acacia_traits.json"

TARGET_SPECIES = [
    "Acacia mearnsii",
    "Acacia melanoxylon",
    "Acacia pycnantha",
]

# Traits relevant for PlantFactory parameterization
PLANTFACTORY_TRAITS = [
    # Dimensions
    "plant_height",
    "stem_diameter",           # DBH
    "crown_width",
    "crown_depth",
    # Leaf / phyllode
    "leaf_length",
    "leaf_width",
    "leaf_area",
    "specific_leaf_area",
    "leaf_mass_per_area",
    "leaf_inclination_angle",
    "leaf_thickness",
    # Branching
    "branch_angle",
    "branching_architecture",
    # Bark / wood
    "bark_thickness",
    "wood_density",
    # Growth form
    "plant_growth_form",
    "woodiness",
    "life_history",
    # Crown
    "crown_shape",
    "huber_value",             # sapwood area / leaf area ratio
    # Canopy
    "leaf_area_index",
    "canopy_height",
]


def load_traits():
    """Load AusTraits CSV and filter to target species + traits."""
    print(f"Loading AusTraits from {AUSTRAITS_CSV} ...")

    data = defaultdict(lambda: defaultdict(list))
    row_count = 0
    match_count = 0

    with open(AUSTRAITS_CSV, "r", encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_count += 1
            taxon = row.get("taxon_name", "").strip()
            trait = row.get("trait_name", "").strip()
            value = row.get("value", "").strip()

            if not taxon or not trait or not value:
                continue

            # Match target species (exact or starts with for subspecies)
            for sp in TARGET_SPECIES:
                if taxon == sp or taxon.startswith(sp + " "):
                    if trait in PLANTFACTORY_TRAITS:
                        data[sp][trait].append({
                            "value": value,
                            "taxon_matched": taxon,
                            "dataset_id": row.get("dataset_id", ""),
                            "unit": row.get("unit", ""),
                        })
                        match_count += 1
                    break

    print(f"  Scanned {row_count:,} rows, found {match_count} matching records")
    return data


def summarize_numeric(records):
    """Summarize numeric trait values."""
    values = []
    for r in records:
        try:
            values.append(float(r["value"]))
        except (ValueError, TypeError):
            continue

    if not values:
        return None

    result = {
        "mean": round(statistics.mean(values), 4),
        "median": round(statistics.median(values), 4),
        "min": round(min(values), 4),
        "max": round(max(values), 4),
        "n": len(values),
        "unit": records[0].get("unit", ""),
    }
    if len(values) > 1:
        result["stdev"] = round(statistics.stdev(values), 4)
    return result


def summarize_categorical(records):
    """Summarize categorical trait values."""
    from collections import Counter
    values = [r["value"] for r in records]
    counts = Counter(values)
    return {
        "values": dict(counts.most_common()),
        "most_common": counts.most_common(1)[0][0] if counts else None,
        "n": len(values),
    }


def summarize_trait(records):
    """Auto-detect numeric vs categorical and summarize."""
    # Try numeric first
    numeric_count = 0
    for r in records:
        try:
            float(r["value"])
            numeric_count += 1
        except (ValueError, TypeError):
            pass

    if numeric_count > len(records) * 0.5:
        return summarize_numeric(records)
    else:
        return summarize_categorical(records)


def generate_plantfactory_params(species_name, traits_summary):
    """
    Convert AusTraits summaries into PlantFactory parameter suggestions.
    Maps real botanical measurements to PF node parameters.
    """
    params = {"species": species_name, "notes": []}

    # Height -> Segment Length (total height / iteration count)
    h = traits_summary.get("plant_height")
    if h and isinstance(h, dict) and "mean" in h:
        height_m = h["mean"]
        iterations = 5 if height_m > 8 else 4 if height_m > 4 else 3
        params["total_height_m"] = height_m
        params["suggested_iterations"] = iterations
        params["segment_length"] = round(height_m / iterations, 3)
        params["notes"].append(
            f"Height {height_m}m / {iterations} iterations = {params['segment_length']}m per segment"
        )

    # Stem diameter -> Trunk radius
    dbh = traits_summary.get("stem_diameter")
    if dbh and isinstance(dbh, dict) and "mean" in dbh:
        dbh_m = dbh["mean"]
        # AusTraits DBH may be in mm or cm depending on dataset
        if dbh_m > 10:  # likely mm
            dbh_m = dbh_m / 1000
        elif dbh_m > 1:  # likely cm
            dbh_m = dbh_m / 100
        params["trunk_radius_m"] = round(dbh_m / 2, 4)
        params["notes"].append(
            f"DBH {dbh_m*100:.1f}cm -> trunk radius {params['trunk_radius_m']*100:.1f}cm"
        )

    # Crown width -> validate SAP curve spread
    cw = traits_summary.get("crown_width")
    if cw and isinstance(cw, dict) and "mean" in cw:
        params["crown_width_m"] = cw["mean"]
        if h and isinstance(h, dict) and "mean" in h:
            ratio = cw["mean"] / h["mean"]
            params["crown_width_to_height_ratio"] = round(ratio, 2)
            params["notes"].append(
                f"Crown width {cw['mean']}m, height {h['mean']}m, ratio {ratio:.2f}"
            )

    # Leaf dimensions -> Leaf node scale
    ll = traits_summary.get("leaf_length")
    lw = traits_summary.get("leaf_width")
    la = traits_summary.get("leaf_area")

    if ll and isinstance(ll, dict) and "mean" in ll:
        leaf_len = ll["mean"]
        # AusTraits leaf_length is typically in mm
        if leaf_len > 1:  # likely mm
            leaf_len_m = leaf_len / 1000
        else:
            leaf_len_m = leaf_len
        params["leaf_length_m"] = round(leaf_len_m, 4)
        params["leaf_scale_pf"] = round(leaf_len_m, 4)  # PF scale ~ metres
        params["notes"].append(
            f"Leaf/phyllode length {ll['mean']}mm -> PF scale {leaf_len_m:.4f}"
        )

    if lw and isinstance(lw, dict) and "mean" in lw:
        leaf_wid = lw["mean"]
        if leaf_wid > 1:
            leaf_wid_m = leaf_wid / 1000
        else:
            leaf_wid_m = leaf_wid
        params["leaf_width_m"] = round(leaf_wid_m, 4)
        params["notes"].append(f"Leaf/phyllode width {lw['mean']}mm")

    if la and isinstance(la, dict) and "mean" in la:
        params["leaf_area_mm2"] = la["mean"]

    # Branch angle
    ba = traits_summary.get("branch_angle")
    if ba and isinstance(ba, dict) and "mean" in ba:
        params["branch_angle_deg"] = ba["mean"]
        params["notes"].append(f"Branch angle {ba['mean']}° from AusTraits")

    # Wood density
    wd = traits_summary.get("wood_density")
    if wd and isinstance(wd, dict) and "mean" in wd:
        params["wood_density_kg_m3"] = wd["mean"]

    # Bark thickness
    bt = traits_summary.get("bark_thickness")
    if bt and isinstance(bt, dict) and "mean" in bt:
        params["bark_thickness_mm"] = bt["mean"]

    return params


def main():
    raw_data = load_traits()

    output = {}

    for sp in TARGET_SPECIES:
        print(f"\n{'='*60}")
        print(f"  {sp}")
        print(f"{'='*60}")

        sp_data = raw_data.get(sp, {})

        if not sp_data:
            print(f"  No AusTraits records found!")
            output[sp] = {"traits": {}, "plantfactory_params": {"species": sp, "notes": ["No data"]}}
            continue

        # Summarize each trait
        traits_summary = {}
        for trait_name, records in sorted(sp_data.items()):
            summary = summarize_trait(records)
            traits_summary[trait_name] = summary

            if isinstance(summary, dict) and "mean" in summary:
                print(f"  {trait_name}: mean={summary['mean']} {summary.get('unit','')} "
                      f"(n={summary['n']}, range={summary['min']}-{summary['max']})")
            elif isinstance(summary, dict) and "most_common" in summary:
                print(f"  {trait_name}: {summary['most_common']} (n={summary['n']})")

        # Generate PF parameters
        pf_params = generate_plantfactory_params(sp, traits_summary)

        print(f"\n  PlantFactory parameters:")
        for note in pf_params.get("notes", []):
            print(f"    -> {note}")

        output[sp] = {
            "traits": traits_summary,
            "plantfactory_params": pf_params,
        }

    # Save
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
