ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text NULL;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL publica da imagem de perfil do colaborador.';
