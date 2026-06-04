
-- 1. Profiles avatar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text NULL;

-- 2. Demandas with deadline mode
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS modo_execucao text NOT NULL DEFAULT 'semanal',
  ADD COLUMN IF NOT EXISTS semana_inicio_prazo integer NULL,
  ADD COLUMN IF NOT EXISTS semana_fim_prazo integer NULL;

ALTER TABLE public.demandas DROP CONSTRAINT IF EXISTS demandas_modo_execucao_check;
ALTER TABLE public.demandas ADD CONSTRAINT demandas_modo_execucao_check
  CHECK (modo_execucao IN ('semanal', 'prazo'));

ALTER TABLE public.demandas DROP CONSTRAINT IF EXISTS demandas_semana_prazo_window_check;
ALTER TABLE public.demandas ADD CONSTRAINT demandas_semana_prazo_window_check
  CHECK (
    (modo_execucao = 'semanal' AND semana_inicio_prazo IS NULL AND semana_fim_prazo IS NULL)
    OR
    (modo_execucao = 'prazo' AND semana_inicio_prazo BETWEEN 1 AND 5 AND semana_fim_prazo BETWEEN 1 AND 5 AND semana_inicio_prazo <= semana_fim_prazo)
  );

CREATE INDEX IF NOT EXISTS demandas_modo_execucao_idx ON public.demandas(modo_execucao);
CREATE INDEX IF NOT EXISTS demandas_semana_prazo_idx ON public.demandas(semana_inicio_prazo, semana_fim_prazo);

-- 3. APT Rotinas Persistentes
CREATE TABLE IF NOT EXISTS public.apt_rotina_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text NOT NULL,
  responsavel_padrao_id uuid NOT NULL,
  dias_semana int[] NOT NULL DEFAULT '{}',
  semanas_aplicaveis int[] NOT NULL DEFAULT '{1,2,3,4,5}',
  ativo boolean NOT NULL DEFAULT true,
  exige_aprovacao boolean NOT NULL DEFAULT true,
  entra_calculo_apt boolean NOT NULL DEFAULT true,
  cor text NOT NULL DEFAULT '#f97316',
  icone text NOT NULL DEFAULT 'refresh',
  origem_demanda_ids uuid[] NULL,
  origem_grupo_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apt_rotina_modelos_dias_validos CHECK (dias_semana <@ ARRAY[0,1,2,3,4,5,6]),
  CONSTRAINT apt_rotina_modelos_semanas_validas CHECK (semanas_aplicaveis <@ ARRAY[1,2,3,4,5])
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_modelos TO authenticated;
GRANT ALL ON public.apt_rotina_modelos TO service_role;
ALTER TABLE public.apt_rotina_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotina_modelos_select_auth" ON public.apt_rotina_modelos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rotina_modelos_write_gestor_admin" ON public.apt_rotina_modelos
  FOR ALL TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.apt_rotina_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.apt_rotina_modelos(id) ON DELETE CASCADE,
  data date NOT NULL,
  mes int NOT NULL,
  ano int NOT NULL,
  semana_apt int NOT NULL,
  responsavel_id uuid NOT NULL,
  setor_id uuid NULL REFERENCES public.setores(id) ON DELETE SET NULL,
  status_execucao text NOT NULL DEFAULT 'pendente',
  marcado_em timestamptz NULL,
  marcado_por uuid NULL,
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apt_rotina_ocorrencias_status_check CHECK (status_execucao IN ('pendente','executado','nao_realizado')),
  CONSTRAINT apt_rotina_ocorrencias_semana_check CHECK (semana_apt BETWEEN 1 AND 5),
  UNIQUE (modelo_id, data)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_ocorrencias TO authenticated;
GRANT ALL ON public.apt_rotina_ocorrencias TO service_role;
ALTER TABLE public.apt_rotina_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotina_ocorrencias_select_auth" ON public.apt_rotina_ocorrencias
  FOR SELECT TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY "rotina_ocorrencias_update_responsavel" ON public.apt_rotina_ocorrencias
  FOR UPDATE TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()) OR responsavel_id = auth.uid())
  WITH CHECK (public.is_gestor_or_admin(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY "rotina_ocorrencias_insert_gestor_admin" ON public.apt_rotina_ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));
CREATE POLICY "rotina_ocorrencias_delete_gestor_admin" ON public.apt_rotina_ocorrencias
  FOR DELETE TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.apt_rotina_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.apt_rotina_modelos(id) ON DELETE CASCADE,
  responsavel_id uuid NOT NULL,
  setor_id uuid NULL REFERENCES public.setores(id) ON DELETE SET NULL,
  mes int NOT NULL,
  ano int NOT NULL,
  momento int NULL,
  semanas_agrupadas int[] NOT NULL DEFAULT '{}',
  previstas int NOT NULL DEFAULT 0,
  feitas int NOT NULL DEFAULT 0,
  nao_feitas int NOT NULL DEFAULT 0,
  percentual numeric(5,2) NOT NULL DEFAULT 0,
  status_gestor text NOT NULL DEFAULT 'pendente',
  observacao_gestor text NULL,
  avaliado_em timestamptz NULL,
  avaliado_por uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apt_rotina_avaliacoes_status_check CHECK (status_gestor IN ('pendente','aprovado','reprovado')),
  UNIQUE (modelo_id, responsavel_id, mes, ano, momento)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_avaliacoes TO authenticated;
GRANT ALL ON public.apt_rotina_avaliacoes TO service_role;
ALTER TABLE public.apt_rotina_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotina_avaliacoes_select_auth" ON public.apt_rotina_avaliacoes
  FOR SELECT TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY "rotina_avaliacoes_write_gestor_admin" ON public.apt_rotina_avaliacoes
  FOR ALL TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS apt_rotina_modelos_setor_idx ON public.apt_rotina_modelos(setor_id);
CREATE INDEX IF NOT EXISTS apt_rotina_modelos_responsavel_idx ON public.apt_rotina_modelos(responsavel_padrao_id);
CREATE INDEX IF NOT EXISTS apt_rotina_ocorrencias_periodo_idx ON public.apt_rotina_ocorrencias(ano, mes, semana_apt);
CREATE INDEX IF NOT EXISTS apt_rotina_ocorrencias_responsavel_idx ON public.apt_rotina_ocorrencias(responsavel_id);
CREATE INDEX IF NOT EXISTS apt_rotina_ocorrencias_status_idx ON public.apt_rotina_ocorrencias(status_execucao);
CREATE INDEX IF NOT EXISTS apt_rotina_avaliacoes_periodo_idx ON public.apt_rotina_avaliacoes(ano, mes, momento);

CREATE OR REPLACE FUNCTION public.update_apt_rotinas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_apt_rotina_modelos_updated_at ON public.apt_rotina_modelos;
CREATE TRIGGER update_apt_rotina_modelos_updated_at
  BEFORE UPDATE ON public.apt_rotina_modelos
  FOR EACH ROW EXECUTE FUNCTION public.update_apt_rotinas_updated_at();

DROP TRIGGER IF EXISTS update_apt_rotina_ocorrencias_updated_at ON public.apt_rotina_ocorrencias;
CREATE TRIGGER update_apt_rotina_ocorrencias_updated_at
  BEFORE UPDATE ON public.apt_rotina_ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_apt_rotinas_updated_at();

DROP TRIGGER IF EXISTS update_apt_rotina_avaliacoes_updated_at ON public.apt_rotina_avaliacoes;
CREATE TRIGGER update_apt_rotina_avaliacoes_updated_at
  BEFORE UPDATE ON public.apt_rotina_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_apt_rotinas_updated_at();

CREATE OR REPLACE FUNCTION public.apt_rotina_marcar_atrasadas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.apt_rotina_ocorrencias
  SET status_execucao = 'nao_realizado',
      marcado_em = COALESCE(marcado_em, now()),
      updated_at = now()
  WHERE status_execucao = 'pendente'
    AND data < (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apt_rotina_marcar_atrasadas() TO authenticated;

NOTIFY pgrst, 'reload schema';
