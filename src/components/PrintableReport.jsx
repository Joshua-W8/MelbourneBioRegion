import useMapStore from '../store/useMapStore';
import VegetationProfile from './VegetationProfile';
import { BioregionSubtitle, EVCDescription, StructuralTargets } from './InfoPanel';
import {
  LAYER_GROUPS,
  LAYER_GROUP_ORDER,
  lifeFormToGroup,
  STRUCTURE_DISCLAIMER,
} from '../data/layerGroups';
import './PrintableReport.css';

const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';

// Full species list, grouped by layer — the print equivalent of the on-screen
// VegetationLayers accordions, expanded (no collapse / "show more").
function PrintSpeciesList() {
  const speciesData = useMapStore((state) => state.speciesData);
  const all = [...(speciesData?.prominent || []), ...(speciesData?.present || [])];
  if (all.length === 0) return null;

  const groups = {};
  for (const key of LAYER_GROUP_ORDER) groups[key] = [];
  const seen = new Set();
  for (const sp of all) {
    if (seen.has(sp.species)) continue;
    seen.add(sp.species);
    groups[lifeFormToGroup(sp.life_form_code || '')].push(sp);
  }

  return (
    <div className="print-species">
      <h2 className="print-h2">Indicative species list</h2>
      {LAYER_GROUP_ORDER.map((key) => {
        const list = groups[key];
        if (list.length === 0) return null;
        return (
          <div key={key} className="print-species-group">
            <h3 className="print-h3" style={{ color: LAYER_GROUPS[key].color }}>
              {LAYER_GROUPS[key].label} <span className="print-count">({list.length})</span>
            </h3>
            <ul className="print-species-ul">
              {list.map((sp, i) => {
                const common = sp.common_name || sp.commonName || '';
                return (
                  <li key={`${sp.species}-${i}`}>
                    {common ? `${common.split(',')[0].trim()} — ` : ''}
                    <em>{sp.species}</em>
                    {sp.life_form_code ? ` · ${sp.life_form_code}` : ''}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// Hidden on screen; rendered only when the browser prints (see PrintableReport.css).
// Reads the same store data as the on-screen result — no new data path.
export default function PrintableReport() {
  const selectedEVC = useMapStore((state) => state.selectedEVC);
  if (!selectedEVC) return null;

  return (
    <div className="printable-report" aria-hidden="true">
      {/* Page 1 — community + structure */}
      <section className="report-page">
        <header className="print-header">
          <h1 className="print-title">Verdea — Pre-colonial vegetation report</h1>
          <div className="print-community">
            {selectedEVC.evc
              ? `EVC ${selectedEVC.evc} · ${selectedEVC.evcName}`
              : selectedEVC.evcName}
          </div>
          <BioregionSubtitle />
          {selectedEVC.searchedAddress && (
            <div className="print-address">{selectedEVC.searchedAddress}</div>
          )}
        </header>
        <EVCDescription />
        <StructuralTargets />
      </section>

      {/* Page 2 — species list */}
      <section className="report-page">
        <PrintSpeciesList />
      </section>

      {/* Page 3 — 2.5D cross-section (the same SVG component as on screen) */}
      <section className="report-page">
        <h2 className="print-h2">Vegetation cross-section (2.5D)</h2>
        <div className="print-profile">
          <VegetationProfile activeLayer={null} onLayerChange={() => {}} />
        </div>
      </section>

      {/* Page 4 — methodology, attribution, disclaimer */}
      <section className="report-page">
        <h2 className="print-h2">Methodology, data &amp; disclaimer</h2>
        <p className="print-body">
          Structure and species information is derived from the Victorian modelled 1750
          (pre-European settlement) Ecological Vegetation Class (EVC) benchmarks for the
          matched EVC and bioregion. Figures describe the benchmark reference state of the
          vegetation community at a landscape scale; they are not measurements of the
          selected site.
        </p>
        <p className="print-body print-disclaimer">{STRUCTURE_DISCLAIMER}</p>

        <h3 className="print-h3">Data attribution</h3>
        <p className="print-body">
          Vegetation data: © State of Victoria (Department of Energy, Environment and Climate
          Action). Native Vegetation — Modelled 1750 Ecological Vegetation Classes, licensed
          under Creative Commons Attribution 4.0 International (CC BY 4.0),{' '}
          <span className="print-link">{LICENCE_URL}</span>. Modified from the original:
          clipped to the study area and reshaped for display.
        </p>
        <p className="print-footnote">Generated with Verdea.</p>
      </section>
    </div>
  );
}
