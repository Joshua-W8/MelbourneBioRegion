# Build Guide v2: Rauh's Model Acacia (Wattle)

Comprehensive build guide for `template_rauh_acacia.tpf` incorporating:
- Botanical brief (`docs/species-briefs/acacia-generic-wattle.md`)
- AusTraits measured data (`scripts/plantfactory/acacia_traits.json`)
- Red Currant production template patterns (23-node professional structure)
- PlantFactory API findings (`scripts/plantfactory/probe_results.txt`)

Target species: A. melanoxylon (base), A. mearnsii, A. pycnantha (variants).

---

## Architecture Overview

The Red Currant template taught us that professional PlantFactory trees use:
- **Explicit branching levels** (not just Repeat/Next loops)
- **Displace Axis** nodes for natural trunk curvature
- **Conditional/probability nodes** to prevent uniform growth
- **Radial + Multicurve** nodes for realistic leaf clustering
- **Separate materials** per element (bark, leaf, etc.)

We adapt this for Rauh's architectural model (monopodial trunk, rhythmic lateral branching).

---

## Target Node Graph

```
Root
 ├── Season, Health, Maturity (system nodes)
 │
 └── Trunk [Advanced Segment]
      │
      ├── Displace Axis ← natural trunk curvature
      │
      ├── [Repeat: "Main Loop"] iterations: 4-5
      │    └── Main Branches [Advanced Segment]
      │         │
      │         ├── child tab "1. Next": branch distribution + SAP curve
      │         ├── [Next] → loops back to Main Loop
      │         │
      │         ├── Likelyness to grow ← probability gate (suppress low branches)
      │         │    └── Secondary Branches [Advanced Segment]
      │         │         ├── child tab: finer sub-branching
      │         │         └── [Radial] → Twigs [Simple Segment]
      │         │              └── Leaf [Cutout Leaf / Warpboard]
      │         │
      │         └── [Last] → only final iteration
      │              └── Terminal Twigs [Simple Segment]
      │                   └── Leaf [Cutout Leaf / Warpboard]
      │
      └── (future: Flower pod pipeline, similar to Red Currant berry path)
```

**Node count: ~14-16** (vs our current 8, vs Red Currant's 23)

---

## Step-by-Step Build

### Step 1: Scene Setup

1. **File > New** — starts with Root, Age, Season, Health.
2. In **Setup** tab:

| Parameter | Value | Source |
|-----------|-------|--------|
| Seed | 43 | Arbitrary, change for variants |
| Age | 1.0 | Mature tree |

---

### Step 2: Trunk Segment

1. Select **Root** → New child → **Advanced Segment** → rename **"Trunk"**

#### Trunk > Segment tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Length | **3.0** | Trunk height before branching starts. Melanoxylon trunks clear 2-5m before crown |
| Radius mode | **Fixed** | Trunk radius is absolute, not inherited |
| Radius | **0.15** | 30cm DBH / 2 = 0.15m. AusTraits: no DBH data but brief says 20-50cm |
| Minimum radius | 0.01 | |
| Tropism | **0.02** | Very slight — trunks are mostly vertical |

#### Trunk > Influences tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Axis Perturbation Strength | **0.05** | Very subtle trunk sway |
| Frequency | **2** | Low frequency = broad curves |

---

### Step 3: Displace Axis (Trunk Curvature)

This is the key pattern from the Red Currant — adds natural lean/curve to the trunk that's separate from branch perturbation.

1. Select the connection between **Root** and **Trunk**
2. Press **Tab** → search **"Displace Axis"** (or "Displace")
3. Insert on the connection line

#### Displace Axis settings:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Strength | **0.1 - 0.15** | Subtle lean. Too much = drunk tree |
| Frequency | **1** | Single broad curve |

> **Why?** Real wattle trunks are never perfectly straight. They lean, bend toward light gaps, respond to prevailing wind. This single node eliminates the "telephone pole" look.

---

### Step 4: Repeat Node (Main Branching Loop)

1. Select **Trunk** node
2. Add child → press **Tab** → search **"Repeat"** → rename **"Main Loop"**
3. Set **Iterations: 5** for melanoxylon (4 for pycnantha, 5 for mearnsii)

---

### Step 5: Main Branches Segment

1. Select **Main Loop** → add child → **Advanced Segment** → rename **"Main Branches"**

#### Main Branches > Segment tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Length | **2.5** | AusTraits: 23.4m height / 5 iterations ≈ 4.7m, but Melbourne typical is 10-15m so **2.5m** |
| Radius mode | **Inherit clamp to radius** | |
| Radius | **0.12** | Max branch radius |
| Inherit ratio | **55%** | Natural taper: 0.12 → 0.066 → 0.036 → 0.020 → 0.011m |
| Minimum radius | **0.002** | 2mm |
| Tropism | **0.15** | Gravitropic droop — wattle branches sag under weight |

#### Main Branches > Influences tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Axis Perturbation Strength | **0.2 - 0.3** | Branch waviness — this is the big one for natural look |
| Frequency | **3** | Higher = finer wobble per branch |

---

### Step 6: Close the Loop (Next Node)

1. Select **Main Branches** → add child → **Tab** → search **"Next"**
2. The loop is now: Main Loop → Main Branches → Next → (back to Main Loop)

---

### Step 7: Configure Branch Distribution (SAP + Child Rules)

Select **Main Branches** node → click the **"1. Next"** child tab.

#### DISTRIBUTION:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Number | **5 ± 2** | ± is critical for natural look |
| Start | **0.3 ± 0.1** | Branches start 30% up, with variation |
| End | **0.95** | Near the tip |
| Randomness | **0.15 ± 0.05** | Position scatter |

#### PLACEMENT:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Arrangement | **Lateral alternate (+90° R, Z)** | Spiral phyllotaxis |
| Coil | **90° ± 20** | Degrees between branches. ± breaks regularity |

#### ORIENTATION:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Angle | **50° ± 15** | Wide spreading. ± is essential |
| Rotation | **0° ± 5** | |

#### SAP FILTER CURVE:

Click the SAP filter curve editor and create a **broad dome shape**:

| Keypoint | X | Y | Purpose |
|----------|---|---|---------|
| 1 | 0.00 | 0.15 | Base — minimal low branches |
| 2 | 0.15 | 0.40 | Lower crown starting |
| 3 | 0.45 | 0.95 | Mid crown — longest branches |
| 4 | 0.65 | 1.00 | Peak canopy width |
| 5 | 1.00 | 0.25 | Tip — shorter crown top |

Smooth the slopes (positive S-/S+ values ~0.3) for a rounded curve. This creates the characteristic **dome/umbrella canopy** wider than tall.

---

### Step 8: Probability Gate (Suppress Low Branches)

This is adapted from Red Currant's "Don't grow berrie stalks at the bottom" pattern.

1. Select **Main Branches** → add child → **Tab** → search **"Likelyness"** (or "Likelihood" or "Probability")
2. Rename **"Suppress Low Growth"**
3. Configure so secondary branches only appear above a certain height/iteration

> **Why?** Real wattles have clear trunks at the base. Without this, the iteration loop grows branches right from ground level. The probability gate creates that natural trunk clearance.

If you can't find a Likelyness node, an alternative is to set the **Start** parameter on child distribution to **0.4-0.5** so branches only begin partway up each segment.

---

### Step 9: Secondary Branches

Connected after the probability gate (or directly as another child of Main Branches).

1. Add **Advanced Segment** → rename **"Secondary Branches"**

#### Secondary Branches > Segment tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Length | **0.4 ± 0.1** | Short sub-branches |
| Radius mode | Inherit | |
| Inherit ratio | **45%** | Thinner than main branches |
| Minimum radius | 0.001 | |
| Tropism | **0.1** | |

#### Secondary Branches > Influences:

| Parameter | Value |
|-----------|-------|
| Axis Perturbation Strength | **0.15** |
| Frequency | **4** |

#### Child distribution (on Main Branches' tab for Secondary Branches):

| Parameter | Value |
|-----------|-------|
| Number | **3 ± 2** |
| Angle | **55° ± 15** |
| Arrangement | Lateral alternate |

---

### Step 10: Radial Node (Leaf Clustering)

Adapted from Red Currant's Radial → Multicurve → Leaf pattern. This creates natural phyllode clusters rather than individually-placed leaves.

1. Select **Secondary Branches** → add child → **Tab** → search **"Radial"**
2. This distributes children radially around the branch tip

If Radial isn't available, skip this and connect Twigs directly to Secondary Branches.

---

### Step 11: Terminal Twigs

1. Add **Simple Segment** (not Advanced — keeps it lightweight) → rename **"Twigs"**

#### Twigs > Segment tab:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Length | **0.06 ± 0.02** | 4-8cm. AusTraits phyllodes are 10cm, twigs slightly shorter |
| Radius mode | Inherit | |
| Inherit ratio | **40%** | |
| Minimum radius | **0.001** | 1mm |

#### Twig child distribution (on parent):

| Parameter | Value |
|-----------|-------|
| Number | **4 ± 2** |
| Arrangement | Lateral pair (+90) |
| Angle | **40° ± 20** |

---

### Step 12: Last Node (Final Iteration Leaves)

Also add leaves on the final main branch iteration:

1. Select **Main Branches** → add child → **Tab** → search **"Last"**
2. Connect Last → another **Simple Segment** ("Terminal Twigs 2") → Leaf
3. Same settings as Step 11

This ensures the outermost main branches also get foliage, not just the secondary branches.

---

### Step 13: Leaf Nodes

Use **Cutout Leaf** or **Warpboard** for the phyllode.

1. Select **Twigs** → add child → **Cutout Leaf** (or Warpboard) → rename **"Phyllode"**

#### Phyllode settings:

| Parameter | Value | Source |
|-----------|-------|--------|
| Scale | **0.105** | AusTraits: A. melanoxylon leaf_length = 105mm |
| Width-to-length ratio | ~0.17 | AusTraits: 18mm width / 105mm length |

#### Phyllode placement (on Twigs' child tab):

| Parameter | Value | Notes |
|-----------|-------|-------|
| Number | **6 ± 3** | Dense phyllode clusters |
| Arrangement | Lateral alternate | |
| Angle | **25° ± 15** | Fairly upright phyllodes |
| Positioning | Tip of segment + Along axis | Cluster at twig tips |

#### TROPISM (on leaf child tab):

| Parameter | Value | Notes |
|-----------|-------|-------|
| Rotation strength | **0.3** | Phyllodes twist to face the sun (heliotropic) |
| Cone Angle | **90 ± 15** | |

---

### Step 14: Materials

**7 materials** (following Red Currant's pattern of separate materials per element):

#### 1. Trunk Bark — apply to **Trunk** segment

| Property | Value |
|----------|-------|
| Color | Dark grey-brown (#3A2E26) |
| Roughness | 0.85 |
| Normal | Vertical fissure pattern, 10-15mm depth |
| Texture | `tex_bark_acacia_diffuse.png` (1024x1024, tileable) |

#### 2. Branch Bark — apply to **Main Branches**

| Property | Value |
|----------|-------|
| Color | Lighter grey-brown (#5A4E42) |
| Roughness | 0.75 |
| Note | Smoother than trunk, less fissured |

#### 3. Twig — apply to **Secondary Branches** and **Twigs**

| Property | Value |
|----------|-------|
| Color | Green-brown (#4A5A3A) |
| Roughness | 0.6 |
| Note | Young growth is greener |

#### 4. Phyllode (Leaf) — apply to **Phyllode** nodes

| Property | Value | Source |
|----------|-------|--------|
| Color | Medium green, sickle-shaped | Melanoxylon phyllode |
| Translucency/Backlight | **0.25** | |
| Alpha | Sickle/lanceolate mask | |
| Texture | `tex_leaf_phyllode_narrow_diffuse.png` (512x512) |

---

### Step 15: Fine-Tuning Checklist

After building, go through these adjustments:

| Issue | Fix | Where |
|-------|-----|-------|
| Tree too uniform/symmetric | Increase all **±** values | All child tabs |
| Branches too straight | Increase **Axis Perturbation Strength** | Main Branches > Influences |
| No trunk clearance | Increase **Start** on child tab or add probability gate | Main Branches > 1. Next |
| Canopy too narrow | Increase **Angle** on child tab | Main Branches > 1. Next |
| Canopy too sparse | Increase leaf **Number** | Twigs child tab |
| Canopy too dense | Reduce **Number** or increase **Start** | Child tabs |
| Branches don't droop | Increase **Tropism** on segment | Main Branches > Segment |
| Trunk too straight | Increase **Displace Axis** strength | Displace Axis node |
| Looks like a fractal | You need more **±** variation and **Randomness** | Everywhere |
| Too many polygons | Reduce iterations, leaf count, or use LOD stars | Setup / Meshing |

---

### Step 16: Species Variants

Save the base melanoxylon template, then create variants:

#### A. mearnsii (Black Wattle)

| Parameter | Change | Source |
|-----------|--------|--------|
| Height | 11.5m → Segment length **2.3m** | AusTraits |
| Iterations | **5** | Same |
| Trunk radius | **0.125** | Brief: 15-35cm DBH |
| Leaf type | **Bipinnate compound** — use Warpboard with feathery texture | AusTraits: tiny 12mm pinnules |
| Leaf scale | **0.10** (whole compound leaf ~10cm) | |
| Translucency | **0.35** | More light through feathery leaves |
| Seed | **42** | Different random seed |

#### A. pycnantha (Golden Wattle)

| Parameter | Change | Source |
|-----------|--------|--------|
| Height | 6.1m → Segment length **1.5m** | AusTraits |
| Iterations | **4** (smaller tree) | |
| Trunk radius | **0.08** | Brief: smaller trunk |
| Leaf scale | **0.127** | AusTraits: 127mm phyllodes, broadest species |
| Leaf width ratio | **~0.19** (24mm / 127mm) | AusTraits |
| Branch angle | **60° ± 10** | More spreading habit |
| Leaf Number | **4 ± 1** (fewer, bigger phyllodes) | |
| Translucency | **0.20** | Thicker phyllodes |
| Seed | **44** | |

---

### Step 17: Export

#### Verify with script:
Run `scripts/plantfactory/pf_acacia_verify.py` via Scripts > Run Python File (update paths to your saved .tpf).

#### Export as GLB:
1. **File > Export as Mesh** (or use Python API `ExportAsMesh`)
2. Format: **GLB** (binary glTF)
3. Target: `public/models/acacia_melanoxylon/mature.glb`
4. Polygon budget: **~25-30k** for web (check Meshing tab LOD settings)

#### Register in model manifest:
Update `public/data/model_manifest.json` and `model_registry.json` with the new species entry.

---

## Quick Reference: All ± Values

The single most important lesson: **every parameter needs ±**. Without it, your tree is a fractal.

| Parameter | Base | ± | Location |
|-----------|------|---|----------|
| Branch Number | 5 | **2** | Child tab > Distribution |
| Branch Start | 0.3 | **0.1** | Child tab > Distribution |
| Branch Angle | 50° | **15°** | Child tab > Orientation |
| Coil | 90° | **20°** | Child tab > Placement |
| Randomness | 0.15 | **0.05** | Child tab > Distribution |
| Twig Number | 4 | **2** | Twig child tab |
| Twig Angle | 40° | **20°** | Twig child tab |
| Leaf Number | 6 | **3** | Leaf child tab |
| Leaf Angle | 25° | **15°** | Leaf child tab |
| Segment Length | 2.5 | **0.3** (if available) | Segment tab |
| Twig Length | 0.06 | **0.02** | Segment tab |

---

## Key Lessons Learned

1. **Displace Axis** on the trunk eliminates the "telephone pole" look (from Red Currant)
2. **Probability/Likelyness gates** create natural trunk clearance (from Red Currant)
3. **Radial distribution** before leaves creates clusters, not individual placements (from Red Currant)
4. **Separate materials per element** — trunk bark ≠ branch bark ≠ twig (from Red Currant)
5. **SAP curve must be a broad dome**, not a spike (from hands-on building)
6. **± values on everything** — this is the #1 difference between "CG fractal" and "real tree" (from hands-on building)
7. **Axis Perturbation** on branches (Strength 0.2-0.3) breaks rigidity (from hands-on building)
8. **AusTraits data** grounds dimensions in reality — leaf scale 0.105, not a guess (from trait pipeline)
9. **API is template-based only** — build the graph in GUI, use Python only for param tweaks and export (from API probes)
10. **Explicit branching levels** (Trunk → Main → Secondary → Twig) give more control than pure iteration (from Red Currant)
