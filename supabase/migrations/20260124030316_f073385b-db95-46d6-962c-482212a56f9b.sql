-- Renumerar demandas para ficar sequencial iniciando em 1 (mantendo a ordem atual pelo numero)
WITH ordered AS (
  SELECT
    id,
    row_number() OVER (ORDER BY numero ASC, created_at ASC) AS new_numero
  FROM public.demandas
)
UPDATE public.demandas d
SET numero = o.new_numero
FROM ordered o
WHERE d.id = o.id;

-- Ajustar a sequência para continuar a partir do maior numero
SELECT setval('public.demandas_numero_seq', (SELECT COALESCE(MAX(numero), 0) FROM public.demandas), true);
