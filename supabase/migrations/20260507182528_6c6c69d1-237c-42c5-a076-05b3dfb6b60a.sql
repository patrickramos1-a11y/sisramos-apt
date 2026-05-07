ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(user_id) WHERE deleted_at IS NULL;