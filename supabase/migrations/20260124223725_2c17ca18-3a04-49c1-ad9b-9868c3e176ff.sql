-- Create table to track month settings (locked/unlocked status)
CREATE TABLE public.month_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  status_ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (mes, ano)
);

-- Enable RLS
ALTER TABLE public.month_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view month settings
CREATE POLICY "Todos podem ver configurações de meses"
ON public.month_settings
FOR SELECT
USING (true);

-- Only gestors and admins can manage month settings
CREATE POLICY "Gestores podem gerenciar configurações de meses"
ON public.month_settings
FOR ALL
USING (is_gestor_or_admin(auth.uid()))
WITH CHECK (is_gestor_or_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_month_settings_updated_at
BEFORE UPDATE ON public.month_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for month_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.month_settings;