import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AptMomento {
  numero: number;
  semanas: number[];
  label: string;
  concluido: boolean;
  concluidoEm?: string | null;
  concluidoPor?: string | null;
}

export interface AptMomentosConfig {
  id: string;
  mes: number;
  ano: number;
  momentos: AptMomento[];
  momento_ativo: number | null;
  created_at: string;
  updated_at: string;
}

// Gera a configuração padrão para um mês (1 momento por semana, semanas 1-5)
export function defaultMomentos(totalSemanas: 4 | 5 = 5): AptMomento[] {
  return Array.from({ length: totalSemanas }, (_, i) => ({
    numero: i + 1,
    semanas: [i + 1],
    label: `Momento ${i + 1}`,
    concluido: false,
    concluidoEm: null,
    concluidoPor: null,
  }));
}

export function useAptMomentos(mes: number | null, ano: number | null) {
  const [config, setConfig] = useState<AptMomentosConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isGestorOrAdmin } = useAuth();
  const { toast } = useToast();

  const fetchConfig = useCallback(async () => {
    if (!mes || !ano || !user) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("apt_momentos_config")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar configuração de momentos APT:", error);
    } else {
      setConfig(data as AptMomentosConfig | null);
    }
    setIsLoading(false);
  }, [mes, ano, user]);

  useEffect(() => {
    fetchConfig();

    if (!mes || !ano) return;

    const channel = supabase
      .channel(`apt-momentos-${mes}-${ano}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "apt_momentos_config",
          filter: `mes=eq.${mes}`,
        },
        () => fetchConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig, mes, ano]);

  // Salva (cria ou atualiza) a configuração completa
  const saveConfig = useCallback(
    async (momentos: AptMomento[], momentoAtivo: number | null) => {
      if (!isGestorOrAdmin || !mes || !ano) return;

      const payload = { mes, ano, momentos, momento_ativo: momentoAtivo };

      if (config?.id) {
        const { error } = await supabase
          .from("apt_momentos_config")
          .update({ momentos, momento_ativo: momentoAtivo })
          .eq("id", config.id);

        if (error) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao salvar configuração de momentos",
          });
          return false;
        }
      } else {
        const { error } = await supabase
          .from("apt_momentos_config")
          .insert(payload);

        if (error) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao criar configuração de momentos",
          });
          return false;
        }
      }

      await fetchConfig();
      return true;
    },
    [config, mes, ano, isGestorOrAdmin, toast, fetchConfig]
  );

  // Avança para o próximo momento (conclui o atual e ativa o próximo)
  const avancarMomento = useCallback(async () => {
    if (!isGestorOrAdmin || !config || !user) return;

    const momentos = [...config.momentos];
    const atualIdx = momentos.findIndex(
      (m) => m.numero === config.momento_ativo
    );

    if (atualIdx === -1) return;

    // Marca o atual como concluído
    momentos[atualIdx] = {
      ...momentos[atualIdx],
      concluido: true,
      concluidoEm: new Date().toISOString(),
      concluidoPor: user.id,
    };

    // Próximo momento não concluído
    const proximo = momentos.find(
      (m) => m.numero > momentos[atualIdx].numero && !m.concluido
    );

    const novoAtivo = proximo?.numero ?? null;
    const ok = await saveConfig(momentos, novoAtivo);

    if (ok) {
      toast({
        title: proximo
          ? `Momento ${momentos[atualIdx].numero} encerrado`
          : "Todos os momentos concluídos",
        description: proximo
          ? `${proximo.label} está agora ativo`
          : "APT do mês finalizada",
      });
    }
  }, [config, isGestorOrAdmin, user, saveConfig, toast]);

  // Reabre um momento concluído (volta o status para não concluído)
  const reabrirMomento = useCallback(
    async (numeroMomento: number) => {
      if (!isGestorOrAdmin || !config) return;

      const momentos = config.momentos.map((m) =>
        m.numero === numeroMomento
          ? { ...m, concluido: false, concluidoEm: null, concluidoPor: null }
          : m
      );

      await saveConfig(momentos, config.momento_ativo ?? numeroMomento);
    },
    [config, isGestorOrAdmin, saveConfig]
  );

  // Ativa um momento específico (sem concluir o anterior)
  const ativarMomento = useCallback(
    async (numeroMomento: number) => {
      if (!isGestorOrAdmin || !config) return;
      await saveConfig(config.momentos, numeroMomento);
      toast({
        title: `Momento ${numeroMomento} ativado`,
        description: `Colaboradores verão as demandas deste momento`,
      });
    },
    [config, isGestorOrAdmin, saveConfig, toast]
  );

  // Retorna as semanas do momento ativo (para filtrar demandas)
  const semanasDoMomentoAtivo = useCallback((): number[] => {
    if (!config || config.momento_ativo === null) return [];
    const m = config.momentos.find((m) => m.numero === config.momento_ativo);
    return m?.semanas ?? [];
  }, [config]);

  // Retorna as semanas de um momento específico
  const semanasDoMomento = useCallback(
    (numero: number): number[] => {
      if (!config) return [];
      return config.momentos.find((m) => m.numero === numero)?.semanas ?? [];
    },
    [config]
  );

  return {
    config,
    isLoading,
    fetchConfig,
    saveConfig,
    avancarMomento,
    reabrirMomento,
    ativarMomento,
    semanasDoMomentoAtivo,
    semanasDoMomento,
  };
}
