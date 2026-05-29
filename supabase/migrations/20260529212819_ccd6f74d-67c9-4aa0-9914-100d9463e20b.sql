
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#DDEBFF',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Leitura publica de tags" ON public.tags FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insercao publica de tags" ON public.tags FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Atualizacao publica de tags" ON public.tags FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Exclusao publica de tags" ON public.tags FOR DELETE TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.demanda_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demanda_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_demanda_tags_demanda ON public.demanda_tags(demanda_id);
CREATE INDEX IF NOT EXISTS idx_demanda_tags_tag ON public.demanda_tags(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demanda_tags TO anon, authenticated;
GRANT ALL ON public.demanda_tags TO service_role;

ALTER TABLE public.demanda_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Leitura publica de demanda_tags" ON public.demanda_tags FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insercao publica de demanda_tags" ON public.demanda_tags FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Atualizacao publica de demanda_tags" ON public.demanda_tags FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Exclusao publica de demanda_tags" ON public.demanda_tags FOR DELETE TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
