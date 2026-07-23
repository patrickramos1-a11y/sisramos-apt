-- Consolidate Checklist outcomes and monthly ad-hoc items.
-- Legacy values are normalized before the constraints are installed.

UPDATE public.checklist_instances
SET status = 'feito'
WHERE status = 'concluido';

UPDATE public.checklist_instances
SET status = 'nao_feito'
WHERE status = 'nao_realizado';

UPDATE public.checklist_instances
SET status = 'pendente'
WHERE status IS NULL
   OR status NOT IN ('pendente', 'feito', 'nao_feito', 'nao_relevante', 'nao_consegui');

ALTER TABLE public.checklist_instances
  DROP CONSTRAINT IF EXISTS checklist_instances_status_check;

ALTER TABLE public.checklist_instances
  ADD CONSTRAINT checklist_instances_status_check
  CHECK (status IN ('pendente', 'feito', 'nao_feito', 'nao_relevante', 'nao_consegui'));

ALTER TABLE public.checklist_instances
  DROP CONSTRAINT IF EXISTS checklist_instances_tipo_item_check;

ALTER TABLE public.checklist_instances
  ADD CONSTRAINT checklist_instances_tipo_item_check
  CHECK (tipo_item IN ('recorrente', 'avulso_semana', 'avulso_mes'));

CREATE INDEX IF NOT EXISTS idx_checklist_instances_monthly_ad_hoc
  ON public.checklist_instances (ano, mes, tipo_item, status)
  WHERE tipo_item = 'avulso_mes';

COMMENT ON COLUMN public.checklist_instances.status IS
  'Checklist outcome: pendente, feito, nao_feito, nao_relevante or nao_consegui.';

COMMENT ON COLUMN public.checklist_instances.tipo_item IS
  'recorrente, legacy avulso_semana, or month-scoped avulso_mes.';

NOTIFY pgrst, 'reload schema';
