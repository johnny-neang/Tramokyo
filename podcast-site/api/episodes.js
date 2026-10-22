// GET /api/episodes -> the episode list with audio URLs. The page is public, so
// this answers anyone; the manifest itself stays out of git (see README).

import { readFile } from 'node:fs/promises';
import { ok, fail, withErrorHandling } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');

  const manifest = JSON.parse(await readFile(new URL('../data/episodes.json', import.meta.url), 'utf8'));
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, {
    edition: manifest.edition,
    episodes: manifest.episodes.map(({ file, ...episode }) => episode),
  });
});
