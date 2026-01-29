-- 1. Adicionar coluna de cor no profiles para identificação visual de usuários
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cor text DEFAULT '#6B7280';

-- 2. Criar tabela para tracking de conclusão individual por responsável no checklist
CREATE TABLE IF NOT EXISTS public.checklist_item_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(checklist_item_id, user_id)
);

-- 3. Habilitar RLS na nova tabela
ALTER TABLE public.checklist_item_completions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para a tabela de conclusões
CREATE POLICY "Leitura pública de checklist_item_completions"
ON public.checklist_item_completions
FOR SELECT
USING (true);

CREATE POLICY "Inserção pública de checklist_item_completions"
ON public.checklist_item_completions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Atualização pública de checklist_item_completions"
ON public.checklist_item_completions
FOR UPDATE
USING (true);

CREATE POLICY "Exclusão pública de checklist_item_completions"
ON public.checklist_item_completions
FOR DELETE
USING (true);

-- 5. Trigger para updated_at
CREATE TRIGGER update_checklist_item_completions_updated_at
BEFORE UPDATE ON public.checklist_item_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Habilitar realtime para a nova tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_item_completions;