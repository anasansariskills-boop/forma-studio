#!/usr/bin/env node
// FORMA Studio image pipeline.  Modes:
//   node scripts/build-images.mjs contact [theme ...]   -> download candidate thumbs + build labelled contact sheets
//   node scripts/build-images.mjs build                 -> read scripts/image-manifest.json, download + emit final variants
//   node scripts/build-images.mjs verify                -> re-run verification only
// Dependency-light: node fetch + sharp only. ~4 concurrent downloads.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'client', 'public', 'img');
const CONTACT_DIR = path.join(IMG_DIR, '_contact');
const MANIFEST = path.join(ROOT, 'scripts', 'image-manifest.json');
const CAND_MAIN = path.join(ROOT, 'scripts', 'unsplash-candidates.json');
const CAND_PORTRAIT = path.join(ROOT, 'scripts', 'unsplash-portraits.json');

const CONCURRENCY = 4;

function loadCandidates() {
  const merged = {};
  for (const f of [CAND_MAIN, CAND_PORTRAIT]) {
    if (fs.existsSync(f)) Object.assign(merged, JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  return merged;
}

function cdnUrl(id, w, q) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&fm=jpg&fit=crop&crop=entropy`;
}

async function fetchBuf(id, w, q, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(cdnUrl(id, w, q), { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${id}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`suspiciously small body (${buf.length}B) for ${id}`);
      return buf;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

async function pool(items, worker, concurrency = CONCURRENCY) {
  const results = [];
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const my = idx++;
      results[my] = await worker(items[my], my);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function numLabel(n, w, h) {
  const svg = `<svg width="${w}" height="46"><rect width="100%" height="100%" fill="rgba(18,16,14,0.82)"/>
  <text x="14" y="32" font-family="monospace" font-size="26" font-weight="700" fill="#f4efe6">${n}</text></svg>`;
  return Buffer.from(svg);
}

async function buildSheet(theme, items) {
  const TILE_W = 320, TILE_H = 214, LABEL_H = 46, PAD = 6;
  const tiles = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const buf = await fetchBuf(it.id, 420, 60).catch(() => null);
    if (!buf) { tiles.push({ i, tile: null }); continue; }
    const img = await sharp(buf).resize(TILE_W, TILE_H, { fit: 'cover', position: 'entropy' }).png().toBuffer();
    const labelled = await sharp(img)
      .composite([{ input: numLabel(i + 1, TILE_W, LABEL_H), gravity: 'southwest' }])
      .extend({ bottom: 0 })
      .resize(TILE_W, TILE_H + LABEL_H)
      .png()
      .toBuffer();
    tiles.push({ i, tile: labelled });
  }
  const cols = 3;
  const rows = Math.ceil(tiles.length / cols);
  const rowImgs = [];
  for (let r = 0; r < rows; r++) {
    const slice = tiles.slice(r * cols, r * cols + cols);
    const valid = slice.filter((t) => t.tile);
    if (!valid.length) continue;
    const width = valid.length * (TILE_W + PAD) - PAD;
    const height = TILE_H + LABEL_H;
    const joinBuf = await sharp({
      create: { width, height, channels: 3, background: { r: 24, g: 22, b: 20 } },
    })
      .composite(valid.map((t, k) => ({ input: t.tile, left: k * (TILE_W + PAD), top: 0 })))
      .png()
      .toBuffer();
    rowImgs.push(joinBuf);
  }
  const maxW = Math.max(...rowImgs.map((b) => sharp(b).metadata)); // placeholder, replaced below
  // join rows vertically
  const rowMeta = [];
  for (const b of rowImgs) rowMeta.push(await sharp(b).metadata());
  const sheetW = Math.max(...rowMeta.map((m) => m.width));
  const sheetH = rowMeta.reduce((a, m) => a + m.height + PAD, PAD);
  const comps = [];
  let top = PAD;
  for (let r = 0; r < rowImgs.length; r++) {
    comps.push({ input: rowImgs[r], left: 0, top });
    top += rowMeta[r].height + PAD;
  }
  const sheet = await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: { r: 24, g: 22, b: 20 } } })
    .composite(comps)
    .jpeg({ quality: 72 })
    .toBuffer();
  fs.writeFileSync(path.join(CONTACT_DIR, `sheet-${theme}.jpg`), sheet);
  void maxW;
  return tiles.filter((t) => t.tile).length;
}

async function contactMode(themes) {
  const cands = loadCandidates();
  const list = themes && themes.length ? themes : Object.keys(cands).filter((t) => cands[t] && cands[t].length);
  fs.mkdirSync(CONTACT_DIR, { recursive: true });
  const notes = [];
  for (const theme of list) {
    const items = (cands[theme] || []).slice(0, 6);
    if (!items.length) { console.log(`[contact] skip empty theme ${theme}`); continue; }
    const ok = await buildSheet(theme, items);
    console.log(`[contact] sheet-${theme}.jpg  (${ok}/${items.length} tiles)`);
    notes.push(`### ${theme}`);
    items.forEach((it, i) => notes.push(`${i + 1}. id=${it.id} user=${it.user} alt=${it.alt}`));
    notes.push('');
  }
  fs.writeFileSync(path.join(CONTACT_DIR, 'notes.txt'), notes.join('\n'));
  console.log(`[contact] wrote ${CONTACT_DIR}/notes.txt`);
}

function outPaths(key) {
  const rel = key.split('/');
  const dir = path.join(IMG_DIR, ...rel.slice(0, -1));
  const base = rel[rel.length - 1];
  return { dir, base };
}

const QUALITY = { jpgLarge: 76, webpLarge: 72, jpgSmall: 74, webpSmall: 70 };
const MIN_BYTES = 4096;

// Encode to a format/quality, but if the result is pathologically small (flat/dark
// source at tiny size), bump quality until it clears the 4KB sanity floor. Normal
// files keep the exact spec quality.
async function encodeMin(buf, kind, q) {
  let qq = q;
  let out;
  for (;;) {
    out = kind === 'webp'
      ? await sharp(buf).webp({ quality: qq, effort: 5 }).toBuffer()
      : await sharp(buf).jpeg({ quality: qq, mozjpeg: true, progressive: true }).toBuffer();
    if (out.length >= MIN_BYTES || qq >= 90) return out;
    qq += 6;
  }
}

async function buildOne(entry) {
  const { dir, base } = outPaths(entry.key);
  fs.mkdirSync(dir, { recursive: true });
  const LW = entry.width;              // large long-edge (1600 or 800)
  const SW = Math.round(LW / 2);       // small long-edge (800 or 400)
  const src = await fetchBuf(entry.unsplashId, LW, 85);
  // Cap the LONG edge at LW (fit:inside) so portrait sources don't balloon to 1600x2400.
  // Landscape keys keep full width; portrait keys shrink to <=LW on both axes; aspect preserved.
  const largeBuf = await sharp(src).resize({ width: LW, height: LW, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const smBuf = await sharp(largeBuf).resize({ width: SW, height: SW, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  await fs.promises.writeFile(path.join(dir, `${base}.jpg`), await encodeMin(largeBuf, 'jpg', QUALITY.jpgLarge));
  await fs.promises.writeFile(path.join(dir, `${base}.webp`), await encodeMin(largeBuf, 'webp', QUALITY.webpLarge));
  await fs.promises.writeFile(path.join(dir, `${base}-sm.jpg`), await encodeMin(smBuf, 'jpg', QUALITY.jpgSmall));
  await fs.promises.writeFile(path.join(dir, `${base}-sm.webp`), await encodeMin(smBuf, 'webp', QUALITY.webpSmall));
  const m = await sharp(largeBuf).metadata();
  return { key: entry.key, width: m.width, height: m.height };
}

async function buildMode() {
  if (!fs.existsSync(MANIFEST)) throw new Error(`manifest not found: ${MANIFEST}`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const failed = [];
  const dims = {};
  await pool(manifest, async (entry) => {
    try {
      const r = await buildOne(entry);
      dims[r.key] = r;
    } catch (e) {
      failed.push({ key: entry.key, id: entry.unsplashId, err: String(e.message || e) });
    }
  }, CONCURRENCY);
  if (failed.length) {
    console.error('\n[build] FAILED to download/encode:');
    for (const f of failed) console.error(`  - ${f.key} (id=${f.id}): ${f.err}`);
    throw new Error(`${failed.length} image(s) failed`);
  }
  for (const entry of manifest) {
    const d = dims[entry.key];
    if (d) entry.height = d.height; // keep entry.width as the requested max (1600/800)
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[build] encoded ${manifest.length} keys; wrote dimensions back to manifest`);
  await verifyMode(manifest);
}

async function verifyMode(manifest) {
  manifest = manifest || JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const problems = [];
  const oversized = [];
  let totalBytes = 0, totalFiles = 0;
  const LW = (e) => e.width;
  for (const entry of manifest) {
    const { dir, base } = outPaths(entry.key);
    const files = [`${base}.jpg`, `${base}.webp`, `${base}-sm.jpg`, `${base}-sm.webp`];
    for (const f of files) {
      const fp = path.join(dir, f);
      if (!fs.existsSync(fp)) { problems.push(`MISSING ${entry.key}: ${f}`); continue; }
      const st = fs.statSync(fp);
      totalBytes += st.size; totalFiles++;
      if (st.size < 4096) problems.push(`TOO SMALL (<4KB) ${entry.key}/${f} = ${st.size}B`);
      try {
        const m = await sharp(fp).metadata();
        const maxW = f.includes('-sm.') ? Math.round(LW(entry) / 2) : LW(entry);
        if (m.width > maxW) problems.push(`WIDTH ${entry.key}/${f} ${m.width} > ${maxW}`);
      } catch (e) {
        problems.push(`UNDECODABLE ${entry.key}/${f}: ${e.message}`);
      }
    }
    const keyBytes = files.reduce((a, f) => { const fp = path.join(dir, f); return a + (fs.existsSync(fp) ? fs.statSync(fp).size : 0); }, 0);
    if (keyBytes > 250 * 1024) oversized.push(`${entry.key} = ${(keyBytes / 1024).toFixed(0)}KB`);
  }
  const distinct = new Set(manifest.map((e) => e.unsplashId)).size;
  console.log('\n===== FORMA image verification =====');
  console.log(`total keys        : ${manifest.length}`);
  console.log(`total files       : ${totalFiles}`);
  console.log(`total bytes       : ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${totalBytes} B)`);
  console.log(`mean bytes / key  : ${Math.round(totalBytes / manifest.length)} B (${(totalBytes / manifest.length / 1024).toFixed(1)} KB)`);
  console.log(`distinct sources  : ${distinct}`);
  if (oversized.length) console.log(`over 250KB keys : ${oversized.join(', ')}`);
  else console.log(`over 250KB keys : none`);
  if (problems.length) {
    console.log(`\nPROBLEMS (${problems.length}):`);
    for (const p of problems) console.log('  - ' + p);
  } else console.log('\nall files present, decodable, correct size/width bounds.');
  if (distinct < 55) { console.error(`\nASSERT FAILED: distinct source count ${distinct} < 55`); process.exitCode = 1; }
  if (problems.length) { process.exitCode = 1; }
  return { totalBytes, totalFiles, distinct, problems, oversized };
}

const mode = process.argv[2] || 'build';
if (mode === 'contact') contactMode(process.argv.slice(3)).catch((e) => { console.error(e); process.exit(1); });
else if (mode === 'build') buildMode().catch((e) => { console.error(e); process.exit(1); });
else if (mode === 'verify') verifyMode().catch((e) => { console.error(e); process.exit(1); });
else { console.error('unknown mode: ' + mode); process.exit(1); }
