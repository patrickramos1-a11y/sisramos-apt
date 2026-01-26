-- Drop the existing restrictive SELECT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Permitir leitura pública de perfis" 
ON public.profiles 
FOR SELECT 
TO anon, authenticated
USING (true);