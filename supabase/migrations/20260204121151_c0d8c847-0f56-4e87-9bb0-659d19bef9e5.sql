-- Add status column to checklist_items to support "not done" marking
-- Status can be: 'pendente', 'concluido', 'nao_realizado'
-- We keep concluido for backwards compatibility, but status takes precedence

ALTER TABLE public.checklist_items 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente' 
CHECK (status IN ('pendente', 'concluido', 'nao_realizado'));

-- Migrate existing data: if concluido = true, set status = 'concluido'
UPDATE public.checklist_items 
SET status = CASE 
  WHEN concluido = true THEN 'concluido' 
  ELSE 'pendente' 
END;