-- Tramokyo 2026 feedback survey responses.
-- Answers are validated server-side against assets/survey-schema.js and
-- stored as one JSON object per response, so question edits don't need a
-- schema change. No IP or user-agent is stored: the survey is anonymous
-- unless the respondent fills in their name.

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id              BIGSERIAL PRIMARY KEY,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  survey_version  INTEGER NOT NULL DEFAULT 1,
  answers         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS survey_responses_submitted_at_idx
  ON public.survey_responses (submitted_at DESC);

-- Same posture as the other tables: RLS on, no policies. Only the Vercel
-- functions (service role) can read or write.
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
