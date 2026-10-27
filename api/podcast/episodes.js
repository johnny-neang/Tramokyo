// GET /api/podcast/episodes -> the episode list with audio URLs. The site's
// password gate (middleware.js) stands in front of it.

import { getManifest } from '../../lib/podcast.js';
import { ok, fail, withErrorHandling } from '../../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');
  const manifest = await getManifest();
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, {
    edition: manifest.edition,
    episodes: manifest.episodes.map(({ file, ...episode }) => episode),
  });
});
