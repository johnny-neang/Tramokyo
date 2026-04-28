// POST /api/register — public, accepts the registration form payload and inserts a row.
import { insertRegistration } from '../lib/db.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed');
  const body = await readJsonBody(req);
  // Minimum-required validation matches the front-end.
  if (!body.firstName || !body.lastName || !body.email || !body.phone) {
    return fail(res, 400, 'missing_required_fields');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return fail(res, 400, 'bad_email');
  }
  if (!body.liabilityAck) return fail(res, 400, 'liability_required');
  const inserted = await insertRegistration(body);
  ok(res, { id: inserted.id, submittedAt: inserted.submitted_at });
});
