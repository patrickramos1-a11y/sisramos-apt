-- Reparo idempotente para ambientes onde a primeira migration dos Momentos APT
-- ficou parcial ou com politicas incompatíveis com o login simplificado do app.

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

CREATE OR REPLACE FUNCTION public.update_apt_momentos_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS apt_momentos_config_updated_at ON public.apt_momentos_config;

CREATE TRIGGER apt_momentos_config_updated_at
  BEFORE UPDATE ON public.apt_momentos_config
  FOR EACH ROW EXECUTE FUNCTION public.update_apt_momentos_config_updated_at();

ALTER TABLE public.apt_momentos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read apt_momentos_config" ON public.apt_momentos_config;
DROP POLICY IF EXISTS "Gestores e admins podem inserir apt_momentos_config" ON public.apt_momentos_config;
DROP POLICY IF EXISTS "Gestores e admins podem atualizar apt_momentos_config" ON public.apt_momentos_config;
DROP POLICY IF EXISTS "Gestores e admins podem deletar apt_momentos_config" ON public.apt_momentos_config;
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
