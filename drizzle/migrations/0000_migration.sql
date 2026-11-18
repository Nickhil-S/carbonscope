CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id text NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  scale text NOT NULL,
  location_name text,
  boundary jsonb,
  area_m2 double precision,
  inputs jsonb NOT NULL,
  results jsonb NOT NULL,
  methodology_version text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assessments TO anon, authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read assessments" ON public.assessments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create assessments" ON public.assessments FOR INSERT TO anon, authenticated WITH CHECK (char_length(title) > 0);