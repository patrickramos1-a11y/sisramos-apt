import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  tipo: string;
  mensagem: string;
  responsavel_id: string;
  gestor_id: string;
  gestor_nome: string;
  semana: number;
  mes: number;
  ano: number;
  created_at: string;
}

interface NotificationDismissal {
  notification_id: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    // Buscar notificações do usuário
    const { data: notificationsData, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("responsavel_id", user.id)
      .order("created_at", { ascending: false });

    if (notificationsError) {
      console.error("Erro ao buscar notificações:", notificationsError);
      setIsLoading(false);
      return;
    }

    // Buscar notificações dispensadas pelo usuário
    const { data: dismissalsData, error: dismissalsError } = await supabase
      .from("notification_dismissals")
      .select("notification_id")
      .eq("user_id", user.id);

    if (dismissalsError) {
      console.error("Erro ao buscar dismissals:", dismissalsError);
    }

    const dismissedSet = new Set(
      (dismissalsData || []).map((d: NotificationDismissal) => d.notification_id)
    );

    setDismissedIds(dismissedSet);
    setNotifications(notificationsData || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Notificações visíveis (não dispensadas)
  const visibleNotifications = notifications.filter(
    (n) => !dismissedIds.has(n.id)
  );

  const unreadCount = visibleNotifications.length;

  const dismissNotification = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase.from("notification_dismissals").insert({
      notification_id: notificationId,
      user_id: user.id,
    });

    if (error) {
      console.error("Erro ao dispensar notificação:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover a notificação",
      });
      return;
    }

    setDismissedIds((prev) => new Set([...prev, notificationId]));
  };

  const dismissAllNotifications = async () => {
    if (!user) return;

    const notificationsToDismiss = visibleNotifications.map((n) => ({
      notification_id: n.id,
      user_id: user.id,
    }));

    if (notificationsToDismiss.length === 0) return;

    const { error } = await supabase
      .from("notification_dismissals")
      .insert(notificationsToDismiss);

    if (error) {
      console.error("Erro ao dispensar todas notificações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível limpar as notificações",
      });
      return;
    }

    setDismissedIds((prev) => {
      const newSet = new Set(prev);
      visibleNotifications.forEach((n) => newSet.add(n.id));
      return newSet;
    });

    toast({
      title: "Sucesso",
      description: "Todas as notificações foram removidas",
    });
  };

  const dismissSelected = async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    const dismissals = notificationIds.map((id) => ({
      notification_id: id,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from("notification_dismissals")
      .insert(dismissals);

    if (error) {
      console.error("Erro ao dispensar notificações selecionadas:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover as notificações selecionadas",
      });
      return;
    }

    setDismissedIds((prev) => {
      const newSet = new Set(prev);
      notificationIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    toast({
      title: "Sucesso",
      description: `${notificationIds.length} notificação(ões) removida(s)`,
    });
  };

  return {
    notifications: visibleNotifications,
    unreadCount,
    isLoading,
    dismissNotification,
    dismissAllNotifications,
    dismissSelected,
    refresh: fetchNotifications,
  };
}
