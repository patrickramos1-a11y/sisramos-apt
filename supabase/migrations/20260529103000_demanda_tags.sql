CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#E5E7EB',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.demanda_tags (
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  PRIMARY KEY (demanda_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica de tags"
ON public.tags FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Insercao publica de tags"
ON public.tags FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualizacao publica de tags"
ON public.tags FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Leitura publica de vinculos de tags"
ON public.demanda_tags FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Insercao publica de vinculos de tags"
ON public.demanda_tags FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Exclusao publica de vinculos de tags"
ON public.demanda_tags FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_demanda_tags_demanda_id ON public.demanda_tags(demanda_id);
CREATE INDEX IF NOT EXISTS idx_demanda_tags_tag_id ON public.demanda_tags(tag_id);
