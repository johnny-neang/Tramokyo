#!/usr/bin/env node
// Publish podcast recordings. Uploads new audio from ./podcast to the
// tmko-podcast-audio Blob store (public, Sparkle Muffin team) and adds it to
// the episode list, podcast/episodes.json in the private tmko-podcast-likes
// store, which /api/podcast/episodes serves. The repo is public, so the audio
// URLs never go in git. Titles, dates, track numbers and durations come from
// the m4a tags; recordings already on the list are skipped.
//
//   node scripts/publish-podcast.mjs                 everything in ./podcast
//   node scripts/publish-podcast.mjs --only R15,R16  just those recordings
//   node scripts/publish-podcast.mjs --dir ~/audio   a different folder
//
// Tokens come from the environment, or else from these gitignored files:
//   AUDIO_BLOB_TOKEN       the audio store's read-write token (podcast-site/.env.blob)
//   BLOB_READ_WRITE_TOKEN  the episode-list store's token (.env.local, from `vercel env pull`)
// Needs ffprobe on PATH. The site picks up the new list within five minutes.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, put } from '@vercel/blob';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = 'podcast/episodes.json';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const audioDir = path.resolve(flag('dir') || path.join(root, 'podcast'));
const only = (flag('only') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

async function token(name, file) {
  if (process.env[name]) return process.env[name];
  const text = await readFile(path.join(root, file), 'utf8').catch(() => '');
  const m = /^BLOB_READ_WRITE_TOKEN=["']?([^"'\r\n]+)/m.exec(text);
  if (!m) throw new Error(`No ${name}: set it, or put BLOB_READ_WRITE_TOKEN=... in ${file}`);
  return m[1];
}

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', file]);
  const f = JSON.parse(stdout).format;
  const tags = Object.fromEntries(Object.entries(f.tags || {}).map(([k, v]) => [k.toLowerCase(), v]));
  return { tags, duration: Number(f.duration), bytes: Number(f.size) };
}

const audioToken = await token('AUDIO_BLOB_TOKEN', 'podcast-site/.env.blob');
const dataToken = await token('BLOB_READ_WRITE_TOKEN', '.env.local');

const current = await get(MANIFEST_PATH, { access: 'private', token: dataToken, useCache: false }).catch(() => null);
const manifest = current && current.stream
  ? JSON.parse(await new Response(current.stream).text())
  : { edition: '', episodes: [] };

const saveManifest = () => put(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', {
  access: 'private',
  token: dataToken,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/json',
});

const files = (await readdir(audioDir)).filter((f) => /^TMKO_R\d+_.*\.m4a$/i.test(f)).sort();
let published = 0;

for (const name of files) {
  const code = /_R(\d+)_/i.exec(name)[0].replace(/_/g, '').toUpperCase();
  if (only.length && !only.includes(code)) continue;

  const file = path.join(audioDir, name);
  const { size } = await stat(file);
  const existing = manifest.episodes.find((e) => e.file === name);
  if (existing && existing.bytes === size) {
    console.log(`${code} already published, skipping`);
    continue;
  }

  const { tags, duration, bytes } = await probe(file);
  console.log(`${code} "${tags.title}" (${(bytes / 1e6).toFixed(0)} MB) uploading...`);
  const blob = await put(`listening-edition-01/${name}`, createReadStream(file), {
    access: 'public',
    token: audioToken,
    addRandomSuffix: true,
    multipart: true,
    contentType: 'audio/mp4',
    cacheControlMaxAge: 31536000,
  });

  manifest.edition = (tags.album || '').replace(/^TMKO\s*[-–—]\s*/i, '') || manifest.edition;
  manifest.episodes = manifest.episodes.filter((e) => e.file !== name);
  manifest.episodes.push({
    id: code.toLowerCase(),
    number: Number(tags.track) || Number(code.slice(1)),
    code,
    title: tags.title || name,
    date: tags.date || /_(\d{4}-\d{2}-\d{2})_/.exec(name)?.[1] || '',
    duration: Math.round(duration * 100) / 100,
    bytes,
    file: name,
    src: blob.url,
  });
  manifest.episodes.sort((a, b) => a.number - b.number);
  await saveManifest();   // after each upload, so a later failure doesn't orphan this one
  published += 1;
  console.log(`  -> ${blob.url}`);
}

console.log(published
  ? `\n${manifest.episodes.length} episodes in ${MANIFEST_PATH}; the site shows them within five minutes.`
  : '\nNothing new to publish.');
