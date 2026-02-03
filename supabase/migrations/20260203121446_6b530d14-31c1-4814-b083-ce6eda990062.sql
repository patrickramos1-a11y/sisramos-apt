-- Add momento_apt settings table to track when APT is locked for collaborators
CREATE TABLE public.momento_apt_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes INT NOT NULL,
  ano INT NOT NULL,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  bloqueado_por UUID REFERENCES auth.users(id),
  bloqueado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mes, ano)
);

-- Enable RLS
ALTER TABLE public.momento_apt_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read the settings
CREATE POLICY "Everyone can read momento_apt_settings"
  ON public.momento_apt_settings FOR SELECT
  USING (true);

-- Only gestor/admin can update
CREATE POLICY "Gestors and admins can manage momento_apt_settings"
  ON public.momento_apt_settings FOR ALL
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_momento_apt_settings_updated_at
  BEFORE UPDATE ON public.momento_apt_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.momento_apt_settings;