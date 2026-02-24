import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SolicitacaoPendente {
  id: string;
  demanda_id: string;
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
      .select("id, demanda_id, solicitante_id, justificativa, created_at, tipo_exclusao")
      .eq("status", "pendente");

    if (error) {
      console.error("Error fetching pending exclusion requests:", error);
      return;
    }

    const items = (data as unknown as SolicitacaoPendente[]) || [];
    setSolicitacoesPendentes(items);
    setPendingDemandaIds(new Set(items.map((s) => s.demanda_id)));
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
