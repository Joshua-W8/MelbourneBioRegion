/**
 * generate-model-thumbnails.js
 *
 * TODO: Headless Three.js rendering of GLB models to 200x200 PNG thumbnails.
 * For now this is a stub — thumbnails are generated manually from Blender
 * and placed in public/models/_thumbnails/.
 *
 * Expected output per GLB:
 *   eucalyptus_camaldulensis/mature.glb → _thumbnails/eucalyptus_camaldulensis_mature.png
 *
 * Future implementation will:
 *   - Load each GLB via three.js + node-canvas (or headless-gl)
 *   - Auto-scale to fit a 200×200 viewport
 *   - Camera at ~30° above horizontal, fixed distance
 *   - Directional light + ambient, transparent background
 *   - Write PNG to public/models/_thumbnails/
 *
 * Usage: node scripts/generate-model-thumbnails.js
 */

console.log('Thumbnail generation is manual for now — drop PNGs into public/models/_thumbnails/');
console.log('Naming convention: {folder}_{filename}.png');
console.log('  e.g. eucalyptus_camaldulensis_mature.png');
console.log('  e.g. themeda_triandra_tussock_01.png');
