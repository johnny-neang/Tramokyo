// POST /api/login — public-but-gated, password → JWT bearer token.
// Simple in-memory rate limit (per-warm-instance): 5 fails / 60s lockout.

import { verifyPassword, issueToken } from '../lib/auth.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../lib/http.js';

const FAIL_THRESHOLD = 5;
const LOCKOUT_MS = 60 * 1000;
const fails = new Map(); // clientId -> { count, lockedUntil }

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed');
  const body = await readJsonBody(req);
  const clientId = String(body.clientId || 'global');
  const now = Date.now();
  const rec = fails.get(clientId) || { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil && rec.lockedUntil > now) {
    return fail(res, 429, 'locked', { retryAfter: Math.ceil((rec.lockedUntil - now) / 1000) });
  }
  if (!verifyPassword(body.password)) {
    rec.count += 1;
    if (rec.count >= FAIL_THRESHOLD) {
      rec.lockedUntil = now + LOCKOUT_MS;
      rec.count = 0;
      fails.set(clientId, rec);
      return fail(res, 429, 'locked', { retryAfter: 60 });
    }
    fails.set(clientId, rec);
    return fail(res, 401, 'invalid');
  }
  fails.delete(clientId);
  const { token, expiresAt } = issueToken();
  ok(res, { token, expiresAt });
});
