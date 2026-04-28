// Tiny request/response helpers shared by Vercel function handlers.

export function jsonResponse(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

export function ok(res, body = {}) {
  jsonResponse(res, 200, { ok: true, ...body });
}

export function fail(res, status, error, extra = {}) {
  jsonResponse(res, status, { ok: false, error, ...extra });
}

/** Parses a JSON body whether the request used Content-Type: application/json
 *  or text/plain (which the public form sends to avoid CORS preflight). */
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  // Fallback: read the stream manually.
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/** Wraps a handler so any thrown Error (with optional .status) becomes a JSON failure response. */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err && err.status ? err.status : 500;
      const code = err && err.message ? err.message : 'internal_error';
      // Don't leak stack traces to clients.
      console.error('[api]', code, err && err.stack ? err.stack : '');
      fail(res, status, code);
    }
  };
}
