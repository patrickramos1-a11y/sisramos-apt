-- Adicionar colunas mes e ano à tabela checklist_items
ALTER TABLE public.checklist_items 
ADD COLUMN IF NOT EXISTS mes integer NOT NULL DEFAULT EXTRACT(MONTH FROM now())::integer,
ADD COLUMN IF NOT EXISTS ano integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer;

-- Criar índices para melhorar performance de filtros
CREATE INDEX IF NOT EXISTS idx_checklist_items_mes_ano ON public.checklist_items(ano, mes);
CREATE INDEX IF NOT EXISTS idx_checklist_items_semana ON public.checklist_items(semana);

-- Atualizar itens existentes com o mês/ano atual
UPDATE public.checklist_items 
SET mes = EXTRACT(MONTH FROM created_at)::integer,
    ano = EXTRACT(YEAR FROM created_at)::integer
WHERE mes IS NULL OR ano IS NULL;