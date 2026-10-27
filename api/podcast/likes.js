// GET  /api/podcast/likes                           -> { ok, at, likes: { r01: 3, ... } }
// POST /api/podcast/likes { episode, voter, liked } -> { ok, at, liked, count }
//
// Each like is one tiny private blob, likes/<episode>/<voter>, in the
// tmko-podcast-likes store. Liking again just overwrites the same file and
// unliking deletes it, so one browser can't count twice and two people liking
// at once can't overwrite each other. Counts come from listing the prefix; GET
// is CDN-cached for a minute to stay inside the Hobby plan's Blob operations.
// `at` is server time taken before counting, so the page can tell whether a
// cached count already includes its own latest like; POST answers with the
// recording's fresh count, which the page trusts over any older snapshot.

import { list, put, del } from '@vercel/blob';
import { getManifest } from '../../lib/podcast.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../../lib/http.js';

const PREFIX = 'likes/';
const VOTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WRITES_PER_MINUTE = 30;
const writes = new Map(); // ip -> { count, resetAt }, per warm instance

async function knownEpisodes() {
  return new Set((await getManifest()).episodes.map((e) => e.id));
}

async function countLikes(prefix = PREFIX) {
  const likes = {};
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    for (const { pathname } of page.blobs) {
      const episode = pathname.slice(PREFIX.length).split('/')[0];
      likes[episode] = (likes[episode] || 0) + 1;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return likes;
}

function tooManyWrites(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  const now = Date.now();
  const rec = writes.get(ip);
  if (!rec || rec.resetAt <= now) {
    writes.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return false;
  }
  rec.count += 1;
  return rec.count > WRITES_PER_MINUTE;
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    const at = Date.now();
    const likes = await countLikes();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return ok(res, { at, likes });
  }
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed');

  res.setHeader('Cache-Control', 'no-store');
  const { episode, voter, liked } = await readJsonBody(req);
  if (!(await knownEpisodes()).has(episode) || !VOTER.test(String(voter || '')) || typeof liked !== 'boolean') {
    return fail(res, 400, 'bad_request');
  }
  if (tooManyWrites(req)) return fail(res, 429, 'slow_down');

  const pathname = `${PREFIX}${episode}/${voter.toLowerCase()}`;
  if (liked) {
    await put(pathname, '1', { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
  } else {
    await del(pathname);
  }
  const at = Date.now();
  const count = (await countLikes(`${PREFIX}${episode}/`))[episode] || 0;
  ok(res, { at, liked, count });
});
