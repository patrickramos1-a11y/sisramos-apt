
ALTER TABLE public.checklist_instances
ALTER COLUMN prioridade DROP NOT NULL,
ALTER COLUMN prioridade SET DEFAULT NULL;

ALTER TABLE public.checklist_templates
ALTER COLUMN prioridade_default DROP NOT NULL,
ALTER COLUMN prioridade_default SET DEFAULT NULL;

UPDATE public.checklist_instances SET prioridade = NULL WHERE prioridade = 'media';
UPDATE public.checklist_templates SET prioridade_default = NULL WHERE prioridade_default = 'media';
