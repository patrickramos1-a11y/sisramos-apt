-- Tabela para rastrear notificações lidas por usuário
CREATE TABLE public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Políticas para notification_reads
CREATE POLICY "Usuários podem ver suas próprias leituras"
ON public.notification_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem marcar como lida"
ON public.notification_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem desmarcar leitura"
ON public.notification_reads
FOR DELETE
USING (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads(notification_id);