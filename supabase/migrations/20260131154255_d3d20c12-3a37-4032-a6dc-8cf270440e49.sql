-- ENUMs para o Backlog de Produto
CREATE TYPE backlog_categoria AS ENUM (
  'nova_funcionalidade',
  'melhoria',
  'correcao_bug',
  'ajuste_tecnico',
  'ux_ui',
  'relatorios',
  'seguranca',
  'infraestrutura'
);

CREATE TYPE backlog_status AS ENUM (
  'ideia',
  'em_analise',
  'refinado',
  'aguardando_recursos',
  'em_implementacao',
  'em_testes',
  'implementado',
  'lancado',
  'validado',
  'arquivado'
);

CREATE TYPE backlog_prioridade AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE backlog_impacto AS ENUM ('baixo', 'medio', 'alto');
CREATE TYPE backlog_esforco AS ENUM ('pequeno', 'medio', 'grande');
CREATE TYPE backlog_registro_status AS ENUM ('executado', 'nao_executado');
CREATE TYPE backlog_tipo_validacao AS ENUM (
  'teste_funcional',
  'validacao_visual',
  'validacao_tecnica',
  'regra_negocio'
);

-- 1. Tabela de Projetos
CREATE TABLE public.backlog_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de Módulos por Projeto
CREATE TABLE public.backlog_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.backlog_projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Sequência para numeração de itens
CREATE SEQUENCE backlog_items_numero_seq START 1;

-- 4. Tabela de Itens do Backlog
CREATE TABLE public.backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL DEFAULT nextval('backlog_items_numero_seq'),
  titulo TEXT NOT NULL,
  projeto_id UUID NOT NULL REFERENCES public.backlog_projetos(id) ON DELETE RESTRICT,
  categoria backlog_categoria NOT NULL,
  descricao_detalhada TEXT,
  status backlog_status NOT NULL DEFAULT 'ideia',
  prioridade backlog_prioridade NOT NULL DEFAULT 'media',
  impacto_esperado backlog_impacto NOT NULL DEFAULT 'medio',
  estimativa_esforco backlog_esforco NOT NULL DEFAULT 'medio',
  dependente_de_creditos BOOLEAN NOT NULL DEFAULT false,
  responsavel_produto_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsavel_tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_inicio_implementacao DATE,
  data_conclusao DATE,
  data_lancamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Relação N:N entre Items e Módulos
CREATE TABLE public.backlog_item_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.backlog_modulos(id) ON DELETE CASCADE,
  UNIQUE(backlog_item_id, modulo_id)
);

-- 6. Tabela de Anexos
CREATE TABLE public.backlog_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela de Changelog (imutável)
CREATE TABLE public.backlog_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Tabela de Registros de Implementação
CREATE TABLE public.backlog_registros_implementacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status backlog_registro_status NOT NULL DEFAULT 'executado',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Tabela de Validações
CREATE TABLE public.backlog_validacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  validado BOOLEAN NOT NULL DEFAULT false,
  tipo_validacao backlog_tipo_validacao NOT NULL,
  validado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_validacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_backlog_items_projeto ON public.backlog_items(projeto_id);
CREATE INDEX idx_backlog_items_status ON public.backlog_items(status);
CREATE INDEX idx_backlog_items_prioridade ON public.backlog_items(prioridade);
CREATE INDEX idx_backlog_items_categoria ON public.backlog_items(categoria);
CREATE INDEX idx_backlog_modulos_projeto ON public.backlog_modulos(projeto_id);
CREATE INDEX idx_backlog_changelog_item ON public.backlog_changelog(backlog_item_id);
CREATE INDEX idx_backlog_anexos_item ON public.backlog_anexos(backlog_item_id);

-- Triggers para updated_at
CREATE TRIGGER update_backlog_projetos_updated_at
  BEFORE UPDATE ON public.backlog_projetos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_backlog_items_updated_at
  BEFORE UPDATE ON public.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.backlog_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_item_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_registros_implementacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_validacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Leitura pública para usuários autenticados
CREATE POLICY "Leitura autenticada de backlog_projetos" ON public.backlog_projetos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_modulos" ON public.backlog_modulos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_items" ON public.backlog_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_item_modulos" ON public.backlog_item_modulos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_anexos" ON public.backlog_anexos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_changelog" ON public.backlog_changelog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_registros_implementacao" ON public.backlog_registros_implementacao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura autenticada de backlog_validacoes" ON public.backlog_validacoes
  FOR SELECT TO authenticated USING (true);

-- Políticas de escrita apenas para gestor/admin
CREATE POLICY "Escrita gestor/admin em backlog_projetos" ON public.backlog_projetos
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Escrita gestor/admin em backlog_modulos" ON public.backlog_modulos
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Escrita gestor/admin em backlog_items" ON public.backlog_items
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Escrita gestor/admin em backlog_item_modulos" ON public.backlog_item_modulos
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Escrita gestor/admin em backlog_anexos" ON public.backlog_anexos
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Inserção autenticada em backlog_changelog" ON public.backlog_changelog
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Escrita gestor/admin em backlog_registros_implementacao" ON public.backlog_registros_implementacao
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Escrita gestor/admin em backlog_validacoes" ON public.backlog_validacoes
  FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- Storage bucket para anexos
INSERT INTO storage.buckets (id, name, public) VALUES ('backlog-anexos', 'backlog-anexos', false);

-- Políticas de storage
CREATE POLICY "Usuários autenticados podem visualizar anexos do backlog"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'backlog-anexos');

CREATE POLICY "Gestor/Admin podem fazer upload de anexos do backlog"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backlog-anexos' AND public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Gestor/Admin podem atualizar anexos do backlog"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'backlog-anexos' AND public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Gestor/Admin podem excluir anexos do backlog"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'backlog-anexos' AND public.is_gestor_or_admin(auth.uid()));