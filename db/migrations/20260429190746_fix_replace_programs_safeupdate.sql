-- Supabase ships pg_safeupdate, which blocks DELETE/UPDATE without a WHERE
-- clause. The previous DELETE FROM public.programs failed with
-- "DELETE requires a WHERE clause" when called via rpc() from the admin.
-- programs.id is the PK and NOT NULL, so `WHERE id IS NOT NULL` deletes all
-- rows while satisfying the guard.

CREATE OR REPLACE FUNCTION public.replace_programs(payload jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'payload must be a JSON array';
  END IF;

  DELETE FROM public.programs WHERE id IS NOT NULL;

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
$function$;
