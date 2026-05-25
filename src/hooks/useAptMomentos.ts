import { useCallback, useEffect, useState } from "react";
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

const LOCAL_STORAGE_PREFIX = "apt_momentos_config";

function storageKey(mes: number, ano: number) {
  return `${LOCAL_STORAGE_PREFIX}:${ano}:${mes}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalConfig(mes: number, ano: number): AptMomentosConfig | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(mes, ano));
    if (!raw) return null;
    return JSON.parse(raw) as AptMomentosConfig;
  } catch (error) {
    console.error("Erro ao ler config local de momentos APT:", error);
    return null;
  }
}

function writeLocalConfig(config: AptMomentosConfig) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(storageKey(config.mes, config.ano), JSON.stringify(config));
}

function removeLocalConfig(mes: number, ano: number) {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(storageKey(mes, ano));
}

function buildConfig(
  mes: number,
  ano: number,
  momentos: AptMomento[],
  momentoAtivo: number | null,
  current?: AptMomentosConfig | null
): AptMomentosConfig {
  const now = new Date().toISOString();
  return {
    id: current?.id ?? `local-${ano}-${mes}`,
    mes,
    ano,
    momentos,
    momento_ativo: momentoAtivo,
    created_at: current?.created_at ?? now,
    updated_at: now,
  };
}

function getSaveErrorMessage(code?: string) {
  if (code === "42P01") {
    return "A tabela apt_momentos_config ainda nao foi criada no Supabase.";
  }
  if (code === "42501") {
    return "A regra de seguranca do Supabase bloqueou o salvamento.";
  }
  if (code === "42703") {
    return "A regra atual do Supabase referencia uma coluna que nao existe.";
  }
  return "Nao foi possivel salvar no Supabase agora.";
}

// Gera a configuracao padrao para um mes: 1 momento por semana.
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
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const { user, isGestorOrAdmin } = useAuth();
  const { toast } = useToast();

  const table = () => (supabase as any).from("apt_momentos_config");

  const fetchConfig = useCallback(async () => {
    if (!mes || !ano || !user) return;
    setIsLoading(true);

    const { data, error } = await table()
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar configuracao de momentos APT:", error);
      const localConfig = readLocalConfig(mes, ano);
      setConfig(localConfig);
      setIsLocalFallback(Boolean(localConfig));
      setIsLoading(false);
      return;
    }

    if (data) {
      setConfig(data as AptMomentosConfig);
      setIsLocalFallback(false);
      removeLocalConfig(mes, ano);
    } else {
      const localConfig = readLocalConfig(mes, ano);
      setConfig(localConfig);
      setIsLocalFallback(Boolean(localConfig));
    }

    setIsLoading(false);
  }, [ano, mes, user]);

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
  }, [ano, fetchConfig, mes]);

  const saveConfig = useCallback(
    async (momentos: AptMomento[], momentoAtivo: number | null) => {
      if (!isGestorOrAdmin || !mes || !ano) {
        toast({
          variant: "destructive",
          title: "Sem permissao",
          description: "Apenas gestores e administradores podem configurar os momentos.",
        });
        return false;
      }

      const nextConfig = buildConfig(mes, ano, momentos, momentoAtivo, config);
      const payload = {
        mes,
        ano,
        momentos,
        momento_ativo: momentoAtivo,
      };

      const { data, error } = await table()
        .upsert(payload, { onConflict: "mes,ano" })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao salvar configuracao de momentos APT:", error);
        writeLocalConfig(nextConfig);
        setConfig(nextConfig);
        setIsLocalFallback(true);
        toast({
          title: "Configuração salva localmente",
          description: `${getSaveErrorMessage(error.code)} A tela foi destravada neste navegador.`,
        });
        return true;
      }

      setConfig(data as AptMomentosConfig);
      setIsLocalFallback(false);
      removeLocalConfig(mes, ano);
      return true;
    },
    [ano, config, isGestorOrAdmin, mes, toast]
  );

  const avancarMomento = useCallback(async () => {
    if (!isGestorOrAdmin || !config || !user) return;

    const momentos = [...config.momentos];
    const atualIdx = momentos.findIndex((m) => m.numero === config.momento_ativo);
    if (atualIdx === -1) return;

    momentos[atualIdx] = {
      ...momentos[atualIdx],
      concluido: true,
      concluidoEm: new Date().toISOString(),
      concluidoPor: user.id,
    };

    const proximo = momentos.find((m) => m.numero > momentos[atualIdx].numero && !m.concluido);
    const novoAtivo = proximo?.numero ?? null;
    const ok = await saveConfig(momentos, novoAtivo);

    if (ok) {
      toast({
        title: proximo ? `Momento ${momentos[atualIdx].numero} encerrado` : "Todos os momentos concluidos",
        description: proximo ? `${proximo.label} esta agora ativo` : "APT do mes finalizada",
      });
    }
  }, [config, isGestorOrAdmin, saveConfig, toast, user]);

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

  const ativarMomento = useCallback(
    async (numeroMomento: number) => {
      if (!isGestorOrAdmin || !config) return;
      const ok = await saveConfig(config.momentos, numeroMomento);

      if (ok) {
        toast({
          title: `Momento ${numeroMomento} ativado`,
          description: "A visualizacao de execucao foi atualizada para este momento.",
        });
      }
    },
    [config, isGestorOrAdmin, saveConfig, toast]
  );

  const semanasDoMomentoAtivo = useCallback((): number[] => {
    if (!config || config.momento_ativo === null) return [];
    return config.momentos.find((m) => m.numero === config.momento_ativo)?.semanas ?? [];
  }, [config]);

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
    isLocalFallback,
    fetchConfig,
    saveConfig,
    avancarMomento,
    reabrirMomento,
    ativarMomento,
    semanasDoMomentoAtivo,
    semanasDoMomento,
  };
}
