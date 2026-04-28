// GET /api/registrations — admin, returns every registration row.

import { listRegistrations } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { ok, fail, withErrorHandling } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');
  requireAdmin(req);
  const registrations = await listRegistrations();
  ok(res, { registrations });
});
