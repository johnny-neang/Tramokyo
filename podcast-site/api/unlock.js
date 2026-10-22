// POST   /api/unlock  { password }  -> sets the listening-room cookie.
// DELETE /api/unlock                -> clears it (the Lock button).
// Wrong guesses are rate-limited per warm instance, same shape as the admin
// login on the main site: 5 misses and that address waits 60 seconds.

import { verifyPassword, issueCookie, clearCookie } from '../lib/auth.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../lib/http.js';

const FAIL_THRESHOLD = 5;
const LOCKOUT_MS = 60 * 1000;
const fails = new Map(); // ip -> { count, lockedUntil }

export default withErrorHandling(async (req, res) => {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie(req));
    return ok(res);
  }
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed');

  const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  const now = Date.now();
  const rec = fails.get(ip) || { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > now) {
    return fail(res, 429, 'locked', { retryAfter: Math.ceil((rec.lockedUntil - now) / 1000) });
  }

  const body = await readJsonBody(req);
  if (!verifyPassword(body.password)) {
    rec.count += 1;
    if (rec.count >= FAIL_THRESHOLD) {
      rec.count = 0;
      rec.lockedUntil = now + LOCKOUT_MS;
      fails.set(ip, rec);
      return fail(res, 429, 'locked', { retryAfter: LOCKOUT_MS / 1000 });
    }
    fails.set(ip, rec);
    return fail(res, 401, 'invalid');
  }

  fails.delete(ip);
  res.setHeader('Set-Cookie', issueCookie(req));
  ok(res);
});
