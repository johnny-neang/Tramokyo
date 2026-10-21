// /api/survey
//   POST — public. Validates the feedback survey against the shared schema and inserts it.
//   GET  — admin. Returns every response, newest first.

import { insertSurveyResponse, listSurveyResponses } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { readJsonBody, ok, fail, withErrorHandling } from '../lib/http.js';
import { validateSurvey, SURVEY_VERSION } from '../assets/survey-schema.js';

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    requireAdmin(req);
    const responses = await listSurveyResponses();
    return ok(res, { responses });
  }
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed');

  const body = await readJsonBody(req);
  // Honeypot: real people never see this field. Pretend success for bots.
  if (body && typeof body.website === 'string' && body.website.trim()) {
    return ok(res, { id: 0 });
  }
  const { answers, errors } = validateSurvey(body && body.answers);
  if (Object.keys(errors).length) return fail(res, 400, 'invalid_answers', { fields: errors });

  const inserted = await insertSurveyResponse(answers, SURVEY_VERSION);
  ok(res, { id: inserted.id, submittedAt: inserted.submitted_at });
});
