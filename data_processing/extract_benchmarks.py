#!/usr/bin/env python3
"""
Extract EVC benchmarks from filtered text files and add them to evc_benchmarks.json.

Reads VVP_EVCs_filtered.txt and GipP_EVCs_filtered.txt, parses each EVC benchmark,
and appends 18 new entries to the existing JSON following the evc_55 schema.
"""

import json
import re
import os
from collections import OrderedDict

# ── Paths ──────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
JSON_PATH = os.path.join(PROJECT_DIR, "public", "data", "evc_benchmarks.json")
VVP_PATH = os.path.join(BASE_DIR, "VVP_EVCs_filtered.txt")
GIPP_PATH = os.path.join(BASE_DIR, "GipP_EVCs_filtered.txt")

# ── Mappings ───────────────────────────────────────────────────────────────────

VVP_VEG_TYPES = {
    53:  "Freshwater wetlands",
    132: "Grasslands and Woodlands on fertile plains",
    897: "Grasslands and Woodlands on fertile plains",
    934: "Saltmarsh and coastal grasslands",
}

GIPP_VEG_TYPES = {
    3:   "Woodlands and heathlands on sand",
    9:   "Saltmarsh and coastal grasslands",
    56:  "River banks and creeklines",
    68:  "River banks and creeklines",
    83:  "River banks and creeklines",
    175: "Grasslands and Woodlands on fertile plains",
    300: "Freshwater wetlands",
    636: "Freshwater wetlands",
    641: "River banks and creeklines",
    656: "Freshwater wetlands",
    892: "Woodlands and heathlands on sand",
    895: "Woodlands and heathlands on sand",
    914: "Saltmarsh and coastal grasslands",
    921: "Coastal scrubs and dunes",
}

# VVP file uses sub-EVC notation; map file numbers → canonical EVC numbers
VVP_FILE_NUM_MAP = {
    "53":    53,
    "55_62": 132,
    "55_63": 897,
    "934":   934,
}
VVP_SKIP = {"55_61"}   # already exists as evc_55_victorian_volcanic_plain
GIPP_SKIP = {55}       # evc_55_gippsland_plain already exists

LIFE_FORM_NAMES = {
    "IT":  "Immature Canopy Tree",
    "T":   "Understorey Tree or Large Shrub",
    "MS":  "Medium Shrub",
    "SS":  "Small Shrub",
    "PS":  "Prostrate Shrub",
    "LH":  "Large Herb",
    "MH":  "Medium Herb",
    "SH":  "Small or Prostrate Herb",
    "LTG": "Large Tufted Graminoid",
    "LNG": "Large Non-tufted Graminoid",
    "MTG": "Medium to Small Tufted Graminoid",
    "MNG": "Medium to Tiny Non-tufted Graminoid",
    "GF":  "Ground Fern",
    "SC":  "Scrambler or Climber",
    "BL":  "Bryophytes/Lichens",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def split_evc_sections(text):
    """Split a file's text into merged text blocks keyed by file-level EVC number."""
    header_re = re.compile(r'^\s*EVC\s+(\d+(?:_\d+)?)\s*:\s*(.+?)$', re.MULTILINE)
    matches = list(header_re.finditer(text))
    if not matches:
        return {}

    evc_blocks = OrderedDict()
    for i, m in enumerate(matches):
        num = m.group(1).strip()
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk = text[start:end]

        if num not in evc_blocks:
            raw_name = m.group(2).strip()
            # Clean name: strip bioregion suffix and parenthetical notes
            clean = re.sub(r'\s*[-–]\s*(Victorian Volcanic Plain|Gippsland Plain).*', '', raw_name)
            clean = re.sub(r'\s*\(.*', '', clean).strip()
            evc_blocks[num] = {"name": clean, "text": ""}
        evc_blocks[num]["text"] += "\n" + chunk
    return evc_blocks


def extract_block(text, start_re, end_patterns):
    """Return text between start_re and the nearest end_pattern (or EOF)."""
    m = re.search(start_re, text, re.MULTILINE)
    if not m:
        return None
    s = m.end()
    end = len(text)
    for ep in end_patterns:
        m2 = re.search(ep, text[s:], re.MULTILINE)
        if m2:
            end = min(end, s + m2.start())
    return text[s:end].strip()


NEXT_SECTION = [
    r'^\s*(?:Large [Tt]rees)',
    r'^\s*Tree Canopy Cover:',
    r'^\s*Canopy Cover:',
    r'^\s*(?:Understorey|Life [Ff]orms):',
    r'^\s*LF Code',
    r'^\s*Recruitment:',
    r'^\s*Organic Litter:',
    r'^\s*Logs:',
    r'^\s*Weediness:',
    r'^\s*Published by',
    r'^\s*Ecological Vegetation Class',
    r'^\s*EVC\s+\d+',
    r'^\s*©',
]


def parse_description(text):
    block = extract_block(text, r'Description:\s*\n', NEXT_SECTION)
    if not block:
        return None
    # Collapse whitespace
    return re.sub(r'\s+', ' ', block).strip()


def height_from_description(desc):
    if not desc:
        return None
    m = re.search(r'to\s+(\d+)\s*m\s+tall', desc)
    return int(m.group(1)) if m else None


def parse_large_trees(text):
    block = extract_block(
        text,
        r'Large [Tt]rees\+?:\s*\n',
        [r'^\s*(?:Tree )?Canopy Cover:', r'^\s*(?:Understorey|Life [Ff]orms):',
         r'^\s*LF Code', r'^\s*Recruitment:', r'^\s*EVC\s+\d+',
         r'^\s*Ecological', r'^\s*Weediness:']
    )
    if not block:
        return None

    genus = None
    dbh = None
    density = None
    for line in block.split('\n'):
        line = line.strip()
        m = re.match(r'(.+?)\s{2,}(\d+)\s*cm(?:\s+(\d+)\s*/\s*ha)?', line)
        if m:
            if genus is None:
                genus = m.group(1).strip()
            val = int(m.group(2))
            if dbh is None or val > dbh:
                dbh = val
            if m.group(3) and density is None:
                density = int(m.group(3))

    if genus and dbh is not None:
        result = OrderedDict([("genus", genus), ("dbh_cm", dbh)])
        if density is not None:
            result["density_per_ha"] = density
        return result
    return None


def parse_canopy(text):
    block = extract_block(
        text,
        r'(?:Tree )?Canopy Cover:\s*\n',
        [r'^\s*(?:Understorey|Life [Ff]orms):', r'^\s*LF Code',
         r'^\s*Recruitment:', r'^\s*Ecological', r'^\s*EVC\s+\d+']
    )
    if not block:
        return None

    cover_pct = None
    species = []
    for line in block.split('\n'):
        line = line.strip()
        if not line or line.startswith('%cover') or line.startswith('Character'):
            continue
        # Line with cover: "10%  Eucalyptus camaldulensis   River Red Gum"
        m = re.match(r'(\d+)%\s+(.+?)\s{2,}(.+)', line)
        if m:
            cover_pct = int(m.group(1))
            species.append(OrderedDict([
                ("scientific_name", m.group(2).strip()),
                ("common_name", m.group(3).strip())
            ]))
        else:
            # Additional species line without %: "   Eucalyptus ovata    Swamp Gum"
            m2 = re.match(r'(.+?)\s{2,}(.+)', line)
            if m2:
                sci = m2.group(1).strip()
                com = m2.group(2).strip()
                if sci and not sci.startswith('#') and not sci.startswith('%'):
                    species.append(OrderedDict([
                        ("scientific_name", sci),
                        ("common_name", com)
                    ]))

    if cover_pct is not None:
        return OrderedDict([("cover_pct", cover_pct), ("character_species", species)])
    return None


def parse_understorey(text):
    block = extract_block(
        text,
        r'(?:Understorey|Life [Ff]orms):\s*\n\s*(?:Life\s*form|Lifeform).*?(?:LF\s*[Cc]ode|LF code)\s*\n',
        [r'^\s*LF Code', r'^\s*Total', r'^\s*$\n\s*$\n',
         r'^\s*Ecological', r'^\s*EVC\s+\d+', r'^\s*Recruitment:',
         r'^\s*Weediness:', r'^\s*Published']
    )
    if not block:
        return []

    rows = []
    for line in block.split('\n'):
        line = line.strip()
        if not line or line.startswith('Total'):
            continue
        # Match: "Life form name   [#spp]   cover%   CODE"
        m = re.match(r'(.+?)\s{2,}(?:(\d+|na)\s+)?(\d+)%\s+([\w/]+)', line)
        if m:
            lf_raw = m.group(1).strip().rstrip('+')
            spp_raw = m.group(2)
            cover = int(m.group(3))
            code = m.group(4).strip()

            # Normalize code
            if code == "S/C":
                code = "SC"
                lf_name = "Soil Crust"
            elif code in LIFE_FORM_NAMES:
                lf_name = LIFE_FORM_NAMES[code]
            else:
                lf_name = lf_raw

            num_spp = None
            if spp_raw and spp_raw.strip().lower() not in ('na', 'n/a', ''):
                try:
                    num_spp = int(spp_raw.strip())
                except ValueError:
                    pass

            rows.append(OrderedDict([
                ("life_form", lf_name),
                ("code", code),
                ("num_species", num_spp),
                ("cover_pct", cover)
            ]))
    return rows


def parse_typical_species(text):
    block = extract_block(
        text,
        r'LF Code\s+Species typical.*?Common Name\s*\n',
        [r'^\s*Recruitment:', r'^\s*Organic Litter:', r'^\s*Weediness:',
         r'^\s*Published', r'^\s*Ecological', r'^\s*EVC\s+\d+',
         r'^\s*$\n\s*$\n\s*$']
    )
    if not block:
        return []

    species = []
    for line in block.split('\n'):
        line = line.strip()
        if not line:
            continue
        # Match: "CODE  [junk_char] scientific_name   common_name"
        m = re.match(r'([A-Z]{1,3}(?:/[A-Z])?)\s{2,}\s*[a-z]?\s*(.+?)\s{2,}(.+)', line)
        if m:
            code = m.group(1).strip()
            if code == "S/C":
                code = "SC"
            sci = m.group(2).strip()
            com = m.group(3).strip()
            species.append(OrderedDict([
                ("code", code),
                ("scientific_name", sci),
                ("common_name", com)
            ]))
    return species


def parse_recruitment(text):
    m = re.search(r'Recruitment:\s*\n\s*(.+?)\.?\s*(?:\n|$)', text)
    if m:
        val = m.group(1).strip().rstrip('.')
        # Capitalize first letter
        return val[0].upper() + val[1:] if val else None
    return None


def parse_organic_litter(text):
    m = re.search(r'Organic Litter:\s*\n\s*(\d+)\s*%', text)
    return int(m.group(1)) if m else None


def parse_logs(text):
    m = re.search(r'Logs:\s*\n\s*(\d+)\s*m\s*/', text)
    return int(m.group(1)) if m else None


def build_entry(evc_number, evc_name, bioregion, vegetation_type, merged_text):
    """Parse merged text and build a JSON entry dict."""
    desc = parse_description(merged_text)
    height = height_from_description(desc)
    canopy = parse_canopy(merged_text)
    large_trees = parse_large_trees(merged_text)
    understorey = parse_understorey(merged_text)
    typical_species = parse_typical_species(merged_text)
    recruitment = parse_recruitment(merged_text)
    organic_litter = parse_organic_litter(merged_text)
    logs = parse_logs(merged_text)

    entry = OrderedDict()
    entry["evc_number"] = evc_number
    entry["evc_name"] = evc_name
    entry["bioregion"] = bioregion
    entry["vegetation_type"] = vegetation_type
    entry["description"] = desc

    if canopy:
        c = OrderedDict()
        if height:
            c["height_m"] = height
        c["cover_pct"] = canopy["cover_pct"]
        c["character_species"] = canopy["character_species"]
        entry["canopy"] = c

    if large_trees:
        entry["large_trees"] = large_trees

    entry["understorey"] = understorey
    entry["typical_species"] = typical_species

    gs = OrderedDict()
    if organic_litter is not None:
        gs["organic_litter_pct"] = organic_litter
    if logs is not None:
        gs["logs_m_per_0_1_ha"] = logs
    if gs:
        entry["ground_surface"] = gs

    if recruitment:
        entry["recruitment"] = recruitment

    return entry


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # Load existing JSON
    with open(JSON_PATH, 'r') as f:
        data = json.load(f, object_pairs_hook=OrderedDict)

    added = []
    skipped = []

    # ── Process VVP ────────────────────────────────────────────────────────
    with open(VVP_PATH, 'r') as f:
        vvp_text = f.read()

    vvp_sections = split_evc_sections(vvp_text)

    for file_num, info in vvp_sections.items():
        if file_num in VVP_SKIP:
            continue
        if file_num not in VVP_FILE_NUM_MAP:
            continue

        canonical = VVP_FILE_NUM_MAP[file_num]
        key = f"evc_{canonical}_victorian_volcanic_plain"

        if key in data:
            skipped.append((key, "already exists"))
            continue

        entry = build_entry(
            evc_number=canonical,
            evc_name=info["name"],
            bioregion="Victorian Volcanic Plain",
            vegetation_type=VVP_VEG_TYPES[canonical],
            merged_text=info["text"],
        )
        data[key] = entry
        added.append(key)

    # ── Process GipP ───────────────────────────────────────────────────────
    with open(GIPP_PATH, 'r') as f:
        gipp_text = f.read()

    gipp_sections = split_evc_sections(gipp_text)

    for file_num, info in gipp_sections.items():
        try:
            canonical = int(file_num)
        except ValueError:
            continue
        if canonical in GIPP_SKIP:
            continue
        if canonical not in GIPP_VEG_TYPES:
            continue

        key = f"evc_{canonical}_gippsland_plain"

        if key in data:
            skipped.append((key, "already exists"))
            continue

        entry = build_entry(
            evc_number=canonical,
            evc_name=info["name"],
            bioregion="Gippsland Plain",
            vegetation_type=GIPP_VEG_TYPES[canonical],
            merged_text=info["text"],
        )
        data[key] = entry
        added.append(key)

    # Report EVCs requested but not found in text files
    missing_gipp = []
    for num in GIPP_VEG_TYPES:
        key = f"evc_{num}_gippsland_plain"
        if key not in data:
            missing_gipp.append(num)

    # ── Write updated JSON ─────────────────────────────────────────────────
    with open(JSON_PATH, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    # ── Verification summary ───────────────────────────────────────────────
    print("=" * 110)
    print("EVC Benchmark Extraction — Summary")
    print("=" * 110)
    print(f"\n{'Key':<48} {'EVC#':<7} {'Bioregion':<26} {'Vegetation Type':<38} {'Spp':<5}")
    print("-" * 110)

    for k, v in data.items():
        if k == "_meta":
            continue
        n_spp = len(v.get("typical_species", []))
        n_us = len(v.get("understorey", []))
        marker = " *" if k in added else ""
        print(f"{k:<48} {v['evc_number']:<7} {v['bioregion']:<26} {v['vegetation_type']:<38} {n_spp:<5}{marker}")

    print("-" * 110)
    total = sum(1 for k in data if k != "_meta")
    print(f"\nTotal entries: {total}  (added: {len(added)}, skipped: {len(skipped)})")
    if skipped:
        print(f"Skipped: {', '.join(k for k, _ in skipped)}")
    if missing_gipp:
        print(f"Not found in text files (GipP): EVC {', '.join(str(n) for n in sorted(missing_gipp))}")

    # Per-entry detail check
    print(f"\n{'Key':<48} {'Desc':<6} {'Can':<5} {'LgT':<5} {'Und':<5} {'TSp':<5} {'Lit':<5} {'Log':<5} {'Rec':<12}")
    print("-" * 110)
    for k in added:
        v = data[k]
        print(
            f"{k:<48} "
            f"{'✓' if v.get('description') else '✗':<6} "
            f"{'✓' if v.get('canopy') else '–':<5} "
            f"{'✓' if v.get('large_trees') else '–':<5} "
            f"{len(v.get('understorey', [])):<5} "
            f"{len(v.get('typical_species', [])):<5} "
            f"{'✓' if v.get('ground_surface', {}).get('organic_litter_pct') is not None else '✗':<5} "
            f"{'✓' if v.get('ground_surface', {}).get('logs_m_per_0_1_ha') is not None else '–':<5} "
            f"{v.get('recruitment', '–'):<12}"
        )
    print("=" * 110)


if __name__ == "__main__":
    main()
