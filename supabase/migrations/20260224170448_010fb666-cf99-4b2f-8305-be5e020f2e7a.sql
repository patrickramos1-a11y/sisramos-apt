
CREATE TABLE public.solicitacoes_exclusao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  grupo_id uuid,
  tipo_exclusao text NOT NULL DEFAULT 'unica',
  solicitante_id uuid NOT NULL,
  justificativa text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  decisor_id uuid,
  justificativa_recusa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

ALTER TABLE public.solicitacoes_exclusao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de solicitacoes_exclusao" ON public.solicitacoes_exclusao FOR SELECT USING (true);
CREATE POLICY "Inserção pública de solicitacoes_exclusao" ON public.solicitacoes_exclusao FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública de solicitacoes_exclusao" ON public.solicitacoes_exclusao FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública de solicitacoes_exclusao" ON public.solicitacoes_exclusao FOR DELETE USING (true);
