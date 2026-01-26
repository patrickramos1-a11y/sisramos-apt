-- Permitir que o app passwordless consiga ler roles antes de haver sessão
-- (uso interno: lista de usuários no login e cálculo de permissões)

DROP POLICY IF EXISTS "Usuários podem ver própria role" ON public.user_roles;

CREATE POLICY "Permitir leitura pública de roles"
ON public.user_roles
FOR SELECT
TO anon, authenticated
USING (true);
