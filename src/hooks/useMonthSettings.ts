import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface MonthSetting {
  id: string;
  mes: number;
  ano: number;
  status_ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useMonthSettings() {
  const [monthSettings, setMonthSettings] = useState<MonthSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isGestorOrAdmin } = useAuth();
  const { toast } = useToast();

  const fetchMonthSettings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("month_settings")
      .select("*")
      .order("ano", { ascending: false })
      .order("mes", { ascending: false });

    if (error) {
      console.error("Error fetching month settings:", error);
    } else {
      setMonthSettings(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMonthSettings();
  }, [fetchMonthSettings]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("month-settings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "month_settings",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMonthSettings((prev) => [payload.new as MonthSetting, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setMonthSettings((prev) =>
              prev.map((ms) =>
                ms.id === (payload.new as MonthSetting).id
                  ? (payload.new as MonthSetting)
                  : ms
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMonthSettings((prev) =>
              prev.filter((ms) => ms.id !== (payload.old as MonthSetting).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Check if a specific month is a past month
  const isPastMonth = useCallback((mes: number, ano: number): boolean => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (ano < currentYear) return true;
    if (ano === currentYear && mes < currentMonth) return true;
    return false;
  }, []);

  // Get the setting for a specific month/year
  const getMonthSetting = useCallback(
    (mes: number, ano: number): MonthSetting | undefined => {
      return monthSettings.find((ms) => ms.mes === mes && ms.ano === ano);
    },
    [monthSettings]
  );

  // Check if status updates are allowed for a month
  const isStatusUpdateAllowed = useCallback(
    (mes: number, ano: number): boolean => {
      // If not a past month, always allow
      if (!isPastMonth(mes, ano)) return true;

      // If past month, check if status_ativo is true
      const setting = getMonthSetting(mes, ano);
      return setting?.status_ativo === true;
    },
    [isPastMonth, getMonthSetting]
  );

  // Check if editing/deleting/creating is allowed
  const isEditAllowed = useCallback(
    (mes: number, ano: number, isGestorOrAdminUser: boolean): boolean => {
      // If not a past month, gestor/admin can always edit
      if (!isPastMonth(mes, ano)) return isGestorOrAdminUser;

      // If past month, only gestor/admin can edit
      return isGestorOrAdminUser;
    },
    [isPastMonth]
  );

  // Toggle status_ativo for a month
  const toggleMonthStatus = async (mes: number, ano: number) => {
    if (!isGestorOrAdmin) return;

    const existingSetting = getMonthSetting(mes, ano);

    if (existingSetting) {
      // Update existing setting
      const { error } = await supabase
        .from("month_settings")
        .update({ status_ativo: !existingSetting.status_ativo })
        .eq("id", existingSetting.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar configuração do mês",
        });
      } else {
        toast({
          title: "Sucesso",
          description: existingSetting.status_ativo
            ? "Mês bloqueado para marcações"
            : "Mês liberado para marcações",
        });
      }
    } else {
      // Create new setting with status_ativo = true
      const { error } = await supabase.from("month_settings").insert({
        mes,
        ano,
        status_ativo: true,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao criar configuração do mês",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Mês liberado para marcações",
        });
      }
    }
  };

  return {
    monthSettings,
    isLoading,
    isPastMonth,
    getMonthSetting,
    isStatusUpdateAllowed,
    isEditAllowed,
    toggleMonthStatus,
    fetchMonthSettings,
  };
}
