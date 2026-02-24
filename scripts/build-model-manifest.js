/**
 * build-model-manifest.js
 *
 * Scans public/models/ for .glb files and _thumbnails/ for .png files,
 * then writes a manifest to public/data/model_manifest.json.
 *
 * Manifest format:
 * {
 *   "models": ["eucalyptus_camaldulensis/mature.glb", ...],
 *   "thumbnails": {
 *     "eucalyptus_camaldulensis/mature.glb": "_thumbnails/eucalyptus_camaldulensis_mature.png"
 *   }
 * }
 *
 * Thumbnail naming convention:
 *   GLB path "folder/file.glb" → thumbnail "folder_file.png"
 *
 * Usage: node scripts/build-model-manifest.js
 * Runs automatically via prebuild/predev hooks.
 */

import { readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODELS_DIR = join(__dirname, '..', 'public', 'models');
const THUMBNAILS_DIR = join(MODELS_DIR, '_thumbnails');
const OUTPUT_PATH = join(__dirname, '..', 'public', 'data', 'model_manifest.json');

function scanGLBFiles(dir, baseDir) {
  const results = [];

  for (const entry of readdirSync(dir)) {
    if (entry === '_thumbnails') continue; // skip thumbnails folder
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...scanGLBFiles(fullPath, baseDir));
    } else if (entry.endsWith('.glb')) {
      results.push(relative(baseDir, fullPath));
    }
  }

  return results;
}

/**
 * For a GLB path like "eucalyptus_camaldulensis/mature.glb",
 * derive the expected thumbnail name: "eucalyptus_camaldulensis_mature.png"
 */
function glbToThumbnailName(glbPath) {
  return glbPath
    .replace(/\//g, '_')
    .replace(/\.glb$/, '.png');
}

const models = scanGLBFiles(MODELS_DIR, MODELS_DIR).sort();

// Scan for thumbnails and match to GLB paths
const thumbnails = {};
for (const glbPath of models) {
  const thumbName = glbToThumbnailName(glbPath);
  const thumbFullPath = join(THUMBNAILS_DIR, thumbName);
  if (existsSync(thumbFullPath)) {
    thumbnails[glbPath] = `_thumbnails/${thumbName}`;
  }
}

const manifest = { models, thumbnails };

writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Model manifest: ${models.length} GLB file${models.length !== 1 ? 's' : ''} found`);
models.forEach(m => {
  const thumb = thumbnails[m] ? ` (thumbnail: ${thumbnails[m]})` : '';
  console.log(`  ${m}${thumb}`);
});
if (Object.keys(thumbnails).length > 0) {
  console.log(`Thumbnails: ${Object.keys(thumbnails).length} matched`);
}
