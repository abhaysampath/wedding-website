#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const PICS_DIR = join(ROOT, 'public', 'pics');
const CONFIG_PATH = join(ROOT, 'src', 'config.js');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/abhaysampath/wedding-website@main/public';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

const SUBDIRS = ['home', 'vert', 'gallery'];

const SECTION_DIR_MAP = [
  { key: 'hero.slides', dir: 'home' },
  { key: 'ourStory.slides', dir: 'vert' },
  { key: 'gallery.home', dir: 'home' },
  { key: 'gallery.gallery', dir: 'gallery' },
  { key: 'gallery.vert', dir: 'vert' },
];

function extractInnerBlock(text, property) {
  const idx = text.indexOf(`${property}:`);
  if (idx === -1) return null;
  const brace = text.indexOf('{', idx);
  if (brace === -1) return null;
  let depth = 1;
  let pos = brace + 1;
  while (depth > 0 && pos < text.length) {
    if (text[pos] === '{') depth++;
    else if (text[pos] === '}') depth--;
    pos++;
  }
  if (depth !== 0) return null;
  return text.slice(brace + 1, pos - 1);
}

function extractArrayFileRefs(text, arrayProp) {
  const idx = text.indexOf(`${arrayProp}:`);
  if (idx === -1) return [];
  const bracket = text.indexOf('[', idx);
  if (bracket === -1) return [];
  let depth = 1;
  let pos = bracket + 1;
  while (depth > 0 && pos < text.length) {
    if (text[pos] === '[') depth++;
    else if (text[pos] === ']') depth--;
    pos++;
  }
  if (depth !== 0) return [];
  const arrayContent = text.slice(bracket, pos);
  return [...arrayContent.matchAll(/file:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
}

let configText;
try {
  configText = readFileSync(CONFIG_PATH, 'utf-8');
} catch (e) {
  console.error(`Error: Could not read config file at ${CONFIG_PATH}`);
  process.exit(1);
}

const imagesBlock = extractInnerBlock(configText, 'images');
if (!imagesBlock) {
  console.error('Error: Could not find `images` config object in src/config.js');
  process.exit(1);
}

const sections = {};
const heroBlock = extractInnerBlock(imagesBlock, 'hero');
sections['hero.slides'] = heroBlock ? extractArrayFileRefs(heroBlock, 'slides') : [];

const ourStoryBlock = extractInnerBlock(imagesBlock, 'ourStory');
sections['ourStory.slides'] = ourStoryBlock ? extractArrayFileRefs(ourStoryBlock, 'slides') : [];

const galleryBlock = extractInnerBlock(imagesBlock, 'gallery');
if (galleryBlock) {
  sections['gallery.home'] = extractArrayFileRefs(galleryBlock, 'home');
  sections['gallery.gallery'] = extractArrayFileRefs(galleryBlock, 'gallery');
  sections['gallery.vert'] = extractArrayFileRefs(galleryBlock, 'vert');
} else {
  for (const k of ['gallery.home', 'gallery.gallery', 'gallery.vert']) {
    sections[k] = [];
  }
}

const configuredByDir = {};
for (const { key, dir } of SECTION_DIR_MAP) {
  if (!configuredByDir[dir]) configuredByDir[dir] = new Set();
  for (const f of sections[key]) {
    configuredByDir[dir].add(f);
  }
}

const diskByDir = {};
for (const dir of SUBDIRS) {
  const dirPath = join(PICS_DIR, dir);
  if (!existsSync(dirPath)) {
    console.error(`Error: Directory not found: ${dirPath}`);
    process.exit(1);
  }
  try {
    const files = readdirSync(dirPath);
    diskByDir[dir] = new Set(
      files.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
    );
  } catch (e) {
    console.error(`Error reading directory ${dirPath}: ${e.message}`);
    diskByDir[dir] = new Set();
  }
}

let hasErrors = false;

console.log('');
console.log('='.repeat(66));
console.log('    Wedding Website — Image Validation');
console.log('='.repeat(66));
console.log('');

console.log('--- Configured References ---');
console.log('');

for (const { key, dir } of SECTION_DIR_MAP) {
  const files = sections[key];
  console.log(`  ${key}  (public/pics/${dir}/)`);
  for (const file of files) {
    const exists = diskByDir[dir]?.has(file) ?? false;
    const mark = exists ? ' ✓' : ' ✗';
    console.log(`    ${mark}  ${file}`);
    if (!exists) {
      const url = `${CDN_BASE}/pics/${dir}/${file}`;
      console.log(`         ${url}`);
      hasErrors = true;
    }
  }
  console.log('');
}

console.log('--- Orphaned Files (on disk but not referenced) ---');
console.log('');

let foundOrphans = false;
for (const dir of SUBDIRS) {
  const diskFiles = diskByDir[dir];
  if (!diskFiles || diskFiles.size === 0) continue;
  const orphans = [...diskFiles].filter(f => {
    const configured = configuredByDir[dir];
    return !configured || !configured.has(f);
  });
  if (orphans.length === 0) continue;
  foundOrphans = true;
  hasErrors = true;
  console.log(`  public/pics/${dir}/`);
  for (const file of orphans.sort()) {
    console.log(`    ✗  ${file}`);
  }
  console.log('');
}
if (!foundOrphans) {
  console.log('  (none)\n');
}

console.log('--- Summary ---');
console.log('');

let totalConfigured = 0;
for (const { key } of SECTION_DIR_MAP) totalConfigured += sections[key].length;

let totalOnDisk = 0;
for (const dir of SUBDIRS) totalOnDisk += (diskByDir[dir] || new Set()).size;

let totalMissing = 0;
for (const { key, dir } of SECTION_DIR_MAP) {
  for (const file of sections[key]) {
    if (!diskByDir[dir]?.has(file)) totalMissing++;
  }
}

let totalOrphans = 0;
for (const dir of SUBDIRS) {
  const diskFiles = diskByDir[dir];
  if (!diskFiles) continue;
  for (const f of diskFiles) {
    const configured = configuredByDir[dir];
    if (!configured || !configured.has(f)) totalOrphans++;
  }
}

console.log(`  Configured references:   ${totalConfigured}`);
console.log(`  Image files on disk:     ${totalOnDisk}`);
console.log(`  Missing from disk:       ${totalMissing}`);
console.log(`  Orphaned (unused):       ${totalOrphans}`);
console.log('');

if (hasErrors) {
  console.log('  Result: FAILED — issues found');
  console.log('');
  process.exit(1);
} else {
  console.log('  Result: PASSED — all images are valid');
  console.log('');
  process.exit(0);
}
