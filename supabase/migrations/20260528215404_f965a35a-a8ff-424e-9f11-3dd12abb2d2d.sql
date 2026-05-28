CREATE TABLE IF NOT EXISTS public.apt_momentos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  momentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  momento_ativo integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mes, ano)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_momentos_config TO anon, authenticated;
GRANT ALL ON public.apt_momentos_config TO service_role;

CREATE OR REPLACE FUNCTION public.update_apt_momentos_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apt_momentos_config_updated_at ON public.apt_momentos_config;
CREATE TRIGGER apt_momentos_config_updated_at
  BEFORE UPDATE ON public.apt_momentos_config
  FOR EACH ROW EXECUTE FUNCTION public.update_apt_momentos_config_updated_at();

ALTER TABLE public.apt_momentos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de apt_momentos_config" ON public.apt_momentos_config;
DROP POLICY IF EXISTS "Insercao publica de apt_momentos_config" ON public.apt_momentos_config;
DROP POLICY IF EXISTS "Atualizacao publica de apt_momentos_config" ON public.apt_momentos_config;
DROP POLICY IF EXISTS "Exclusao publica de apt_momentos_config" ON public.apt_momentos_config;

CREATE POLICY "Leitura publica de apt_momentos_config"
  ON public.apt_momentos_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Insercao publica de apt_momentos_config"
  ON public.apt_momentos_config FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Atualizacao publica de apt_momentos_config"
  ON public.apt_momentos_config FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Exclusao publica de apt_momentos_config"
  ON public.apt_momentos_config FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_apt_momentos_config_mes_ano
  ON public.apt_momentos_config(mes, ano);