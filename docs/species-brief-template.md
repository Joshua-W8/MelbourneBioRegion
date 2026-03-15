# Species Brief Template

This template is the shared contract between the three modelling agents. Each stage is completed by a different agent, in order. Do not skip stages or work out of sequence.

---

## Species Header

| Field | Value |
|-------|-------|
| **Scientific name** | |
| **Common name(s)** | |
| **Family** | |
| **Life form code** | _(DSE standard: IT, T, MS, SS, PS, LTG, MTG, LNG, MNG, LH, MH, SH, GF, SC)_ |
| **Priority** | _(keystone / high / medium / low)_ |
| **Target vegetation type(s)** | |
| **Brief status** | Stage 1 / Stage 2 / Stage 3 / Complete |

---

## Stage 1 -- Botanical Brief

_Completed by: Australian Botanist_

### 1.1 Habit Summary

- **Growth form**: _(e.g. single-stemmed canopy tree, multi-stemmed tall shrub, tussock-forming graminoid)_
- **Typical mature height**: _(range in metres)_
- **Typical spread/crown width**: _(range in metres)_
- **Typical trunk DBH**: _(range in cm, if applicable)_

### 1.2 Silhouette Features

_What makes this species visually recognisable at 5-15m distance? Describe the overall shape, proportions, and any distinctive features visible in silhouette._

### 1.3 Bark Character

- **Type**: _(stringybark / box / ironbark / smooth / paperbark / fibrous / ribbony / other)_
- **Colour**: _(describe)_
- **Texture notes**: _(persistence, shedding pattern, depth of fissures)_

### 1.4 Leaf Geometry

- **Shape**: _(lanceolate / ovate / linear / falcate / phyllode / compound-bipinnate / etc.)_
- **Size**: _(length x width range in mm)_
- **Arrangement**: _(alternate / opposite / whorled / rosette / distichous)_
- **Petiole**: _(length, if present)_
- **Colour**: _(upper surface / lower surface)_
- **Dimorphism**: _(juvenile vs adult differences, if any)_

### 1.5 Branching Habit

- **Primary branch angle**: _(degrees off trunk, approximate)_
- **Habit**: _(ascending / spreading / drooping / pendulous / divaricate)_
- **Density**: _(sparse / moderate / dense)_
- **Distinctive patterns**: _(epicormic growth, coppice, crown die-back, etc.)_

### 1.6 Seasonal Notes (Summer)

- **Flowering**: _(status in summer -- budding / peak / spent / not flowering)_
- **Leaf condition**: _(full canopy / sparse / new growth flush)_
- **Fruiting**: _(capsules / pods / seeds present?)_
- **Other**: _(any other summer-specific visual features)_

### 1.7 Co-occurring Species

_List key species that share the same vegetation layer in the same vegetation type(s). This helps the PlantFactory Specialist calibrate relative scale and visual weight._

### 1.8 Field References

- VicFlora: _(URL)_
- ALA: _(URL)_
- Photographic references: _(notes on what to look for)_

---

## Stage 2 -- Architectural Model

_Completed by: Plant Biologist_

### 2.1 Halle-Oldeman Model

- **Primary model**: _(e.g. Rauh's model)_
- **Confidence**: _(high / moderate / low)_
- **Secondary model**: _(if ambiguous -- the alternative candidate)_

### 2.2 Rationale

_Why does this model fit? Reference specific features from the Botanical Brief (Stage 1) that confirm the assignment._

### 2.3 Branching Type

- **Type**: _(monopodial / sympodial by apposition / sympodial by substitution / mixed)_
- **Trunk axes**: _(single / multi-stemmed / coppicing)_
- **Growth determinacy**: _(determinate / indeterminate)_
- **Reiteration**: _(present / absent / age-dependent -- describe if present)_

### 2.4 Internode Pattern

- **Regularity**: _(regular / irregular / compressed at nodes)_
- **Length gradient**: _(describe variation from base to tip)_
- **Notable features**: _(any compression zones, swelling, or branching clusters)_

### 2.5 Phyllotaxis Specification

- **Pattern**: _(spiral / distichous / decussate / whorled / rosette)_
- **Divergence angle**: _(degrees, if spiral)_
- **Confidence**: _(high / moderate -- based on literature vs inference)_

### 2.6 Ontogenetic Notes

_How does the architecture change from juvenile to mature? Describe critical transitions. Note any features the 3D model should capture at the target maturity stage._

### 2.7 Growth Unit Description

_What constitutes one growth flush? How does it manifest in branch structure?_

### 2.8 Conflicts or Ambiguities

_Any tension between the Botanical Brief and the architectural classification? Cases where the species sits between two models? Flag for discussion._

---

## Stage 3 -- PlantFactory Implementation

_Completed by: PlantFactory Specialist_

### 3.1 Node Graph Approach

- **Base template**: _(Rauh / Leeuwenberg / Corner / Tussock / Custom)_
- **Rationale**: _(why this template, referencing Stage 2)_

### 3.2 Parameter Values

| Node | Parameter | Value | Notes |
|------|-----------|-------|-------|
| Branch (trunk) | length | | |
| Branch (trunk) | radius | | |
| Branch (trunk) | segments | | |
| Branch (trunk) | taper | | |
| Branch (trunk) | gravity | | |
| Branch (primary) | length | | |
| Branch (primary) | angle | | |
| Branch (primary) | count | | |
| Repeat | iterations | | |
| Repeat | angle | | |
| Phyllotaxis | pattern | | |
| Phyllotaxis | divergence | | |
| Leaf | mesh_type | | |
| Leaf | size | | |
| Material (bark) | base_colour | | |
| Material (bark) | roughness | | |
| Material (leaf) | base_colour | | |
| Material (leaf) | translucency | | |

### 3.3 Polygon Budget

| Component | Target tris | Notes |
|-----------|------------|-------|
| Trunk | | |
| Primary branches | | |
| Secondary branches | | |
| Leaves | | |
| Flowers/fruit | | |
| **Total** | | |

### 3.4 Texture Approach

- **Bark**: _(procedural / photo texture / atlas entry)_
- **Leaves**: _(billboard / mesh / card -- atlas or individual)_
- **UV strategy**: _(describe)_

### 3.5 Approved Simplifications

_Where is botanical accuracy deliberately reduced for performance? List each simplification with justification._

| Simplification | Botanical reality | Implementation | Justification |
|---------------|-------------------|----------------|---------------|
| | | | |

### 3.6 Registry Entry

```json
{
  "folder": "",
  "default": "",
  "variants": {},
  "priority": "",
  "notes": ""
}
```

### 3.7 Export Settings

- **FBX export**: _(settings)_
- **Blender processing**: _(any specific operations)_
- **Draco compression**: _(quantisation bits, etc.)_

### 3.8 Open Issues

_Unresolved implementation questions. Mark each `[NEEDS TESTING]` or `[NEEDS DISCUSSION]`._

---

## Sign-off

| Stage | Agent | Status | Date |
|-------|-------|--------|------|
| Stage 1 -- Botanical Brief | Australian Botanist | | |
| Stage 2 -- Architectural Model | Plant Biologist | | |
| Stage 3 -- PlantFactory Implementation | PlantFactory Specialist | | |
