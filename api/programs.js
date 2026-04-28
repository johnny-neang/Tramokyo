// /api/programs
//   GET — public, returns all programs
//   PUT — admin (Bearer token), replaces the entire programs array

import { listPrograms, replacePrograms } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    const programs = await listPrograms();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return ok(res, { programs });
  }
  if (req.method === 'PUT') {
    requireAdmin(req);
    const body = await readJsonBody(req);
    const count = await replacePrograms(body.programs);
    return ok(res, { count });
  }
  return fail(res, 405, 'method_not_allowed');
});
