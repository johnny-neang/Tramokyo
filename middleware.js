// Routing Middleware: one shared password in front of the whole site (see
// lib/site-gate.js). Without the cookie, pages get the "Say the word." lock
// screen and API calls and files get a 401. The lock screen's form posts to
// /api/unlock, which sets the cookie.

import { next } from '@vercel/functions';
import { OPEN_PATHS, hasValidCookie, lockPageHtml, LOCK_HEADERS } from './lib/site-gate.js';

export const config = { runtime: 'nodejs' };

export default function middleware(request) {
  const url = new URL(request.url);
  // next() rather than returning nothing: `vercel dev` only passes the request on when told explicitly.
  if (OPEN_PATHS.has(url.pathname) || url.pathname.startsWith('/_vercel/')) return next();
  if (hasValidCookie(request.headers.get('cookie'))) return next();

  const isPage = (request.method === 'GET' || request.method === 'HEAD')
    && !url.pathname.startsWith('/api/')
    && !/\.(?!html?$)[a-z0-9]+$/i.test(url.pathname);   // no file extension, or .html
  if (isPage) {
    // 200 rather than 401, so link previews still show the site's name when the URL is shared.
    return new Response(lockPageHtml({ next: url.pathname + url.search }), { status: 200, headers: LOCK_HEADERS });
  }
  return new Response(JSON.stringify({ ok: false, error: 'locked' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });
}
