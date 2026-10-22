#!/usr/bin/env node
// Upload episode audio to Vercel Blob and (re)write data/episodes.json.
//
//   node scripts/publish-episodes.mjs                 everything in ../podcast
//   node scripts/publish-episodes.mjs --only R07,R08  just those recordings
//   node scripts/publish-episodes.mjs --dir ~/audio   a different folder
//
// Titles, dates, track numbers and durations come from the m4a tags
// (ffprobe), so name + tag a new file and it just shows up. Re-runnable: a
// file already in the manifest (same filename and byte size) is skipped, so
// only new recordings are uploaded. The store's read-write token is read
// from .env.blob (see README).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'data', 'episodes.json');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const audioDir = path.resolve(flag('dir') || path.join(root, '..', 'podcast'));
const only = (flag('only') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

async function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const file of ['.env.blob', '.env.local']) {
    const env = await readFile(path.join(root, file), 'utf8').catch(() => '');
    const m = /^BLOB_READ_WRITE_TOKEN=["']?([^"'\r\n]+)/m.exec(env);
    if (m) return m[1];
  }
  throw new Error('No BLOB_READ_WRITE_TOKEN. Put the tmko-podcast-audio store\'s read-write token in podcast-site/.env.blob (see README).');
}

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', file]);
  const f = JSON.parse(stdout).format;
  const tags = Object.fromEntries(Object.entries(f.tags || {}).map(([k, v]) => [k.toLowerCase(), v]));
  return { tags, duration: Number(f.duration), bytes: Number(f.size) };
}

async function upload(file, pathname, token) {
  // The CLI reports its result ("> Success! <url>") on stderr, so search both.
  const { stdout, stderr } = await run(
    'vercel',
    [
      'blob', 'put', file,
      '--access', 'public',
      '--pathname', pathname,
      '--add-random-suffix', 'true',
      '--content-type', 'audio/mp4',
      '--cache-control-max-age', '31536000',
    ],
    { cwd: root, env: { ...process.env, BLOB_READ_WRITE_TOKEN: token }, maxBuffer: 16 * 1024 * 1024, timeout: 45 * 60 * 1000 }
  );
  const out = `${stdout}\n${stderr}`;
  const url = /https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[^\s"']+/i.exec(out);
  if (!url) throw new Error(`Could not find the blob URL in the CLI output:\n${out}`);
  return url[0];
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"edition":"","episodes":[]}'));
const files = (await readdir(audioDir)).filter((f) => /^TMKO_R\d+_.*\.m4a$/i.test(f)).sort();
const token = await blobToken();

for (const [i, name] of files.entries()) {
  const code = /_R(\d+)_/i.exec(name)[0].replace(/_/g, '').toUpperCase();
  if (only.length && !only.includes(code)) continue;

  const file = path.join(audioDir, name);
  const { size } = await stat(file);
  const existing = manifest.episodes.find((e) => e.file === name);
  if (existing && existing.bytes === size) {
    console.log(`[${i + 1}/${files.length}] ${code} already uploaded, skipping`);
    continue;
  }

  const { tags, duration, bytes } = await probe(file);
  const number = Number(tags.track) || Number(code.slice(1));
  console.log(`[${i + 1}/${files.length}] ${code} "${tags.title}" (${(bytes / 1e6).toFixed(0)} MB) uploading...`);
  const src = await upload(file, `listening-edition-01/${name}`, token);

  manifest.edition = (tags.album || '').replace(/^TMKO\s*[-–—]\s*/i, '') || manifest.edition;
  manifest.episodes = manifest.episodes.filter((e) => e.file !== name);
  manifest.episodes.push({
    id: code.toLowerCase(),
    number,
    code,
    title: tags.title || name,
    date: tags.date || /_(\d{4}-\d{2}-\d{2})_/.exec(name)?.[1] || '',
    duration: Math.round(duration * 100) / 100,
    bytes,
    file: name,
    src,
  });
  manifest.episodes.sort((a, b) => a.number - b.number);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`          -> ${src}`);
}

console.log(`\n${manifest.episodes.length} episodes in data/episodes.json`);
