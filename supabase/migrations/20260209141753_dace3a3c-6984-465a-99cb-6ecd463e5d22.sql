-- Fix orphaned demands: assign grupo_id to demands with semanas_repeticao > 1 but grupo_id IS NULL
-- Groups them by descricao + responsavel_id + mes + ano heuristic
DO $$
DECLARE
  rec RECORD;
  new_grupo_id UUID;
BEGIN
  FOR rec IN
    SELECT descricao, responsavel_id, mes, ano, COUNT(*) as cnt
    FROM public.demandas
    WHERE ativa = true
      AND semanas_repeticao > 1
      AND grupo_id IS NULL
    GROUP BY descricao, responsavel_id, mes, ano
    HAVING COUNT(*) > 1
  LOOP
    new_grupo_id := gen_random_uuid();
    
    UPDATE public.demandas
    SET grupo_id = new_grupo_id
    WHERE descricao = rec.descricao
      AND responsavel_id = rec.responsavel_id
      AND mes = rec.mes
      AND ano = rec.ano
      AND ativa = true
      AND grupo_id IS NULL;
  END LOOP;
END $$;