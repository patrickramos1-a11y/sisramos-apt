-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'semana_concluida',
  mensagem TEXT NOT NULL,
  responsavel_id UUID NOT NULL, -- para quem é a notificação
  gestor_id UUID NOT NULL, -- quem disparou a notificação
  gestor_nome TEXT NOT NULL, -- nome do gestor para exibição
  semana INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para rastrear notificações que cada usuário dispensou (soft delete por usuário)
CREATE TABLE public.notification_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Políticas para notifications
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notifications
FOR SELECT
USING (auth.uid() = responsavel_id);

CREATE POLICY "Gestores podem criar notificações"
ON public.notifications
FOR INSERT
WITH CHECK (is_gestor_or_admin(auth.uid()));

-- Políticas para notification_dismissals
CREATE POLICY "Usuários podem ver suas próprias dismissões"
ON public.notification_dismissals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias dismissões"
ON public.notification_dismissals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias dismissões"
ON public.notification_dismissals
FOR DELETE
USING (auth.uid() = user_id);

-- Função para limpar notificações antigas (mais de 120 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '120 days';
END;
$$;

-- Índices para performance
CREATE INDEX idx_notifications_responsavel_id ON public.notifications(responsavel_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notification_dismissals_user_id ON public.notification_dismissals(user_id);
CREATE INDEX idx_notification_dismissals_notification_id ON public.notification_dismissals(notification_id);