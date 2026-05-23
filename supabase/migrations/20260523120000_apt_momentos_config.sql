-- Tabela de configuração de momentos APT por mês/ano
-- Cada momento agrupa uma ou mais semanas (ex: Momento 1 = Semanas 1+2)

CREATE TABLE IF NOT EXISTS public.apt_momentos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  -- Array de momentos: [{numero: 1, semanas: [1,2], label: "Momento 1", concluido: false}]
  momentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Qual momento está ativo agora (número do momento, ou null se nenhum)
  momento_ativo integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mes, ano)
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_apt_momentos_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apt_momentos_config_updated_at
  BEFORE UPDATE ON public.apt_momentos_config
  FOR EACH ROW EXECUTE FUNCTION update_apt_momentos_config_updated_at();

-- RLS: habilitar segurança por linha
ALTER TABLE public.apt_momentos_config ENABLE ROW LEVEL SECURITY;

-- Leitura: todos os usuários autenticados podem ler
CREATE POLICY "Authenticated users can read apt_momentos_config"
  ON public.apt_momentos_config FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: apenas gestores e admins (via service role no backend, ou via role check)
CREATE POLICY "Gestores e admins podem inserir apt_momentos_config"
  ON public.apt_momentos_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Gestores e admins podem atualizar apt_momentos_config"
  ON public.apt_momentos_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Gestores e admins podem deletar apt_momentos_config"
  ON public.apt_momentos_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

-- Index para consultas por mês/ano
CREATE INDEX IF NOT EXISTS idx_apt_momentos_config_mes_ano
  ON public.apt_momentos_config(mes, ano);
