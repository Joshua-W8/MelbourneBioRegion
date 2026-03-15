# Template Build Guide: Rauh's Model Acacia (Wattle)

Build guide for `template_rauh_acacia.tpf` -- a generic wattle template covering A. mearnsii (Black Wattle), A. melanoxylon (Blackwood), and A. pycnantha (Golden Wattle).

Full species brief: `docs/species-briefs/acacia-generic-wattle.md`
PlantFactory UI reference: `docs/plantfactory-ui-reference.md`

---

## Architecture: Iteration-Based Approach

PlantFactory's iteration nodes let us build the entire branching structure with minimal geometry nodes. Instead of separate nodes for Primary/Secondary/Tertiary/Twig, we use **Repeat + Next loops** so a single segment generates all branching levels.

### Iteration Node Types

| Node | Function | Found via |
|------|----------|-----------|
| **Repeat** | Opens a loop, sets iteration count | Tab key search or node menu |
| **Next** | Closes the loop (goes back to Repeat) | Tab key search |
| **Last** | Only executes on the LAST iteration | Tab key search |
| **End** | Moves up one loop level (for nested loops) | Tab key search |

### Key Principles

- **Repeat** goes BEFORE the segment it repeats
- **Next** connects as a CHILD of the segment (closing the loop)
- **Last** makes children grow only on the final branching level (for twigs/leaves)
- Each iteration node references the **closest previous Repeat** unless an **End** node shifts the reference up one level
- **Radius mode "Inherit"** (50-70%) gives natural taper per level
- **SAP curve** controls canopy shape -- affects scale and child count across iterations

---

## Target Node Graph

```
Root
 └── Trunk [Advanced Segment] -- "Branches"
      ├── Repeat ("Side Repeat") -- iterations: 5
      │    └── [loops back via Next]
      ├── Next [child of Trunk segment]
      ├── Last [child of Trunk segment]
      │    └── Twigs [Advanced Segment]
      │         └── Leaf [Leaf node or Warpboard]
      └── child tab "Side Branches" -- Number, Start, End, Angle, Arrangement
```

Minimal nodes: **1 Repeat + 1 Segment + 1 Next + 1 Last + 1 Twig Segment + 1 Leaf** = 6 geometry/flow nodes total (plus the 4 default system nodes).

---

## Prerequisites

Before starting, prepare these texture files:

**Leaf textures (512x512 each):**
- `tex_leaf_bipinnate_diffuse.png` + `tex_leaf_bipinnate_alpha.png` (A. mearnsii)
- `tex_leaf_phyllode_narrow_diffuse.png` + `tex_leaf_phyllode_narrow_alpha.png` (A. melanoxylon)
- `tex_leaf_phyllode_broad_diffuse.png` + `tex_leaf_phyllode_broad_alpha.png` (A. pycnantha)

**Bark texture (1024x1024, tileable):**
- `tex_bark_acacia_diffuse.png` (dark grey-brown, #3A2E26 base, longitudinal fissures)
- `tex_bark_acacia_normal.png` (vertical fissure relief, 10-15mm depth)

---

## Step 1: Create New Scene

1. Open PlantFactory.
2. **File > New** to create a fresh scene.
3. Default scene has 4 nodes: Age, Root, Season, Health.

---

## Step 2: Add the Branch Segment

This single segment will generate both the trunk and all branching levels via iteration.

1. Select the **Root** node.
2. Add a child: **New child > Advanced Segment**.
3. Rename to **"Branches"**.

### Branches > Segment tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Skin | Standard | |
| **Length** | 1.0 | ~1m per branch segment (SAP curve will scale across iterations) |
| Minimum length | 0 | |
| **Radius mode** | **Inherit clamp to radius** | Inherits from parent but caps at max |
| **Radius** | 0.125 | Max radius = trunk radius (metres) |
| **Inherit ratio** | 55% | Each level is 55% of parent radius |
| Minimum radius | 0.002 | Prevents last levels from being invisible |
| **Tropism** | 0.1 | Slight upward tendency |

> **Why "Inherit clamp to radius"?** The first iteration (trunk) gets clamped to 0.125m. Each subsequent iteration inherits 55% of the previous, giving natural taper: 0.125 → 0.069 → 0.038 → 0.021 → 0.011m.

---

## Step 3: Add the Repeat Node (Side Repeat)

The Repeat node goes BEFORE the Branches segment to create the branching loop.

1. Select the connection line between Root and Branches.
2. Press **Tab** to search, type **"Repeat"**.
3. Insert the Repeat node on the connection line.
4. Rename to **"Side Repeat"**.
5. Set **Iterations: 5** (1 trunk + 4 branching levels).

The graph should now be: `Root → Side Repeat → Branches`

---

## Step 4: Add the Next Node (Close the Loop)

1. Select the **Branches** segment node.
2. Add a child: press **Tab** or use **New child**, search for **"Next"**.
3. Connect the Next node as a child of Branches.

You should immediately see branches growing from the trunk. The loop is now:
`Side Repeat → Branches → Next → (back to Side Repeat)`

---

## Step 5: Configure the Side Branch Growth Rules

Now configure how children are distributed. Select the **Branches** node and click on the child tab that appeared (it may be called "1. Next" or similar -- this is the tab controlling how the Next loop reconnects).

Actually, the growth rules for side branches are on the **child tab for the Next node** on the Branches segment. Click the **"1. Next"** tab on the Branches node.

### DISTRIBUTION section:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Count mode | Fixed Value | |
| **Number** | 5 ± 1 | Children per branch (use ± for variation) |
| Start Mode | Relative | |
| **Start** | 0.3 | Branches start 30% up the parent |
| End Mode | Relative | |
| **End** | 0.95 | Stop near the tip |
| **Randomness** | 0.1 | Slight position variation |

### PLACEMENT section:

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Arrangement** | Lateral alternate (+90 R, Z) | Spiral phyllotaxis typical of Acacia |
| Positioning Method | Axis of the segment | |
| **Coil** | 90 ± 5 | Degrees between each branch around the axis |

### ORIENTATION section:

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Angle** | 50 ± 5 | Branch angle off parent axis |
| Min. angle with parent | 0 | |

### BLENDING:

Enable **Blending** with **Subdivision surfaces** checkbox for smooth branch junctions.

---

## Step 6: Set Up SAP Inheritance (Canopy Shape)

The SAP curve is the key to natural canopy shape. It reduces scale and child count from base to tip.

1. Select the **Branches** node.
2. Go to **Transformations** tab.
3. Set **SAP > Inherit** to **On**.
4. Go back to the child tab ("1. Next" or "1. Side Branches").
5. Look for the **SAP filter curve** -- edit it to create a shape where:
   - Base (left) is wider/taller (~0.8-1.0)
   - Top (right) tapers down (~0.2-0.4)
   - This means lower branches are longer with more children, upper branches are shorter with fewer

This creates the dome/umbrella canopy shape typical of Acacia.

---

## Step 7: Add Axis Perturbation (Natural Noise)

1. Select the **Branches** node.
2. Go to **Influences** tab.
3. Under **AXIS PERTURBATION**:

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Strength** | 0.2 | Subtle branch waviness |
| **Frequency** | 3 | Higher = finer noise |
| Make planar | 0 | |

---

## Step 8: Add Twigs and Leaves (Last Node)

Twigs and leaves should only appear on the final branching level. Use the **Last** node.

### Add the Last node:

1. Select the **Branches** node.
2. Add a child: search for **"Last"** (Tab key).
3. Connect the Last node as another child of Branches (alongside the Next node).

### Add the Twig segment:

1. Select the **Last** node (or connect as its child).
2. Add a child: **Advanced Segment**.
3. Rename to **"Twigs"**.

### Twigs > Segment tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Length | 0.06 | 4-6cm short twig |
| Radius mode | Inherit | |
| Inherit ratio | 50% | |
| Minimum radius | 0.001 | 1mm |

### Configure Twig placement on Branches' child tab:

On the Branches node, a new child tab appears for the Last/Twigs. Configure:

| Section | Parameter | Value |
|---------|-----------|-------|
| DISTRIBUTION | Number | 6 ± 2 |
| PLACEMENT | Arrangement | Lateral pair (+90) |
| ORIENTATION | Angle | 60 ± 10 |

### Add the Leaf node:

1. Select the **Twigs** node.
2. Add a child: **Leaf** (or **Warpboard** if Leaf doesn't suit).
3. Rename to **"Leaf"**.

### Leaf placement (on Twigs' child tab):

| Section | Parameter | Value |
|---------|-----------|-------|
| PLACEMENT | Positioning Method | Tip of the segment |
| ORIENTATION | Angle | 20 ± 10 |
| TROPISM | Rotation strength | 0.3 | Makes leaves more horizontal |

### Leaf node parameters:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Scale | 0.06 | ~6cm phyllode |

---

## Step 9: Create Bark Material

1. Select the **Branches** node > **Materials** tab.
2. Create a new material: **"mat_bark_acacia"**.
3. Load textures:
   - `tex_bark_acacia_diffuse.png` → Diffuse/Color
   - `tex_bark_acacia_normal.png` → Normal
4. Set Roughness: **0.85**, Metallic: **0.0**
5. UV mapping: Standard mode, V tiling = 1, check **Keep aspect ratio**.
6. Add slight **Twist** to hide obvious tiling.
7. This material automatically applies to all iterations (trunk + all branch levels).

---

## Step 10: Create Leaf Material

1. Select the **Leaf** node > **Materials** tab.
2. Create material: **"mat_leaf_phyllode_narrow"** (melanoxylon base).
3. Load textures:
   - `tex_leaf_phyllode_narrow_diffuse.png` → Diffuse/Color
   - `tex_leaf_phyllode_narrow_alpha.png` → Alpha
4. Set Backlight/Translucency: **0.25**.
5. Enable alpha testing/transparency.

---

## Step 11: Fine-Tune the Tree Shape

Adjust these parameters to dial in the Acacia silhouette:

| Adjustment | Where | What to change |
|------------|-------|---------------|
| Too sparse/dense | Branches child tab > Number | Increase/decrease children per level |
| Too tall/flat | Branches child tab > Angle | Lower angle = more upright, higher = more spreading |
| Unnatural taper | Branches > Segment > Inherit ratio | 50-70% range |
| Wrong canopy shape | Branches child tab > SAP filter curve | Reshape the curve |
| Too uniform | Branches child tab > Randomness, ± values | Add variation |
| Branches too straight | Branches > Influences > Axis Perturbation | Increase Strength |
| No gravity droop | Branches > Segment > Tropism | Positive values = droop |

---

## Step 12: Save and Create Variants

### Save base template:
```
~/Documents/e-on software/PlantFactory/Species/Personal/template_rauh_acacia_melanoxylon.tpf
```

### A. mearnsii variant:
1. Change Leaf material to `tex_leaf_bipinnate_*` textures
2. Backlight/Translucency: **0.35**
3. Branches > Segment > Length: reduce slightly (smaller tree)
4. Save As: `template_rauh_acacia_mearnsii.tpf`

### A. pycnantha variant:
1. Change Leaf material to `tex_leaf_phyllode_broad_*` textures
2. Backlight/Translucency: **0.20**
3. Branches > Segment > Length: reduce (5m tree)
4. Side Repeat iterations: **3** (fewer branching levels for smaller tree)
5. Leaf scale: **0.10** (larger phyllodes)
6. Save As: `template_rauh_acacia_pycnantha.tpf`

---

## Step 13: Verify and Export

Run verification script via **Scripts > Run Python File**:

```python
"""
Verify node indices for Acacia iteration template.
Run via Scripts > Run Python File.
Results at /tmp/pf_acacia_verify.txt
"""
import eon, os

OUT = "/tmp/pf_acacia_verify.txt"
R = []

def log(msg):
    R.append(str(msg))
    print(str(msg))

def save():
    with open(OUT, "w") as f:
        f.write("\n".join(R))

app = eon.EONApplication()
child = eon.EONChild()

TEMPLATE = "~/Documents/e-on software/PlantFactory/Species/Personal/template_rauh_acacia_melanoxylon.tpf"
child.LoadPlant(os.path.expanduser(TEMPLATE), 0)

log("=== Acacia Iteration Template -- Node Index Scan ===")
log(f"Template: {TEMPLATE}")

for i in range(20):
    try:
        node = child.GetNodeAt(i)
        log(f"  Index {i}: {node}")
    except:
        log(f"  Index {i}: (no node -- end of graph)")
        break
    save()

# Test key parameters on each discovered node
log("\n=== Parameter Probe ===")
for i in range(4, 20):
    try:
        node = child.GetNodeAt(i)
    except:
        break

    log(f"\n--- Node {i}: {node} ---")
    test_params = [
        ("Length", 1.0),
        ("Radius", 0.1),
        ("Inherit ratio", 50.0),
        ("Tropism", 0.0),
        ("Number", 5),
        ("Start", 0.3),
        ("End", 0.95),
        ("Angle", 50.0),
        ("Coil", 90.0),
        ("Randomness", 0.1),
        ("Scale", 0.06),
    ]
    for param, val in test_params:
        try:
            child.NodeSetParam(node, param, val)
            log(f"  '{param}' = {val} -> OK")
        except Exception as e:
            msg = str(e).split('\n')[0][:60]
            log(f"  '{param}' -> FAIL: {msg}")
        save()

log("\n=== DONE ===")
save()
log(f"Results at {OUT}")
```

---

## Species Parameter Quick Reference

| Parameter | Where | A. mearnsii | A. melanoxylon | A. pycnantha |
|-----------|-------|-------------|----------------|--------------|
| Side Repeat iterations | Repeat node | 5 | 5 | 3 |
| Segment Length | Branches > Segment | 0.8 | 1.0 | 0.6 |
| Segment Radius (max) | Branches > Segment | 0.125 | 0.20 | 0.08 |
| Inherit ratio | Branches > Segment | 55% | 55% | 60% |
| Children per level | Child tab > Number | 5 ± 1 | 5 ± 1 | 4 ± 1 |
| Branch Start | Child tab > Start | 0.35 | 0.40 | 0.25 |
| Branch Angle | Child tab > Angle | 50 ± 5 | 45 ± 5 | 60 ± 5 |
| Coil | Child tab > Coil | 90 ± 5 | 90 ± 5 | 90 ± 5 |
| Twig count | Last > Twigs child tab | 6 ± 2 | 6 ± 2 | 4 ± 1 |
| Leaf scale | Leaf node | 0.04 | 0.06 | 0.10 |
| Leaf material | Leaf > Materials | bipinnate | phyllode narrow | phyllode broad |
| Seed | Setup > Seed | 42 | 43 | 44 |
| Target polys | -- | ~25k | ~28k | ~13k |

---

## Node Graph Summary

```
Root
 ├── [Side Repeat] (iterations: 5)
 │    └── Branches [Advanced Segment]
 │         ├── child tab: "Side Branches"
 │         │   Distribution: Number=5, Start=0.3, End=0.95
 │         │   Placement: Lateral alternate, Coil=90
 │         │   Orientation: Angle=50
 │         │   SAP filter: taper curve for canopy shape
 │         │
 │         ├── [Next] → loops back to Side Repeat
 │         │
 │         └── [Last] → only on final iteration
 │              └── Twigs [Advanced Segment]
 │                   └── Leaf [Leaf/Warpboard]
 │
 ├── Age, Season, Health (system nodes)
```
