// Auth helpers — shared admin password compared in constant time, JWT bearer
// tokens for subsequent admin requests. ESM, no framework.

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const TOKEN_TTL_SEC = 12 * 60 * 60; // 12 hours

function getAdminPassword() {
  const v = process.env.ADMIN_PASSWORD;
  if (!v) throw new Error('ADMIN_PASSWORD env var is not set');
  return v;
}

function getJwtSecret() {
  const v = process.env.JWT_SECRET;
  if (!v) throw new Error('JWT_SECRET env var is not set');
  return v;
}

/** Constant-time password compare against the configured ADMIN_PASSWORD. */
export function verifyPassword(candidate) {
  const expected = getAdminPassword();
  const a = Buffer.from(String(candidate || ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Sign a 12-hour JWT for an authenticated admin session. */
export function issueToken() {
  const expiresAt = Date.now() + TOKEN_TTL_SEC * 1000;
  const token = jwt.sign(
    { role: 'admin', iat: Math.floor(Date.now() / 1000) },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL_SEC }
  );
  return { token, expiresAt };
}

/** Throws if the request lacks a valid bearer token. Returns the decoded payload. */
export function requireAdmin(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) {
    const e = new Error('unauthorized');
    e.status = 401;
    throw e;
  }
  try {
    return jwt.verify(m[1], getJwtSecret());
  } catch (_) {
    const e = new Error('unauthorized');
    e.status = 401;
    throw e;
  }
}
