GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_modelos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_modelos TO authenticated;
GRANT ALL ON public.apt_rotina_modelos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_ocorrencias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_ocorrencias TO authenticated;
GRANT ALL ON public.apt_rotina_ocorrencias TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_avaliacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apt_rotina_avaliacoes TO authenticated;
GRANT ALL ON public.apt_rotina_avaliacoes TO service_role;

ALTER TABLE public.apt_rotina_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apt_rotina_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apt_rotina_avaliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rotina_modelos_select_auth" ON public.apt_rotina_modelos;
DROP POLICY IF EXISTS "rotina_modelos_write_gestor_admin" ON public.apt_rotina_modelos;
DROP POLICY IF EXISTS "rotina_modelos_select_public" ON public.apt_rotina_modelos;
DROP POLICY IF EXISTS "rotina_modelos_insert_public" ON public.apt_rotina_modelos;
DROP POLICY IF EXISTS "rotina_modelos_update_public" ON public.apt_rotina_modelos;
DROP POLICY IF EXISTS "rotina_modelos_delete_public" ON public.apt_rotina_modelos;

CREATE POLICY "rotina_modelos_select_public"
ON public.apt_rotina_modelos
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "rotina_modelos_insert_public"
ON public.apt_rotina_modelos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "rotina_modelos_update_public"
ON public.apt_rotina_modelos
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "rotina_modelos_delete_public"
ON public.apt_rotina_modelos
FOR DELETE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "rotina_ocorrencias_select_auth" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_update_responsavel" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_insert_gestor_admin" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_delete_gestor_admin" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_select_public" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_insert_public" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_update_public" ON public.apt_rotina_ocorrencias;
DROP POLICY IF EXISTS "rotina_ocorrencias_delete_public" ON public.apt_rotina_ocorrencias;

CREATE POLICY "rotina_ocorrencias_select_public"
ON public.apt_rotina_ocorrencias
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "rotina_ocorrencias_insert_public"
ON public.apt_rotina_ocorrencias
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "rotina_ocorrencias_update_public"
ON public.apt_rotina_ocorrencias
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "rotina_ocorrencias_delete_public"
ON public.apt_rotina_ocorrencias
FOR DELETE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "rotina_avaliacoes_select_auth" ON public.apt_rotina_avaliacoes;
DROP POLICY IF EXISTS "rotina_avaliacoes_write_gestor_admin" ON public.apt_rotina_avaliacoes;
DROP POLICY IF EXISTS "rotina_avaliacoes_select_public" ON public.apt_rotina_avaliacoes;
DROP POLICY IF EXISTS "rotina_avaliacoes_insert_public" ON public.apt_rotina_avaliacoes;
DROP POLICY IF EXISTS "rotina_avaliacoes_update_public" ON public.apt_rotina_avaliacoes;
DROP POLICY IF EXISTS "rotina_avaliacoes_delete_public" ON public.apt_rotina_avaliacoes;

CREATE POLICY "rotina_avaliacoes_select_public"
ON public.apt_rotina_avaliacoes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "rotina_avaliacoes_insert_public"
ON public.apt_rotina_avaliacoes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "rotina_avaliacoes_update_public"
ON public.apt_rotina_avaliacoes
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "rotina_avaliacoes_delete_public"
ON public.apt_rotina_avaliacoes
FOR DELETE
TO anon, authenticated
USING (true);

NOTIFY pgrst, 'reload schema';