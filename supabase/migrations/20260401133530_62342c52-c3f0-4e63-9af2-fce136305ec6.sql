
ALTER TABLE public.checklist_instances
ADD COLUMN prioridade text NOT NULL DEFAULT 'media';

ALTER TABLE public.checklist_templates
ADD COLUMN prioridade_default text NOT NULL DEFAULT 'media';
