-- Atualizar RLS de demandas para permitir acesso público (anon + authenticated)
-- Assim o app funciona sem autenticação real, como solicitado.

DROP POLICY IF EXISTS "Colaboradores veem próprias demandas, gestores veem todas" ON public.demandas;
DROP POLICY IF EXISTS "Gestores podem criar demandas" ON public.demandas;
DROP POLICY IF EXISTS "Colaboradores podem atualizar status_responsavel de suas demand" ON public.demandas;
DROP POLICY IF EXISTS "Gestores podem deletar demandas" ON public.demandas;

-- SELECT: permitir qualquer leitura
CREATE POLICY "Leitura pública de demandas"
ON public.demandas
FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: permitir qualquer inserção
CREATE POLICY "Inserção pública de demandas"
ON public.demandas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- UPDATE: permitir qualquer atualização
CREATE POLICY "Atualização pública de demandas"
ON public.demandas
FOR UPDATE
TO anon, authenticated
USING (true);

-- DELETE: permitir qualquer exclusão
CREATE POLICY "Exclusão pública de demandas"
ON public.demandas
FOR DELETE
TO anon, authenticated
USING (true);