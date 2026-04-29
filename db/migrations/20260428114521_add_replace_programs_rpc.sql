-- Replaces all rows in public.programs with the supplied JSON array.
-- Atomic: failure rolls back the whole change. Called via Supabase rpc()
-- from the Vercel admin function with the service role key.

CREATE OR REPLACE FUNCTION public.replace_programs(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'payload must be a JSON array';
  END IF;

  DELETE FROM public.programs;

  INSERT INTO public.programs (id, day, name, jp, description, time, location, sort_order)
  SELECT
    NULLIF(p->>'id', '')                          AS id,
    COALESCE((p->>'day')::int, 0)                 AS day,
    COALESCE(p->>'name', '')                      AS name,
    COALESCE(p->>'jp', '')                        AS jp,
    COALESCE(p->>'description', p->>'desc', '')   AS description,
    COALESCE(p->>'time', '')                      AS time,
    COALESCE(p->>'location', '')                  AS location,
    COALESCE((p->>'sortOrder')::int, (p->>'sort_order')::int, 0) AS sort_order
  FROM jsonb_array_elements(payload) AS p;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_programs(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_programs(jsonb) TO service_role;
