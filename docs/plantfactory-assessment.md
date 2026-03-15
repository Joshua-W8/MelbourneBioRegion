# PlantFactory Installation Assessment

**Date:** 2026-03-08
**Version:** PlantFactory 2024 (Bentley Systems / e-on Software)
**Platform:** macOS (Darwin 23.3.0)

---

## 1. Installation Overview

PlantFactory is fully installed across three locations:

| Location | Path | Status |
|----------|------|--------|
| Application | `/Applications/PlantFactory/` | Present -- full install |
| User Content | `~/Documents/e-on software/PlantFactory/` | Present -- empty (Personal subdirs only) |
| App Support | `~/Library/Application Support/e-on software/PlantFactory/` | Present -- config + cache |

### Application Directory Contents

- `PlantFactory.app` -- main application bundle
- `Python/` -- Python 3.10 runtime + SWIG-wrapped C++ API + Doxygen HTML docs
- `Scripts/` -- Maya and 3ds Max FBX import scripts, OSL leaf color shift shader
- `Documentation/` -- 77MB PDF reference manual + PlantCatalog exporter docs
- `Environment/` -- node definitions, export presets, metanodes, material tables, rendering presets
- `Modules/` -- 22 I/O format plugins (.eon): FBX, OBJ, USD, C4D, 3DS, PNG, JPEG, EXR, HDR, TIFF, GoZ, etc.
- `Kernels/` -- AMD Radeon ray-tracing and denoising kernels
- `lib/` -- 96 shared libraries
- `plugins/` -- additional plugins
- `Notices/` -- 60 third-party license notices

---

## 2. Python API -- Complete Analysis

### 2.1 Architecture

The Python API is a **SWIG 4.0.2 wrapper** around PlantFactory's C++ core. It runs on an embedded **Python 3.10** interpreter with:

- **`eon.py`** (1683 lines) -- the main SWIG-generated module, the entire programmatic interface
- **`_eon` native module** -- the compiled C++ bridge (loaded by eon.py)
- **`eonpy/` package** -- higher-level Python utilities:
  - `macroPy.py` -- UI macro automation framework (click, setValue, key events)
  - `jsonRPC.py` -- JSON-RPC interface to PlantFactory internals
  - `eonwxEvent.py` -- wxPython event loop integration for idle callbacks
  - `startConsole.py` -- launches an interactive Python editor console inside the app
- **Bundled libraries**: PIL/Pillow (image processing), wxPython (GUI), spatialmedia

### 2.2 Key Classes

**Three classes are exposed:**

| Class | Inherits | Purpose |
|-------|----------|---------|
| `EONAppBase` | -- | Base application: exit, message boxes, content paths, render callbacks |
| `EONApplication` | `EONAppBase` | File I/O: LoadFile, SaveFile, TestLoaded, GetEONChild |
| `EONChild` | -- | **The workhorse**: plant manipulation, node graph, export, rendering |

### 2.3 EONChild -- Full Method Inventory

This is the primary class for automation. Every method documented below is confirmed present in `eon.py`:

#### Plant Loading & Scenes
- `NewScene()` -- reset to default scene
- `LoadPlant(plantFilename, seed=0)` -- load a .tpf plant file
- `LoadPlantCatalogFile(plantCatalogSpecies, seed=0)` -- load from PlantCatalog by name
- `LoadAtmosphere(strFilename)` -- load atmosphere file

#### Global Plant Parameters
- `GetAgeRatio()` / `SetAgeRatio(age)` -- maturity 0.0-1.0
- `GetHealth()` / `SetHealth(health)` -- health 0.0-1.0
- `GetSeason()` / `SetSeason(season)` -- season 0.0-1.0
- `GetPlantHeight()` -- current height
- `GetNumberOfPolygons()` -- current polygon count
- `GetLeafNumber()` -- leaf count
- `GetPrimitiveNumber()` -- primitive count
- `GetBoneNumber()` -- bone count

#### Node Graph Manipulation
- `GetSpecialNode(nodeName)` -- get named nodes (e.g. "root")
- `GetNodeAt(nodeIndex)` -- get node by index
- `AddNode(*args)` -- add a node to the graph
- `AddAndConnectNode(*args)` -- add and connect a node in one call
- `ConnectOutputToInput(*args)` -- wire node connections
- `NodeSetParam(node, paramName, value)` -- **set any parameter on any node**
  - `paramName` can be a "path in the interface" like `"segment/length"` or an integer input index
- `NodeResetParentFilter(node, paramName, filter)` -- reset parent filter (ZERO, ONE, IDENTITY)
- `NodeResetProfileFilter(node, paramName, filter)` -- reset profile filter
- `NodeAddProfileFilterPoint(node, paramName, pt_x, pt_y)` -- add spline control point to filter
- `ApplyChanges()` -- commit parameter changes to regenerate geometry
- `UpdateVariation()` -- update variation/randomization

#### Export -- Mesh
- `ExportAsMesh(outputFilename, outputMapsDirectory=None)` -- export to FBX/OBJ/USD/C4D/etc.
  - Format determined by file extension
  - Supports all 22 format modules
- `SetExportOption(optionName, value)` -- set individual export options
- `GetExportOption(optionName)` -- query current export option
- `ResetExportOption(optionName)` -- reset one option to default
- `SetExportPreset(val)` -- set a complete preset (see export presets below)
- `GetExportPreset()` -- get current preset
- `SetDefaultExportPathAndName(*args)` -- set output path

#### Export -- Species
- `ExportAsVueSpecies(dstFilename, incorporateMaps=True, compressFile=True)` -- export as .tpf species

#### Meshing Control
- `SetMeshingMode(type, mode)` -- tri/quad/mixed per GeometryType
- `SetSubdivisionMode(type, mode)` -- uniform/adaptive meshing
- `SetSelectedLOD(lod)` -- select LOD level

#### Rendering
- `RenderToFile(outputRenderPath, mode, width, height)` -- render to image
  - `mode`: "LRT" (realtime), "VUE" (offline), "LRT|TRBG" (transparent background)
- `RenderInit(randomRefId=True)` -- initialize render
- `ResizePreview(width, height)` -- resize preview window

#### Bone/Primitive Inspection (Oryx methods)
- `GetRadiusAtLength(prim, length)` -- branch radius at position
- `GetCenterAtLength(prim, length)` -- branch center position
- `GetBoneAtLength(prim, length)` -- bone at position
- `GetBoneParent(bone)` -- parent bone
- `GetBonePrim(boneId)` -- primitive for bone
- `GetPrimNodeName(prim)` -- node name for primitive
- `GetBoneName(boneId)` -- bone name
- `IsBranchPrim(prim)` -- is this a branch primitive?
- `GetPrimLength(i)` -- primitive length

#### Presets
- `GetPresetNumber()` / `GetPresetName(index)` / `GetSelectedPreset()`
- `ApplyPreset(index)` / `CreateNewPreset(name)`
- `SetPresetDescription(description, index)` / `GetPresetDescription(index)`
- `SetPresetPicture()` -- capture current view as preset thumbnail

#### Display & Preview
- `SetSkyboxType(type)` -- skybox selection
- `SetPreviewChecker(on)` -- ground checker pattern
- `SetPlantUndergroundVisibility(x)` -- show underground parts
- `SetGridDisplay(on)` -- ground grid
- `SetWindPreview(enable)` -- wind animation preview
- `SetFrame(currentFrame)` -- animation frame
- `SetDisplacementMethod(type)` -- displacement rendering

#### Vertex Colors
- `AddVertexColorSet(name)` -- add named vertex color set
- `AddVertexColorSetChannel(vcSet, channel, data)` -- add channel data

#### Miscellaneous
- `EnableGroundInfluence(enable)` -- ground interaction
- `SetXMLConfig(tag, value)` -- set XML config parameters
- `SetOnIdleCallback(callback)` -- (via eonwxEvent) register idle callback

### 2.4 Global Convenience Functions

These are standalone functions (not on EONChild) available in the `eon` module:

- `GeneralParameterSetAge(age)` / `GeneralParameterGetAge()`
- `GeneralParameterSetAgeMax(age)` / `GeneralParameterGetAgeMax()`
- `GeneralParameterSetHealth(health)` / `GeneralParameterGetHealth()`
- `GeneralParameterSetSeason(day)` / `GeneralParameterGetSeason()`
- `GeneralParameterSetSeed(seed)` -- **critical for reproducibility**
- `MeshingParameterIncreaseSubdivision(increaseLevel)` -- 2^level factor
- `MeshingParameterSetSubdivision(level)` -- absolute subdivision level
- `MeshingParameterSetLODForRender(useLodForRendering)` -- LOD for rendering

### 2.5 Export Presets (Enum Constants)

```
EExportPreset_EP_None
EExportPreset_EP_Max_Basic
EExportPreset_EP_Max_Mental_Ray
EExportPreset_EP_Max_VRay
EExportPreset_EP_Blender          <-- our target
EExportPreset_EP_Cinema4D
EExportPreset_EP_DAZ_Studio
EExportPreset_EP_LightWave
EExportPreset_EP_Maya_Mental_Ray
EExportPreset_EP_Maya_VRay
EExportPreset_EP_Modo
EExportPreset_EP_Pixologic_ZBrush
EExportPreset_EP_Poser
EExportPreset_EP_SoftImage
EExportPreset_EP_Unity
EExportPreset_EP_Unreal_Engine
EExportPreset_EP_VUE
EExportPreset_EP_Omniverse_USD
EExportPreset_EP_Clarisse_USD
```

The **Blender preset** from `export_presets.xml` uses: FBX format, no alpha inversion, scale=1, XYZ axes, no double-sided, static bones animation, alpha extraction.

### 2.6 Mesh/Material Enums

**Polygon modes:**
- `SPM_Triangles`, `SPM_Quads`, `SPM_MixedQuadsTriangles`, `SPM_MixedQuadsTrianglesWithoutDummyTriangles`

**Geometry types:**
- `GT_offline`, `GT_realtime`, `GT_envelope`

**Material export modes:**
- `EMaterialExportMode_Automatic`, `EMaterialExportMode_ConvertExistingMaps`, `EMaterialExportMode_BakeToTextureMaps`, `EMaterialExportMode_MaterialX`

**Map types (texture channels):**
- `EM_Color`, `EM_Alpha`, `EM_Bump`, `EM_Normal`, `EM_Displacement`, `EM_Metallic`, `EM_Roughness`, `EM_Occlusion`, `EM_Backlight`, `EM_Highlight`, `EM_Reflection`, `EM_ClearcoatContribution/IOR/Roughness/Tint/Normal/Flatten`, `EM_FrontGI`, `EM_BackGI`, `EM_Luminous`, `EM_Depth`

**Mesh partitioning:**
- `MeshPart_OneMesh`, `MeshPart_OnePartPerNode`, `MeshPart_OneMeshPerPrim`, `MeshPart_WithHierarchyLevels`

**Animation formats:**
- `EAnimationFormat_StaticBones`, `EAnimationFormat_AnimatedBones`, `EAnimationFormat_AnimatedPoints`

**Double-sided face modes:**
- `EDoubleSidedFaceMode_TwoSidedFace`, `EDoubleSidedFaceMode_DuplicatedFace`, `EDoubleSidedFaceMode_DuplicatedFace_IfTwoSidedMaterial`

### 2.7 JSON-RPC Interface

The `eonpy.jsonRPC.Call(method, *args, **kwargs)` function provides a JSON-RPC 2.0 interface to PlantFactory internals. It wraps `eon.JsonRPC(jsonMsg)`, suggesting additional internal methods exist beyond what SWIG exposes. The exact method list is not documented in the files on disk -- this would require runtime introspection.

### 2.8 Macro Automation (macroPy)

The `MacroBase` class enables UI automation by replaying mouse/keyboard events:
- `Click(ctrl, dialog)` -- click a UI control
- `SetValue(ctrl, dialog, value)` -- set a control value
- `Key(dialog, ctrl, keys)` -- type keys
- `MainMenu(entry)` -- trigger main menu items
- `CloseDialog(dialog, state)` -- close dialogs
- `ScreenShot(dialog)` -- capture dialog

This is useful for automating operations not exposed in the Python API (e.g., specific dialog workflows).

### 2.9 Command-Line Execution

PlantFactory supports headless Python script execution:
```bash
./"/Applications/PlantFactory/PlantFactory.app/Contents/MacOS/PlantFactory" \
  --python "/path/to/script.py" --
```

Arguments can be passed between the script path and the closing `--`.

---

## 3. Node Types -- Complete Catalog

From `node_tooltips.xml`, the following node types are available (with node IDs):

### Geometry Nodes (Primary)

| Node ID | Name | Description |
|---------|------|-------------|
| 8000 | **Root** | Graph entry point; all geometry must connect to root |
| 8037 | **Segment** | **The core node.** Generates cylindrical geometry with child placement. Used for branches, trunks, roots, stems, petals, leaves |
| 8004 | **Ball** | Spherical geometry |
| 8005 | **Hydra** | Distributes child instances in a circle (no own geometry) |
| 8006 | **Urchin** | Spherical geometry with child distribution (phyllotaxis-like) |
| 8010 | **Object** | External mesh import |
| 8022 | **Warpboard** | Paraboloid shape -- simple leaves, petals |

### Flow Control Nodes

| Node ID | Name | Description |
|---------|------|-------------|
| 8017 | **Next** | End of Repeat loop; evaluated after all iterations |
| 8018 | **Last** | Only evaluated on last iteration |
| 8019 | **All but last** | Evaluated on all iterations except last |
| 8024 | **Iteration n** | Returns iteration ratio (completed/max) |
| 8014 | **Random inputs** | Randomly selects one connected input |
| 8031 | **Select 2 children** | Threshold-based branch selection |

### Parameter/Data Nodes

| Node ID | Name | Description |
|---------|------|-------------|
| 8011 | **Random Number** | Random value in [Min, Max] |
| 8012 | **Primal** | Position on segment axis (0=bottom, 1=top) |
| 8013 | **Section angle** | Angular position orthogonal to segment axis |
| 8025 | **Parent parameters** | Access parent node parameter values |
| 8035 | **Parent primitive instance parameters** | Parent primitive properties |
| 8026 | **Multicurve** | Profile/curve modifier |
| 8027 | **Maturity** | Current age ratio [0,1] |
| 8028 | **Season** | Current season position [0,1] |
| 8029 | **Health** | Current health [0,1] |
| 8030 | **Item age** | Item-level age |
| 8036 | **Random range** | Combined value + variance + randomness + filters |

### Axis/Shape Nodes

| Node ID | Name | Description |
|---------|------|-------------|
| 8032 | **Section splines set** | 3D section shape via spline editor |
| 8033 | **Axis spline - Function** | Procedural axis spline (rotation/translation/scale per step) |
| 8034 | **Axis spline - Manual** | Manual axis spline via editor |

### Environment Nodes

| Node ID | Name | Description |
|---------|------|-------------|
| 301 | **Position** | Point position (for displacement) |
| 303 | **Time** | Scene time |
| 324 | **Object Center** | Plant origin as 3D vector |

### Segment Node -- Key Parameters

The Segment node (8037) is by far the most complex. Key parameter groups and IDs extracted from tooltips:

**Children Distribution:**
- `SbCount` (Number) -- quantity of child connections
- `BranchStart` / `BranchEnd` -- where children appear (0.0-1.0)
- `BranchDensity` -- density curve along segment
- `BranchStartMode` / `BranchEndMode` -- relative vs absolute positioning
- `RandomBranchOffset` -- randomize child positions
- `SoftInsert` -- fractional child count behavior
- `SubbranchesArrangement` -- alternate, opposite, whorled, etc.
- `SubbranchCountMode` -- count interpretation mode

**Child Orientation:**
- `BranchAngle` -- tilt angle in degrees
- `BranchRotation` -- rotation around child Z axis
- `BranchMinAngleWP` -- minimum angle with parent

**Child Placement:**
- `BranchOrientation` (Roll) -- roll around segment
- `BranchCoil` -- spiral arrangement
- `BranchOffset` -- position offset
- `BranchOffsetRadial` (Move out) -- radial offset
- `BranchOutputKind` -- positioning method (axis/side/top)
- `PairOffset` / `PairOffsetMode` -- pair arrangement control

**Inherited Properties (passed to children):**
- `SbGrowth` (Sap) -- simulates growth; manages offspring length and density
- `SbScale` -- offspring scale factor
- `SbDensity` -- offspring density modifier

**Pruning:**
- `PruningEnable` -- enable pruning
- `IsPruned` (Cut probability) -- probability of cut
- `PruningLength` / `PruningLengthMode` -- cut length
- `PruningRadiusReduction` -- diameter reduction for cut branches

**Influence on Segment:**
- `BranchAxisInfluence` (Bending) -- zig-zag from alternate arrangement
- `BranchRadiusInfluence` (Shrink radius) -- radius reduction at connection
- `DistanceInfluence` (Smoothness) -- smooth zig-zag angles

**Subdivision Surfaces:**
- `NTParentLowerWidth` / `NTParentUpperWidth` -- blending width at branch junctions

**Meshing:**
- `MeshingNbSubdivT` -- axial subdivisions
- `MeshingNbSubdivAngle` -- radial subdivisions
- `MeshingMinNbSubdivT` / `MeshingMinNbSubdivAngle` -- minimum subdivisions
- `MeshingNbRadialSymmetry` -- symmetry factor
- `MeshingDensityT` -- subdivision distribution
- `MeshingIntelligenceAmount` -- adaptive vs manual
- `MeshingSubdivMode` -- subdivision mode

**Common Transformation Parameters (all geometry nodes):**
- Scale (X, Y, Z)
- Offset (X, Y, Z)
- Rotation angles (X, Y, Z)
- Orientation tropism
- Wind sensitivity (Flexibility)
- Hierarchy control (Min depth, + Depth)
- LOD Management (Min LOD, Max LOD)
- Disable texture baking

---

## 4. Species Presets & Templates

### Built-in Presets
The user content directory (`~/Documents/e-on software/PlantFactory/Species/Personal/`) is **empty** -- no built-in species presets are installed. PlantFactory ships as a blank canvas.

Species presets would come from:
1. **PlantCatalog** (separate product, loaded via `LoadPlantCatalogFile()`)
2. **Community/marketplace** downloads
3. **Custom creation** in the node editor

### Node Presets
- `Environment/Node Presets/advanced.nod` (258KB) -- advanced node preset collection
- `Environment/Metanodes/AxisOffsetPerChild.nod` -- per-child axis offset metanode
- `Environment/Metanodes/Flower Profile.nod` -- flower profile metanode
- `Environment/Metanodes/CutOutLeaf/` -- cutout leaf preset

### Application Categories
The `categories.xml` lists 197 content categories including plant-relevant ones:
- Broadleaf Trees, Coniferous, Bushes, Grasses & Weeds, Palms, Perennials, Succulents
- Flowers, Leaves, Barks, Ground Covers, Water Plants, Climbers
- Houseplants, Other Plants, Tropical

---

## 5. Materials & Textures

### Material System
PlantFactory supports PBR materials with these channel types (from `eon.py` enums):

**Material texture types (`MT_*`):**
- `MT_color` -- diffuse/albedo
- `MT_alpha` -- transparency
- `MT_bump` -- bump mapping
- `MT_normal` -- normal mapping
- `MT_metallic` -- metallic
- `MT_roughness` -- roughness
- `MT_ambientocclusion` -- AO
- `MT_backlight` -- subsurface/backlight (translucency)
- `MT_highlight` -- specular
- `MT_reflection` -- reflection
- `MT_disp` -- displacement
- `MT_transparency` -- transparency
- `MT_clearcoatContribution/IOR/Roughness/Tint/Normal/Flatten` -- clearcoat layer
- `MT_luminous` -- emissive

**Material types:**
- `MaterialType_Material` -- standard
- `MaterialType_PBR_Glossy` -- PBR glossy
- `MaterialType_TwoSided` -- two-sided (critical for leaves)
- `MaterialType_Mixed`, `MaterialType_Volumetric`, `MaterialType_Cloud`, `MaterialType_Ecosystem`

### Built-in Materials
The user materials directory is empty. Materials are defined within each plant file or loaded from the PlantFactory material system. The `Environment/Default.mat` and `Environment/detailing.mat` provide base material templates.

### Texture Capabilities for Our Pipeline
For FBX export to Blender, the Blender export preset configuration is:
- Format: FBX
- Alpha treatment: Extract (separate alpha from color)
- Scale: 1.0
- Axes: XYZ
- Static bones animation

---

## 6. Export Capabilities

### Supported Export Formats (22 modules)

| Module | Format | Notes |
|--------|--------|-------|
| FBX.eon | .fbx | **Primary for our pipeline** |
| OBJ.eon | .obj | Wavefront OBJ |
| USD.eon | .usd | Universal Scene Description |
| C4d.eon | .c4d | Cinema 4D native |
| 3DS.eon | .3ds | Legacy 3DS |
| Abc.eon | .abc | Alembic |
| GoZ.eon | .goz | ZBrush GoZ |
| PNG/JPEG/TIFF/EXR/HDR/etc. | image | Texture export formats |

### Export Presets (from `export_presets.xml`)

17 presets targeting different applications. The **Blender preset** (Id=3):
```xml
<preset Id="3" Target="Blender" FileFormat="fbx" InvertAlpha="0" Scale="1"
        AxesSystem="0" DoubleSided="0" AnimationFormat="1" AlphaTreatment="1" />
```

### Export Automation Pattern

```python
import eon

app = eon.EONApplication()
child = eon.EONChild()

# Load a plant
child.LoadPlant("/path/to/species.tpf", seed=42)

# Set parameters
child.SetAgeRatio(0.8)
child.SetHealth(1.0)
child.SetSeason(0.5)

# Configure export
child.SetExportPreset(eon.EExportPreset_EP_Blender)
child.SetMeshingMode(eon.GT_realtime, eon.SPM_Triangles)

# Wait for geometry computation
child.WaitForGeometry()

# Export
child.ExportAsMesh("/output/path/plant.fbx")

# Exit
app.Exit(False)
```

---

## 7. Automation Capabilities Summary

### What CAN be fully automated via Python:

1. **Load any .tpf plant file** with specific seed
2. **Set global parameters**: age/maturity, health, season, seed
3. **Set node parameters**: any parameter on any node via path strings or input indices
4. **Manipulate node graph**: add nodes, connect nodes, set parameters
5. **Control meshing**: subdivision levels, tri/quad modes, LOD
6. **Export to FBX** with Blender preset (our pipeline target)
7. **Export to any supported format** (OBJ, USD, C4D, etc.)
8. **Render to image file** for documentation/preview
9. **Query plant metrics**: polygon count, height, leaf count, bone count
10. **Batch processing**: command-line execution with `--python` flag
11. **Profile/filter manipulation**: reset and add control points to parameter filters

### What CANNOT be directly automated (requires UI macros or manual work):

1. **Creating node graphs from scratch** -- `AddNode()` and `AddAndConnectNode()` exist but parameter documentation for node type creation strings is not in the on-disk files
2. **Material creation/editing** -- no `CreateMaterial()` or material parameter API visible in the SWIG wrapper
3. **Texture map assignment** -- likely requires UI macro or JSON-RPC
4. **Spline editor manipulation** -- manual spline editors are GUI-only; only `NodeResetProfileFilter` and `NodeAddProfileFilterPoint` provide programmatic access to filter curves
5. **PlantCatalog browsing** -- requires knowing species names in advance

---

## 8. Key Gaps & Open Questions

### Critical for our pipeline:

1. **Node type creation strings**: `AddNode()` and `AddAndConnectNode()` accept `*args` but the valid node type strings/IDs are not documented on disk. We need to either:
   - Reverse-engineer from the node_tooltips.xml IDs (8000, 8037, etc.)
   - Use `jsonRPC.Call()` to discover available methods at runtime
   - Examine existing .tpf files to see how node types are referenced

2. **NodeSetParam path syntax**: The doc says `paramName` can be `"segment/length"` style paths. We need the complete path vocabulary. The `node_tooltips.xml` provides parameter IDs (e.g., `SbCount`, `BranchAngle`, `PruningLength`) -- these may be the valid path names.

3. **Material parameter access**: No material creation/editing API is visible. We may need to:
   - Pre-build template .tpf files with materials already set up
   - Use the macro system to automate material dialogs
   - Investigate `jsonRPC.Call()` for internal material methods

4. **Export option names**: `SetExportOption(name, value)` exists but the valid option names are not enumerated in the on-disk files. The export_presets.xml attributes give clues: `InvertAlpha`, `Scale`, `AxesSystem`, `DoubleSided`, `AnimationFormat`, `AlphaTreatment`, `TextureMapFormat`, `TexturesSubFolder`, `TexturePathMode`, `SmoothingGroups`, `MergeExtension`, `BakeInstances`, `InvertGreen`, `DoubleSidedDelta`, `TerrainHeightmapTextureMapFormat`.

5. **Headless rendering**: The `--python` command-line flag suggests headless operation is possible, but PlantFactory may still require a display (macOS windowing). Testing needed.

### Lower priority:

6. **PlantCatalog integration**: `LoadPlantCatalogFile()` exists but requires PlantCatalog to be installed separately. Not needed if we build .tpf files manually.

7. **Wind/animation export**: Animation export works (`EAnimationFormat_AnimatedBones`) but our web pipeline uses static geometry. Could be valuable for future enhancements.

8. **Vertex color sets**: `AddVertexColorSet()` and `AddVertexColorSetChannel()` exist. Could be used for encoding growth data, AO, or other per-vertex information for the shader pipeline.

9. **JSON-RPC method catalog**: The `eon.JsonRPC()` function likely exposes many more internal methods. Runtime exploration via the Python console would reveal the full API surface.

---

## 9. Recommended Automation Strategy

### Phase 1: Template-Based Automation (Immediate)

1. **Build template .tpf files manually** in PlantFactory's GUI for each architectural model:
   - `template_rauh.tpf` -- Rauh's model (Eucalyptus, monopodial trees)
   - `template_leeuwenberg.tpf` -- Leeuwenberg's model (sympodial shrubs)
   - `template_tussock.tpf` -- graminoid tussock form
   - `template_reed.tpf` -- tall culm/reed form

2. **Write Python scripts** that:
   - Load the appropriate template
   - Set species-specific parameters (dimensions, angles, densities) via `NodeSetParam()`
   - Set maturity, health, season
   - Export to FBX with Blender preset

3. **Chain with existing Blender pipeline** for FBX -> GLB -> Draco

### Phase 2: Parametric Exploration (After runtime testing)

1. Use the Python console inside PlantFactory to explore:
   - Valid arguments for `AddNode()` (can we pass node IDs like 8037?)
   - Complete `NodeSetParam()` path syntax
   - `jsonRPC.Call()` method discovery
   - Material creation/editing methods

2. Build a **parameter mapping document** from runtime exploration

3. Develop **fully programmatic species generation** without manual templates

### Phase 3: Full Batch Pipeline

1. Command-line batch processing:
   ```bash
   for species in species_list; do
     PlantFactory.app/.../PlantFactory --python "generate_${species}.py" --
   done
   ```

2. Integration with `scripts/build-model-manifest.js` for automatic registry updates

---

## 10. File Locations Quick Reference

| Resource | Path |
|----------|------|
| Python API (eon.py) | `/Applications/PlantFactory/Python/PythonLib/eon.py` |
| Python API docs (HTML) | `/Applications/PlantFactory/Python/Documentation Files/` |
| Reference manual (PDF, 77MB) | `/Applications/PlantFactory/Documentation/TPF Documentation.pdf` |
| PlantCatalog exporter docs | `/Applications/PlantFactory/Documentation/En/PlantCatalogExporter Documentation.pdf` |
| Node tooltips/parameters | `/Applications/PlantFactory/Environment/node_tooltips.xml` |
| Export presets | `/Applications/PlantFactory/Environment/export_presets.xml` |
| Plant categories | `/Applications/PlantFactory/Environment/categories.xml` |
| Format modules | `/Applications/PlantFactory/Modules/*.eon` |
| Maya importer script | `/Applications/PlantFactory/Scripts/Maya/PlantFactoryImporter.py` |
| Rendering presets | `/Applications/PlantFactory/Environment/{Broadcast,Preview,Final,Superior,Ultra}.urs` |
| Metanodes | `/Applications/PlantFactory/Environment/Metanodes/` |
| User species (empty) | `~/Documents/e-on software/PlantFactory/Species/Personal/` |
| User materials (empty) | `~/Documents/e-on software/PlantFactory/Materials/Personal/` |
| App config | `~/Library/Application Support/e-on software/PlantFactory/Config/` |
| User Python scripts | `~/Library/Application Support/e-on software/PlantFactory/Python/` (empty) |
