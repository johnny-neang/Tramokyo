// GET /api/episodes -> the episode list with audio URLs. Only served to
// browsers holding the cookie from /api/unlock, so the URLs aren't sitting in
// the page source for anyone who hasn't entered the password.

import { readFile } from 'node:fs/promises';
import { hasValidCookie } from '../lib/auth.js';
import { ok, fail, withErrorHandling } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');
  if (!hasValidCookie(req)) return fail(res, 401, 'locked');

  const manifest = JSON.parse(await readFile(new URL('../data/episodes.json', import.meta.url), 'utf8'));
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, {
    edition: manifest.edition,
    episodes: manifest.episodes.map(({ file, ...episode }) => episode),
  });
});
