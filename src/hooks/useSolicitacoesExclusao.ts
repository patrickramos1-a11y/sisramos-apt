import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SolicitacaoPendente {
  id: string;
  demanda_id: string;
  grupo_id: string | null;
  solicitante_id: string;
  justificativa: string;
  created_at: string;
  tipo_exclusao: string;
}

export function useSolicitacoesExclusao() {
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<SolicitacaoPendente[]>([]);
  const [pendingDemandaIds, setPendingDemandaIds] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendentes = useCallback(async () => {
    const { data, error } = await supabase
      .from("solicitacoes_exclusao" as any)
      .select("id, demanda_id, grupo_id, solicitante_id, justificativa, created_at, tipo_exclusao")
      .eq("status", "pendente");

    if (error) {
      console.error("Error fetching pending exclusion requests:", error);
      return;
    }

    const items = (data as unknown as SolicitacaoPendente[]) || [];
    setSolicitacoesPendentes(items);

    // Collect grupo_ids from "todas" requests to fetch sibling demandas
    const grupoIds = items
      .filter((s) => s.tipo_exclusao === "todas" && s.grupo_id)
      .map((s) => s.grupo_id as string);

    const directIds = new Set(items.map((s) => s.demanda_id));

    if (grupoIds.length > 0) {
      const { data: siblings } = await supabase
        .from("demandas")
        .select("id")
        .in("grupo_id", grupoIds);

      if (siblings) {
        for (const s of siblings) {
          directIds.add(s.id);
        }
      }
    }

    setPendingDemandaIds(directIds);
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    fetchPendentes();
  }, [fetchPendentes]);

  const getSolicitacaoByDemandaId = useCallback(
    (demandaId: string) => {
      return solicitacoesPendentes.find((s) => s.demanda_id === demandaId);
    },
    [solicitacoesPendentes]
  );

  return {
    solicitacoesPendentes,
    pendingDemandaIds,
    pendingExclusaoCount: pendingCount,
    getSolicitacaoByDemandaId,
    refetchSolicitacoes: fetchPendentes,
  };
}
