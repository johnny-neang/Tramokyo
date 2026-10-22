// Gate for the listening room. One shared password, checked on the server and
// remembered as a signed, HttpOnly cookie. ESM, no dependencies.

import crypto from 'node:crypto';

export const COOKIE = 'tmko_pass';
const TTL_SEC = 30 * 24 * 60 * 60; // 30 days

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is not set`);
  return v;
}

const digest = (s) => crypto.createHash('sha256').update(String(s || '').trim().toLowerCase()).digest();
const sign = (exp) => crypto.createHmac('sha256', env('TMKO_SESSION_SECRET')).update(`v1.${exp}`).digest('base64url');

/** Constant-time compare against TMKO_PASSWORD. Ignores case and stray spaces,
 *  since phone keyboards capitalise the first letter. */
export function verifyPassword(candidate) {
  return crypto.timingSafeEqual(digest(candidate), digest(env('TMKO_PASSWORD')));
}

function attrs(req, maxAge) {
  // Plain http only happens under `vercel dev`, where a Secure cookie would be dropped.
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

/** Set-Cookie value for a fresh 30-day session. */
export function issueCookie(req) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  return `${COOKIE}=${exp}.${sign(exp)}; ${attrs(req, TTL_SEC)}`;
}

/** Set-Cookie value that removes the session (the Lock button). */
export function clearCookie(req) {
  return `${COOKIE}=; ${attrs(req, 0)}`;
}

/** True when the request carries an unexpired, correctly signed cookie. */
export function hasValidCookie(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!/^\d+$/.test(exp || '') || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
