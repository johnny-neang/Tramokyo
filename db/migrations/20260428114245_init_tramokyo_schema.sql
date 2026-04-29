-- Tramokyo schema. Registrations + programs.

CREATE TABLE IF NOT EXISTS public.registrations (
  id                  BIGSERIAL PRIMARY KEY,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_name          TEXT NOT NULL DEFAULT '',
  last_name           TEXT NOT NULL DEFAULT '',
  pronouns            TEXT NOT NULL DEFAULT '',
  email               TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  experience_name     TEXT NOT NULL DEFAULT '',
  schedule            TEXT NOT NULL DEFAULT '',
  build_sign          BOOLEAN NOT NULL DEFAULT false,
  fee_ack             BOOLEAN NOT NULL DEFAULT false,
  pets                TEXT NOT NULL DEFAULT '',
  container_room      TEXT NOT NULL DEFAULT '',
  sandman             TEXT NOT NULL DEFAULT '',
  ranger              TEXT NOT NULL DEFAULT '',
  art_grant           TEXT NOT NULL DEFAULT '',
  sponsor             TEXT NOT NULL DEFAULT '',
  notes               TEXT NOT NULL DEFAULT '',
  liability_ack       BOOLEAN NOT NULL DEFAULT false,
  admin_notes         TEXT NOT NULL DEFAULT '',
  payment_received    TEXT NOT NULL DEFAULT '',
  confirmed_attendee  TEXT NOT NULL DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS public.programs (
  id          TEXT PRIMARY KEY,
  day         INTEGER NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  jp          TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  time        TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- RLS on by default. We never expose the anon key to the browser; all access
-- goes through Vercel functions using the service role key (which bypasses
-- RLS). With no policies defined, anon/unauth requests are denied — that's
-- the desired defense-in-depth posture.
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Seed programs
INSERT INTO public.programs (id, day, name, jp, description, time, location, sort_order) VALUES
  ('walk',   15, 'Morning Walk',    '朝歩き',  'Four miles before sunrise. Coffee at the ridge. Back in time for miso.',                                  '05:30', 'Tokyo (Center Camp)', 1),
  ('onsen',  15, 'Hot Spring',      '温泉',    'A steaming rock basin twenty minutes up the path. Cedar walls, no phones.',                                '10:00', 'Fukushima',           2),
  ('robata', 16, 'Fireside Supper', '炉端',    'Cast iron on coals. One long table. Potluck — bring something with a story.',                              '18:00', 'Tokyo (Center Camp)', 1),
  ('tea',    17, 'Dawn Tea',        '朝茶',    'Silent tea service at first light. Folded tatami, quiet hands, warm cups.',                                '06:00', 'Wakayama',            1),
  ('fish',   17, 'Night Fishing',   '夜釣り',  'Headlamps, hand lines, the stream. Release everything. Sashimi is not on the plan.',                       '22:00', 'Niigata',             2),
  ('stars',  18, 'Starlight Walk',  '星空',    'No flashlights. Fifteen minutes down the old road. Eyes adjust. Mostly you listen.',                       '23:00', 'Toyama',              1)
ON CONFLICT (id) DO NOTHING;
