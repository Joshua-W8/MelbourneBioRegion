# Verdea — MVP Readiness Audit

Read-only assessment. No source files were modified. This document is the only file created.

---

## 1. Step 0 — State the audit ran against

- **Branch:** `feature/maplibre-migration`
- **HEAD:** `2aa598f79512c76ab9ff3560709a80e56103510f` — _"Move search bar to bottom-center and increase size"_ (2026-04-08)
- **`git pull --ff-only`:** `Already up to date.` (tracking `origin/feature/maplibre-migration`)
- **Working tree:** clean except two untracked files, left in place as instructed:
  - `public/data/study_area_boundary.geojson`
  - `public/data/study_area_mask.geojson`
  - (Neither is referenced anywhere in `src/` — see Finding S4.)

The branch name itself is a signal: the project is mid-migration to MapLibre, and the map layer reflects that (it is the newest, cleanest code).

---

## 2. Finding #0 — Which visual approach is actually implemented?

**Both exist. The 2.5D SVG cutaway is the live default and is the solid one; the 3D diorama is a fragile secondary view; and a *third*, earlier 3D implementation is dead code that was never removed.**

| Approach | File(s) | Status |
|---|---|---|
| **2.5D illustrated cross-section (SVG)** | `src/components/VegetationProfile.jsx` | **LIVE & PRIMARY.** Rendered inline inside `InfoPanel` in **both** map and diorama modes (`InfoPanel.jsx:610`). Fully data-driven: plant silhouettes placed by AusTraits `plant_height` (falling back to per-life-form defaults). Contains an inline component literally named `PlantSilhouette` (`VegetationProfile.jsx:188`). This is the documented "pivot" and it is the most complete, robust part of the visual layer. |
| **3D diorama (React Three Fiber + GLB)** | `DioramaView.jsx`, `PlantModel.jsx`, `GroundPlane.jsx`, `services/sceneComposer.js`, `services/modelResolver.js` | **LIVE but FRAGILE & SECONDARY.** Reachable via the "View 3D Ecosystem" button (`InfoPanel.jsx:442-458` → `setViewMode('diorama')` → `App.jsx:20-27` renders `DioramaView`). Renders procedural Three.js geometry for all 14 life forms plus a handful of real GLBs. Two likely runtime crashes (see B1, B2) and most registry-referenced GLBs are missing (Q6). The "River Red Gum keystone / benchmark-driven scene" concept survives here (`sceneComposer.js`, `model_registry.json`). |
| **Earlier 3D diorama** | `src/components/Diorama3D.jsx` (+ `Diorama3D.css`) | **DEAD.** Imported nowhere (only self-references). Also broken per lint (`Cannot call impure function during render`, unused vars). This is the half-built/abandoned remnant of the original full-diorama idea. |

So the contradiction in the docs resolves as: **the pivot happened (2.5D is live and always shown), but neither 3D implementation was cleaned up** — one 3D view is wired-but-fragile, the other is orphaned. `PlantSilhouette` is not a missing file; it lives embedded in `VegetationProfile.jsx`.

---

## 3. Inventory (Phase 1)

**Stack (installed, from `package.json`):** React 19.2, Vite 7.2, MapLibre GL 5.18, Three 0.182, @react-three/fiber 9.5, @react-three/drei 10.7, Zustand 5.0. ESLint 9.39 flat config. Node v24.16, npm 11.13. All dependencies are imported somewhere (no unused deps).

**Entry flow:** `main.jsx` → `App.jsx` → (`viewMode==='map'`) `MapView` + `AddressSearch` + `ContextFilters` + `InfoPanel` + `ThemeToggle`, or (`viewMode==='diorama'`) `DioramaView` + `ThemeToggle`.

**Used components:** MapView, InfoPanel, VegetationProfile, AddressSearch, ContextFilters, ThemeToggle, DioramaView, PlantModel, GroundPlane, PlantModal.
**Dead components:** Diorama3D, SpeciesPopup, DioramaInfoPanel (+ their CSS). All imported nowhere.

**`public/data/` files (size, used?):**

| File | Size | Type | Used by |
|---|---:|---|---|
| `vegetation_polygons.geojson` | 185 KB | GeoJSON (84 features) | MapView source — **core** |
| `evc_benchmarks.json` | 84 KB | benchmark registry (20 entries) | benchmarkService — **core** |
| `species_by_vegetation_type.json` | 111 KB | species registry (11 veg types) | speciesService — **core** |
| `species_traits.json` | 330 KB | AusTraits array (437 species) | speciesService — **core** |
| `pre-colonial-plants.json` | 674 KB | plant likelihood table | plantService — **used only for one count** (Q4) |
| `model_registry.json` | 4.8 KB | 3-tier model lookup | modelResolver — **core (diorama)** |
| `model_manifest.json` | 359 B | list of 8 real GLBs | modelResolver — **core (diorama)** |
| `melbourne_suburbs.geojson` | 6.4 MB | GeoJSON | MapView suburb overlay (toggle) |
| `scene_parameters.json` | 360 KB | scene params | **only read by dead `Diorama3D.jsx`** (S3) |
| `soil_types.geojson` | 63 KB | GeoJSON | **not referenced in `src/`** (S4) |
| `melbourne_vegetation_types_ari.geojson` | 360 KB | GeoJSON | **not referenced in `src/`** (S4) |
| `study_area_boundary.geojson` | 5.4 KB | GeoJSON (untracked) | **not referenced in `src/`** (S4) |
| `study_area_mask.geojson` | 5.0 KB | GeoJSON (untracked) | **not referenced in `src/`** (S4) |

**GLB models present (8):** `eucalyptus_camaldulensis/mature.glb`, `eucalyptus_viminalis/mature.glb`, `themeda_triandra/tussock_01.glb`, `themeda_triandra/temp.glb` (4.8 MB), `austrostipa_bigeniculata/grass_01.glb`, `callistemon_laevis/shrub_01.glb`, `callistemon_rigidus/shrub_01.glb`, `phragmites_australis/reed_01.glb`. Of these, only **3** are ever resolved by the registry (Q6); the rest are orphaned.

**No fauna code or fauna data was found anywhere** — correct, project is flora-only as scoped.

**Expected-artifact checklist (verified, not assumed):**

| Artifact | Present? | Notes |
|---|---|---|
| `modelResolver.js` | ✅ `src/services/modelResolver.js` | Used; 3-tier fallback with availability gating. Well-built. |
| `model_registry.json` | ✅ `public/data/` | Used; but references ~12 GLB paths that don't exist (Q6). |
| `model_manifest.json` | ✅ `public/data/` | Used; lists the 8 real GLBs. |
| `build-model-manifest.js` | ✅ `scripts/` | Exists but **not wired into `package.json` scripts** — a manual dev tool. |
| `vegetation_polygons.geojson` | ✅ `public/data/` | Used as the map source. 84 features. |
| `InfoPanel` | ✅ `src/components/InfoPanel.jsx` | Used in both modes. |
| `PlantSilhouette` | ⚠️ embedded | Not a standalone file — inline component in `VegetationProfile.jsx:188`. |

---

## 4. MVP flow trace (Phase 3)

Target: **map → click polygon → info panel (species + context) → visual cross-section.**

1. **Map renders** — `MapView.jsx:96-127`. MapLibre map, vegetation fill/stroke layers from `vegetation_polygons.geojson`. ✅ Solid.
2. **Polygon click wired** — `MapView.jsx:270-327`. Reads feature props, sets selection feature-state, `fitBounds`, calls `setSelectedEVC(...)`. ✅
3. **Store populates from real data** — `useMapStore.js:45-86`. On select: fetches `plants`, `initModelResolver()`, `getBenchmark(evc, bioregion)`, `logSpeciesForVegetationType(vegKey)`. ✅
4. **Info panel populates** — `InfoPanel.jsx`. Title, bioregion + conservation badge, EVC description, vegetation layers (accordions with benchmark cover bars + species cards), site conditions. ✅
5. **Visual cross-section renders** — `VegetationProfile.jsx` (2.5D SVG), rendered at `InfoPanel.jsx:610`. ✅ **This is the completed MVP visual.**
6. **3D diorama (optional expand)** — "View 3D Ecosystem" → `DioramaView`. ⚠️ **Two likely runtime crashes (B1, B2).**

**Data join verification (the critical part):** the polygon → benchmark → species chain lines up for the flagship type:
- Polygon properties carry `evc_number`, `bioregion`, `vegetation_type`, soil fields, `bcs_desc`, etc. (all read by `MapView.jsx:302-316`).
- Benchmark key `evc_{n}_{bioregion_slug}` matches **19 of 21** polygon combinations.
- Species key (slugified `vegetation_type`) matches **9 of 10** polygon vegetation types.
- For **"Grasslands and Woodlands on fertile plains"** (21 polygons, the largest): benchmark `evc_55_gippsland_plain` has every field the composer/profile read (`canopy.character_species`, `understorey[].code/cover_pct/num_species`, `typical_species[].code`, `ground_surface`, `large_trees`). All **16/16** prominent species have life-form codes, and **15/16** have real AusTraits `plant_height`.

**Conclusion:** the core flow (steps 1-5) is **complete and genuinely data-backed** for the primary vegetation type. The break is entirely in step 6 (the 3D diorama), plus data dead-ends for ~7 of 84 polygons (Q7).

---

## 5. Findings

Severity: **[MVP-BLOCKER]** blocks core flow end-to-end · **[QUALITY]** works but below portfolio standard · **[SCOPE-CREEP]** beyond MVP · **[NICE-TO-HAVE]** optional.

> Two blockers (B1, B2) are inferred from code + lint and are **very likely** but were **not reproduced at runtime** (this was a read-only static audit). Verify in the browser before acting — both are cheap to confirm.

| # | Sev | Finding | Evidence | Why it matters | Recommended action |
|---|---|---|---|---|---|
| **B1** | **MVP-BLOCKER** | **3D diorama has no `Suspense` boundary around the GLB loader.** `GLBModel` uses `useGLTF`, which suspends while loading. There is **zero** `Suspense` in the entire `src/` tree. The flagship grassland diorama is confirmed to mount a real GLB (Themeda triandra → `tussock_01.glb`). | `PlantModel.jsx:309-324` (`useGLTF`); `DioramaView.jsx:60-100` (Canvas, no Suspense); `grep Suspense src/` → none | When a real GLB renders with no Suspense boundary, React throws _"A component suspended while responding to synchronous input"_ — likely white-screening the 3D view for the primary type. | Wrap diorama/model contents in `<Suspense fallback={…}>`. **Verify at runtime first.** |
| **B2** | **MVP-BLOCKER** | **`PlantModal` violates Rules of Hooks** — early `return null` (line 29) precedes `useMemo` (line 34). In `DioramaView` the modal is **always mounted** and `plant` transitions `null → object` on click, changing hook count. | `PlantModal.jsx:29,34`; mounted at `DioramaView.jsx:103-106`; lint `react-hooks/rules-of-hooks` | React throws _"Rendered more hooks than during the previous render"_ when a user clicks a species in the diorama → crash. (In map mode the modal is conditionally mounted, so that path is safe.) | Move the `if (!plant) return null` **below** all hooks. **Verify at runtime.** |
| **B3** | **MVP-BLOCKER** | **Runtime external API calls violate the "fully static, no runtime API" MVP requirement.** `AddressSearch` calls Nominatim (geocoding) and the Victoria government WMS `GetFeatureInfo` (EVC lookup) live, on every use. It can also return EVCs **outside** the 84 curated polygons, which then have no benchmark/species → dead-ends. | `AddressSearch.jsx:42` (Vic WMS), `:73` (Nominatim); rendered by default `App.jsx:32` | Breaks the stated static-architecture criterion and the offline/deploy-anywhere promise; introduces two fragile third-party dependencies and inconsistent data shapes. (The map click-flow does not depend on it.) | For MVP: cut the address search feature (see S1), or gate it behind the curated dataset only. |
| **Q1** | QUALITY | **Lint fails: 22 errors + 1 warning.** Mostly unused vars, plus `set-state-in-effect` (AddressSearch, SpeciesPopup, DioramaInfoPanel) and `Cannot call impure function during render` (`Math.random()` in `PlantModel` shrub layout; Diorama3D). | `npm run lint`; e.g. `PlantModel.jsx:118,120`, `VegetationProfile.jsx:188,218,326`, `speciesService.js:64,98` | Portfolio code should lint clean; the impure-render and set-state-in-effect items are real React smells. | Fix the two real categories; delete dead files (S3) to clear ~6 of them. |
| **Q2** | QUALITY | **Heavy console logging on every polygon click** — full benchmark dump, per-species trait dump, scene-composition table, registry stats. | `benchmarkService.js:46-141`, `speciesService.js:93-160`, `sceneComposer.js:394-408`, `modelResolver.js:196-197` | Production console spam; reads as debug-grade, not portfolio-grade. | Gate logs behind a `DEBUG` flag or remove. |
| **Q3** | QUALITY | **2.3 MB JS bundle (647 KB gzip); no code-splitting.** All of Three.js/R3F/drei ships to every visitor, including those who only view the map + SVG cross-section. | `npm run build` output; `DioramaView` statically imported in `App.jsx:6` | Slow first load for a portfolio piece whose default view needs none of Three.js. | `React.lazy` the `DioramaView` (and its Three deps) behind the diorama toggle. |
| **Q4** | QUALITY | **Two overlapping species datasets.** `plants` (from the 674 KB `pre-colonial-plants.json`, via `plantService`) is loaded on every click but feeds **only** the "_N recorded in this vegetation type_" subtitle number; everything else uses `speciesData`. | `plantService.js`, consumed at `InfoPanel.jsx:311,364` | 674 KB + a whole service + an EVC→vegType mapping table for one integer. | Derive the count from `speciesData`, or drop the second dataset. |
| **Q5** | QUALITY | **Three divergent vegetation-type slug functions.** `vegetationTypeToKey` (store), `vegetationTypeToFieldName` (plantService), `buildKey` (benchmarkService) each slugify differently. | `useMapStore.js:12-18`, `plantService.js:22-27`, `benchmarkService.js:30-33` | Silent join failures when a new name/format doesn't match one of the three transforms. | Centralize one slug helper. |
| **Q6** | QUALITY | **`model_registry.json` is badly out of sync with actual GLBs.** Of ~15 registry paths, only **3** resolve to real files (E. camaldulensis, Themeda, Austrostipa). All genus entries (`sheoak.glb`, `banksia.glb`, `paperbark.glb`, …) and **all** `_generic` life-form fallbacks are missing. Meanwhile 3 present GLBs (E. viminalis, both Callistemon, Phragmites) are orphaned — never referenced by the registry. | `model_registry.json` vs `public/models/**` + `model_manifest.json` | The 3D diorama is ~95% procedural geometry despite the elaborate registry; the model pipeline is mostly aspirational. Graceful (resolver gates on `available`), but misleading. | Prune the registry to what exists, or accept it's procedural-first and document that. |
| **Q7** | QUALITY | **~7 of 84 polygons dead-end on data.** `evc_991` (Saltwater wetland, 5 polygons) and `evc_992` (2 polygons) have **no benchmark**; the `Saltwater wetland` vegetation type has **no species entry**. Those clicks show "_Benchmark data not yet available_" and no profile/diorama. | benchmark keys vs polygon combos; species keys vs polygon `vegetation_type` | Clicking certain polygons produces an empty panel — looks broken to a reviewer. | For MVP, either add the missing data or filter those polygons out of the layer. |
| **Q8** | QUALITY | **`sceneComposer` computes per-instance variation that is never applied.** `instance_height`, `rotation_y`, `xz_skew` are produced per instance but `DioramaView`/`PlantModel` ignore them (no rotation/scale variation). `matchSpeciesToBenchmark` is called for side effect and its return discarded. | `sceneComposer.js:154-175,245-258`; `DioramaView.jsx:75-88`; `useMapStore.js:83` | Dead computation; trees/tussocks render identical and axis-aligned, undercutting the diorama's realism. | Apply the variation in `PlantModel`, or remove it. |
| **S1** | SCOPE-CREEP | **Address search feature** (Nominatim + WMS) is beyond the MVP flow and is the sole source of B3. | `AddressSearch.jsx` (whole file) | Maintenance + external-dependency cost; the documented primary risk (scope creep) made concrete. | **Cut for MVP** (resolves B3 too), or park behind a flag. |
| **S2** | SCOPE-CREEP | **Bespoke-GLB model pipeline**: `scripts/build-model-manifest.js`, `scripts/generate-model-thumbnails.js`, `scripts/plantfactory/*` (10+ Python probe scripts), `trait_pipeline/`, 8 GLBs incl. a 4.8 MB `themeda_triandra/temp.glb`. | `scripts/`, `trait_pipeline/`, `public/models/` | This is the "full diorama" ambition still being pursued — highest scope-creep / maintenance cost in the repo. | Park; keep pipeline out of the app critical path. Remove `temp.glb`. |
| **S3** | SCOPE-CREEP | **Dead components + their only data consumer.** `Diorama3D.jsx`, `SpeciesPopup.jsx`, `DioramaInfoPanel.jsx` (+ 3 CSS files) imported nowhere; `scene_parameters.json` (360 KB) is read **only** by dead `Diorama3D.jsx`. Also dead exports `getSpeciesForVegetationType`, `getVegetationTypeKeys` (`speciesService.js`). | `grep` import graph; `Diorama3D.jsx:` fetch of `scene_parameters` | Confuses "which visual is real"; carries lint errors and 360 KB of orphaned data. | Delete the 3 dead components + CSS; drop `scene_parameters.json` unless the pipeline needs it. |
| **S4** | SCOPE-CREEP | **Orphan data files** not referenced in `src/`: `soil_types.geojson`, `melbourne_vegetation_types_ari.geojson`, and the two untracked `study_area_*.geojson`. | `grep /data/... src/` | ~430 KB + two untracked files shipped/managed for nothing. | Remove from `public/data`, or move to a data-source folder outside the build. |
| **N1** | NICE-TO-HAVE | Copy-species-list button, model thumbnails, theme toggle, suburb overlay + `ContextFilters` toggles. | `InfoPanel.jsx:118-140`, `ThemeToggle.jsx`, `ContextFilters.jsx` | Genuine polish; not required for MVP but not harmful. | Keep. |

---

## 6. Prioritised next steps (discrete — each is its own follow-up prompt; none executed here)

1. **Verify B1 at runtime:** open the flagship grassland diorama in the browser, confirm the Suspense crash, then add a single `<Suspense>` boundary around the diorama scene / GLB models.
2. **Verify B2 at runtime:** click a species inside the diorama, confirm the hooks crash, then reorder `PlantModal` so `useMemo` precedes the `if (!plant) return null`.
3. **Decide the address-search question (B3/S1):** cut the feature for the static MVP, or constrain it to the curated dataset with no live API. (Recommend cut.)
4. **Delete dead code (S3):** remove `Diorama3D.*`, `SpeciesPopup.*`, `DioramaInfoPanel.*`, dead `speciesService` exports, and `scene_parameters.json` if unused — then re-run lint.
5. **Get lint to zero (Q1):** fix `set-state-in-effect` and impure-`Math.random()`-in-render; clear unused vars.
6. **Code-split the diorama (Q3):** `React.lazy` `DioramaView` so the map view stops shipping Three.js.
7. **Close the data dead-ends (Q7):** add benchmark/species for `evc_991`/`evc_992`/Saltwater wetland, or filter those polygons out.
8. **Reconcile the model registry (Q6):** prune to GLBs that exist (or register the 3 orphaned ones), and document that the diorama is procedural-first.
9. **Remove console spam (Q2)** and centralise the three slug functions (Q5).
10. **Trim orphan/heavy data (Q4/S2/S4):** derive the "recorded" count from `speciesData` and drop `pre-colonial-plants.json`; remove `temp.glb` and unreferenced geojson.

---

## 7. What's actually solid (don't touch)

- **`MapView.jsx`** — clean MapLibre integration: feature-state hover/selection, data-driven fill colours, `fitBounds` with panel padding, reset control, theme swap. The strongest file in the repo.
- **The core map → click → store → InfoPanel → 2.5D `VegetationProfile` flow** — complete and genuinely data-backed for the flagship type (16/16 life forms, 15/16 real heights). This *is* a working MVP for the primary vegetation type.
- **`VegetationProfile.jsx`** — the 2.5D cutaway is deterministic, honest about its data (real AusTraits heights, documented per-life-form fallbacks), interactive (layer highlight/toggle), and needs no Three.js. This is the right visual to build the case study around.
- **The data model + services** — `benchmarkService`, `speciesService`, and the benchmark/species/traits join keys are coherent and mostly line up (19/21, 9/10). `modelResolver`'s 3-tier lookup with `available` gating is well-designed and degrades gracefully.
- **`useMapStore.js`** — small, correct Zustand store; clear selection lifecycle.
- **Build passes**; flora-only scope is respected (no fauna code or data anywhere).

---

## Top 3 MVP-blockers

1. **B1 — 3D diorama has no `Suspense` boundary around `useGLTF`.** The flagship grassland diorama mounts a real GLB (Themeda triandra) with no boundary anywhere in `src/`, which will almost certainly crash the 3D view. _(Verify at runtime; one-line fix.)_
2. **B2 — `PlantModal` breaks the Rules of Hooks** (early return before `useMemo`). Because the modal is permanently mounted in `DioramaView`, clicking a species there flips `plant` `null → object` and crashes React. _(Verify at runtime; reorder the hook.)_
3. **B3 — Runtime external API calls** (Nominatim + Victoria WMS in `AddressSearch`) violate the "fully static, no runtime API" MVP requirement and can strand users on EVCs with no data. Cutting the address-search feature resolves both the architecture violation and the top scope-creep item.
