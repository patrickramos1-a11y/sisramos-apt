-- Normalize legacy "prazo" demands that were stored as weekly demands.
-- Pattern: one execution window across multiple weeks, represented as Rep. 1x.
UPDATE public.demandas
SET
  modo_execucao = 'prazo',
  semana_inicio_prazo = (
    SELECT MIN(week_value)
    FROM unnest(semana_limite) AS week_value
  ),
  semana_fim_prazo = (
    SELECT MAX(week_value)
    FROM unnest(semana_limite) AS week_value
  ),
  updated_at = now()
WHERE
  ativa = true
  AND modo_execucao = 'semanal'
  AND semanas_repeticao = 1
  AND array_length(semana_limite, 1) > 1;
