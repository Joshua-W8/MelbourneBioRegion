# PlantFactory 2024 -- UI Parameter Reference

Confirmed by screenshots and tutorial transcripts (March 2026).

---

## Iteration Nodes (Flow Control)

These are the key to efficient tree modelling. Found via **Tab key search** on connection lines or in node menus.

| Node | Function | Notes |
|------|----------|-------|
| **Repeat** | Opens a loop, sets iteration count | Place BEFORE the segment to repeat |
| **Next** | Closes the loop (goes back to Repeat) | Connect as CHILD of the segment |
| **Last** | Only executes on the LAST iteration | Use for twigs/leaves on final branch level |
| **All but last** | Executes on all iterations EXCEPT the last | |
| **End** | Shifts loop reference up one level | For nested loops only |
| **Iteration End** | Outputs 0-1 value for current iteration | For varying params across levels. Only works in non-nested loops |

### Loop Structure
```
Root → [Repeat (N iterations)] → Segment → [Next] (loops back)
                                        └── [Last] → Twigs/Leaves (only on final iteration)
```

### Nested Loops
```
Root → [Split Repeat (2)] → [Side Repeat (5)] → Segment → [Next] (inner loop)
                                                        └── [End] (exits inner loop)
                                                             └── [Next] (outer loop)
                                                             └── [Last] → Twigs (last of outer)
```

### Key Rule
Each iteration node references the **closest previous Repeat** going backwards in the graph. An **End** node shifts references up one level.

---

## Geometry Node Types (Add Children menu)

| Node Type | Description |
|-----------|-------------|
| **Simple Segment** | Basic trunk/branch geometry |
| **Advanced Segment** | Segment with recursive depth control |
| AutoGrowth | Automatic branching growth |
| **Leaf** | Leaf geometry |
| Cutout Leaf | Leaf with cutout shape |
| **Warpboard** | Flat billboard/card geometry |
| **Object** | External mesh import |
| **Urchin** | Radial spike arrangement |
| **Hydra** | Multi-headed arrangement |
| **Ball** | Spherical arrangement |
| Flower | Flower geometry |
| Instantiation | Instance of another component |

---

## Key Architecture Concept

**Child distribution parameters live on the PARENT node, not the child.**

When you add a child node (e.g., Advanced Segment) to a parent (e.g., Trunk), a new tab appears on the parent node named "1. Advanced Segment" (or "1. [child name]"). This tab contains:
- DISTRIBUTION: Number, Start, End, Arrangement
- PLACEMENT: Arrangement, Positioning Method, Move out, Roll, Coil
- ORIENTATION: Angle, Rotation
- TROPISM: Direction, Cone Angle
- PRUNING, BLENDING, INFLUENCE ON SEGMENT, INHERITED PROPERTIES

The child node itself only controls its own geometry (Length, Radius, Tropism, etc.).

---

## Simple Segment / Advanced Segment Parameters

### Segment tab

| Section | Parameter | Type | Default | Notes |
|---------|-----------|------|---------|-------|
| SEGMENT | Skin | dropdown | Standard | |
| SEGMENT | **Length** | slider | 10 | Segment length in metres |
| SEGMENT | Minimum length | slider | 0 | |
| SEGMENT | **Radius mode** | dropdown | Inherit | Options: Inherit, Fixed, ... |
| SEGMENT | Radius | slider | (greyed if Inherit) | Direct radius in metres |
| SEGMENT | **Inherit ratio** | slider | 50% | When Radius mode = Inherit |
| SEGMENT | Minimum radius | slider | 0 | |
| SEGMENT | **Tropism** | slider | 0 | Gravity response |
| SEGMENT | Section | gear icon | | Cross-section shape |
| CAP | Mode | dropdown | Cut & top | |
| CAP | Cap profile | color | | |
| CAP | Offset | slider | 0 | |
| CAP | Smoothing | checkbox | off | |
| BOTTOM CAP | (same as CAP) | | | |
| ROOT FLARES | (collapsed) | | | |
| BLADES | (collapsed) | | | |
| AXIS CONTROL | Axis | gear icon | | |
| AXIS CONTROL | Sampling boost | slider | +0 | |
| AXIS CONTROL | Prevent back folds | slider | +1 | |
| AXIS CONTROL | Shift to short side | slider | +0 | |
| AXIS CONTROL | Smoothing | slider | +0 | |
| AXIS CONTROL | Account for blade width | checkbox | on | |

### Meshing tab

| Section | Parameter | Type | Default | Notes |
|---------|-----------|------|---------|-------|
| GENERAL | Boost | slider | +0 | |
| GENERAL | Normal computation | dropdown | Geometric | |
| GENERAL | Double sided | checkbox | off | |
| GENERAL | Merge seam points | checkbox | on | |
| AXIAL SUBDIVISIONS | Count mode | dropdown | Per length unit | |
| AXIAL SUBDIVISIONS | Number | slider | | |
| AXIAL SUBDIVISIONS | Density | slider | | |
| AXIAL SUBDIVISIONS | Adaptiveness | slider | | |
| AXIAL SUBDIVISIONS | **Minimum number** | slider | 1 | Key mesh resolution param |
| ANGULAR SUBDIVISIONS | Count mode | dropdown | Per radius unit | |
| ANGULAR SUBDIVISIONS | Number | slider | | |
| ANGULAR SUBDIVISIONS | Symmetry factor | slider | | |
| ANGULAR SUBDIVISIONS | **Minimum number** | slider | 3 | Key mesh resolution param |
| BLENDING SUBDIVISIONS | Minimum number | slider | 0 | |
| CAP | Radial subdivisions | slider | 2 | |
| CAP | Body displacement transition | color | | |
| SECONDARY CAP | Radial subdivisions | slider | 2 | |
| BOTTOM CAP | Radial subdivisions | slider | | |
| BLADES | Radial subdivisions | slider | 2 | |

### Influences tab

| Section | Parameter | Type | Default |
|---------|-----------|------|---------|
| AXIS PERTURBATION | Strength | slider | 0 |
| AXIS PERTURBATION | Make planar | slider | 0 |
| AXIS PERTURBATION | Frequency | slider | 1 |
| AXIS PERTURBATION | Smooth start | slider | +0.1 |
| AXIS PERTURBATION | Keep tip | slider | 0 |
| AXIS PERTURBATION | Apply | dropdown | After biases |
| LOCAL BIAS 1 | (checkbox, collapsed) | | |
| GLOBAL BIASES | (checkbox, collapsed) | | |
| INTERACTIONS | (checkbox, collapsed) | | |
| SKINNING | Create rig | checkbox | off |
| WIND SENSITIVITY | Flexibility | slider | |
| WIND SENSITIVITY | Influence of blades | slider | |
| AMBIENT MOTION (BREEZE) | Strength | slider | |

### Transformations tab (Advanced Segment)

| Section | Parameter | Type | Default | Notes |
|---------|-----------|------|---------|-------|
| HIERARCHY CONTROL | **+ Depth** | slider | 1 | Recursion depth for branching |
| HIERARCHY CONTROL | Min depth | slider | 0 | |
| SCALE | Global | slider | 1 | |
| SCALE | X, Y, Z | sliders | 1 | |
| SCALE | Inherit from parent | checkbox | on | |
| OFFSET | X, Y, Z | sliders | 0 | |
| ROTATION ANGLES | X, Y, Z | sliders | 0 | |
| ORIENTATION TROPISM | Vertical | slider | 0 | |
| ORIENTATION TROPISM | Horizontal | slider | 0 | |
| LOD MANAGEMENT | Min LOD | slider | | |
| LOD MANAGEMENT | Max LOD | slider | | |
| LOD MANAGEMENT | Inherit from parent | checkbox | on | |
| SAP | Inherit | dropdown | Off | |

---

## Child Distribution Tab (on parent node)

When a child is added, a new tab appears on the parent: "1. [child name]"

### DISTRIBUTION section

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| Count mode | dropdown | Fixed Value | |
| **Number** | slider | 4 | How many children to spawn |
| Minimum number | slider | 0 | |
| **Soft insert** | dropdown | None, use rounded number | |
| Borderless | dropdown | No | |
| Start Mode | dropdown | Relative | |
| **Start** | slider | 0 | Where children begin along parent (0-1) |
| End Mode | dropdown | Relative | |
| **End** | slider | 1 | Where children stop along parent (0-1) |
| Margin before cut | slider | 0 | |
| Density | slider | | |
| Randomness | slider | 0 | |

### PLACEMENT section

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| **Arrangement** | dropdown | Lateral alternate (+90 R, Z) | Phyllotaxis pattern |
| Positioning Method | dropdown | Axis of the segment | |
| Move out | slider | 0 | |
| **Roll** | slider | 0 | |
| **Coil** | slider | 0 | |
| Pair Offset Mode | dropdown | InterNode | |
| Pair Offset | slider | | |
| Avoid mesh | checkbox | on | |
| Influenced by twist | checkbox | on | |

### ORIENTATION section

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| **Angle** | slider | 30 | Branch angle off parent axis |
| Min. angle with parent | slider | 0 | |
| **Rotation** | slider | 0 | |

### TROPISM section

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| Direction | X, Y, Z | 0, 0, 1 | |
| **Cone Angle** | slider | 90 | |
| Local coord. | checkbox | off | |
| Angle strength | slider | 0 | |
| Rotation strength | slider | 0 | |
| Roll strength | slider | 0 | |

### WHORL (checkbox, collapsed)

### PRUNING section

| Parameter | Type | Default |
|-----------|------|---------|
| Cut probability | slider | 0 |
| Cut length mode | dropdown | Relative |
| Cut length | slider | |
| RR Mode | dropdown | Relative |
| Radius Reduction | slider | |

### INFLUENCE ON SEGMENT section

| Parameter | Type | Default |
|-----------|------|---------|
| Shrink radius | slider | 0 |
| Bending | slider | 0 |
| Smoothness | slider | 0 |
| Zigzag shape | | |
| Zigzag strength | slider | 0 |
| Force subdivision | checkbox | off |

### INHERITED PROPERTIES section

| Parameter | Type | Default |
|-----------|------|---------|
| Density | | |
| **Scale** | slider | 1 |
| Sap | | |

---

## Setup Tab (scene-level, not per-node)

| Section | Parameter | Type | Default |
|---------|-----------|------|---------|
| GEOMETRY | Position | X, Y, Z | 0m, 0m, 0m |
| GEOMETRY | Rotation angles | X, Y, Z | 0, 0, 0 |
| GEOMETRY | Scale | X, Y, Z | 1m, 1m, 10m |
| PLANT CHARACTERISTICS | **Seed** | value | 0 |
| PLANT CHARACTERISTICS | Max age | value | 20 |
| PLANT CHARACTERISTICS | **Age** | slider | 10 |
| PLANT CHARACTERISTICS | **Health** | slider | 100% |
| GRAVITY | Gravity strength | slider | 1 |
| TIME & SEASON | Time | slider | 0 |
| TIME & SEASON | **Season** | slider | 25% |

---

## Mapping: Old Build Guide Names -> Real PF Names

| Old (incorrect) name | Real PF parameter | Location |
|----------------------|-------------------|----------|
| "Branch angle" | **Angle** | Parent's child tab > ORIENTATION |
| "Branch rotation" | **Rotation** | Parent's child tab > ORIENTATION |
| "Number" (branch count) | **Number** | Parent's child tab > DISTRIBUTION |
| "Branch start" | **Start** | Parent's child tab > DISTRIBUTION |
| "Branch end" | **End** | Parent's child tab > DISTRIBUTION |
| "Axial subdivisions" | **Minimum number** | Node > Meshing > AXIAL SUBDIVISIONS |
| "Radial subdivisions" | **Minimum number** | Node > Meshing > ANGULAR SUBDIVISIONS |
| "Radius" (direct) | Set **Radius mode** to Fixed first, then **Radius** | Node > Segment tab |
| "Flexibility" | **Flexibility** | Node > Influences > WIND SENSITIVITY |
| "Min LOD" / "Max LOD" | **Min LOD** / **Max LOD** | Node > Transformations > LOD MANAGEMENT |
