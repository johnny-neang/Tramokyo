// POST /api/unlock  (the lock screen's form: word, next)
// The right word sets the site cookie and sends you on to `next`; a wrong one
// shows the lock screen again. Wrong guesses are rate-limited per warm
// instance, same shape as the admin login: 5 misses and that address waits a
// minute.

import { checkWord, sessionCookie, safeNext, lockPageHtml, LOCK_HEADERS } from '../lib/site-gate.js';

const FAIL_THRESHOLD = 5;
const LOCKOUT_MS = 60 * 1000;
const fails = new Map(); // ip -> { count, lockedUntil }

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('');
  }
  const body = req.body && typeof req.body === 'object'
    ? req.body
    : Object.fromEntries(new URLSearchParams(String(req.body || '')));
  const next = safeNext(body.next);
  const lockPage = (status, error) => {
    for (const [k, v] of Object.entries(LOCK_HEADERS)) res.setHeader(k, v);
    res.status(status).send(lockPageHtml({ next, error }));
  };

  const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  const now = Date.now();
  const rec = fails.get(ip) || { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > now) return lockPage(429, 'Slow down. Try again in a minute.');

  if (!checkWord(body.word)) {
    rec.count += 1;
    if (rec.count >= FAIL_THRESHOLD) {
      rec.count = 0;
      rec.lockedUntil = now + LOCKOUT_MS;
    }
    fails.set(ip, rec);
    return lockPage(401, 'Not that one. Try again.');
  }

  fails.delete(ip);
  // Plain http only happens under `vercel dev`, where a Secure cookie would be dropped.
  res.setHeader('Set-Cookie', sessionCookie(req.headers['x-forwarded-proto'] === 'https'));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', next);
  res.status(303).send('');
}
