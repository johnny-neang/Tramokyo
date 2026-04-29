# Database migrations

Supabase Postgres schema, in apply-order. Filenames match the entries in
`supabase_migrations.schema_migrations` on the live project (`ixaywzpbmeetokjoreiy`).

Format: `{YYYYMMDDHHMMSS}_{name}.sql` — same convention the Supabase CLI uses,
so these can be applied with `supabase db push` if the CLI is set up.

To recreate the schema from scratch (e.g. on a new Supabase project), run each
file in version order.
