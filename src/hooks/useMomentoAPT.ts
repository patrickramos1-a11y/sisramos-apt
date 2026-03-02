import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface MomentoAPTSetting {
  id: string;
  mes: number;
  ano: number;
  bloqueado: boolean;
  bloqueado_por: string | null;
  bloqueado_em: string | null;
}

export function useMomentoAPT() {
  const [settings, setSettings] = useState<MomentoAPTSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isGestorOrAdmin } = useAuth();

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("momento_apt_settings")
      .select("*");
    
    if (error) {
      console.error("Error fetching momento APT settings:", error);
    } else {
      setSettings((data as MomentoAPTSetting[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('momento-apt-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'momento_apt_settings' },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const isAPTBloqueado = useCallback((mes: number, ano: number): boolean => {
    const setting = settings.find((s) => s.mes === mes && s.ano === ano);
    return setting?.bloqueado ?? false;
  }, [settings]);

  const toggleBloqueio = useCallback(async (mes: number, ano: number) => {
    if (!isGestorOrAdmin || !user) {
      toast({
        variant: "destructive",
        title: "Sem permissão",
        description: "Apenas gestores podem bloquear/desbloquear o Momento APT",
      });
      return;
    }

    const currentSetting = settings.find((s) => s.mes === mes && s.ano === ano);
    const newBloqueado = !currentSetting?.bloqueado;

    if (currentSetting) {
      // Update existing
      const { error } = await supabase
        .from("momento_apt_settings")
        .update({
          bloqueado: newBloqueado,
          bloqueado_por: newBloqueado ? user.id : null,
          bloqueado_em: newBloqueado ? new Date().toISOString() : null,
        })
        .eq("id", currentSetting.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      } else {
        await fetchSettings();
        toast({
          title: newBloqueado ? "Momento APT iniciado" : "Momento APT encerrado",
          description: newBloqueado 
            ? "Colaboradores não podem mais alterar status" 
            : "Colaboradores podem alterar status novamente",
        });
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("momento_apt_settings")
        .insert({
          mes,
          ano,
          bloqueado: newBloqueado,
          bloqueado_por: newBloqueado ? user.id : null,
          bloqueado_em: newBloqueado ? new Date().toISOString() : null,
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      } else {
        await fetchSettings();
        toast({
          title: "Momento APT iniciado",
          description: "Colaboradores não podem mais alterar status",
        });
      }
    }
  }, [settings, isGestorOrAdmin, user, toast]);

  return {
    isLoading,
    isAPTBloqueado,
    toggleBloqueio,
    settings,
  };
}
