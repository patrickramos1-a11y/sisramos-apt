-- Remover constraint que impede alteração
ALTER TABLE public.demandas DROP CONSTRAINT demandas_semana_limite_check;

-- Remover default antigo
ALTER TABLE public.demandas ALTER COLUMN semana_limite DROP DEFAULT;

-- Alterar coluna semana_limite para suportar múltiplas semanas
ALTER TABLE public.demandas 
ALTER COLUMN semana_limite TYPE integer[] 
USING ARRAY[semana_limite]::integer[];

-- Definir novo valor padrão como array
ALTER TABLE public.demandas 
ALTER COLUMN semana_limite SET DEFAULT ARRAY[1]::integer[];