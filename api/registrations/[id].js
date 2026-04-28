// PATCH /api/registrations/:id — admin, updates a single field on one row.

import { updateRegistrationField } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'PATCH') return fail(res, 405, 'method_not_allowed');
  requireAdmin(req);
  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id < 1) return fail(res, 400, 'bad_id');
  const body = await readJsonBody(req);
  if (!body.field) return fail(res, 400, 'missing_field');
  const value = await updateRegistrationField(id, body.field, body.value);
  ok(res, { value });
});
