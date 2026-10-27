// The podcast's episode list. It lives in the private tmko-podcast-likes Blob
// store as podcast/episodes.json, not in git: the repo is public and the list
// holds the audio URLs. scripts/publish-podcast.mjs writes it. Cached per
// warm instance for five minutes.

import { get } from '@vercel/blob';

export const MANIFEST_PATH = 'podcast/episodes.json';
const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, manifest: null };

export async function getManifest() {
  if (cache.manifest && Date.now() - cache.at < TTL_MS) return cache.manifest;
  const result = await get(MANIFEST_PATH, { access: 'private', useCache: false });
  if (!result || !result.stream) {
    throw Object.assign(new Error('podcast_manifest_missing'), { status: 503 });
  }
  const manifest = JSON.parse(await new Response(result.stream).text());
  cache = { at: Date.now(), manifest };
  return manifest;
}
