import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Status = "pendente" | "executado" | "nao_realizado";

/**
 * Bulk mutation helpers for managing demandas from the Gerenciamento list.
 * All operations run against demandas.id IN (...) — no schema or RLS changes.
 */
export function useBulkDemandaActions(onDone: () => void) {
  const { toast } = useToast();

  const runUpdate = useCallback(
    async (ids: string[], patch: Record<string, unknown>, label: string) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("demandas")
        .update(patch)
        .in("id", ids);
      if (error) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
        return;
      }
      toast({ title: label, description: `${ids.length} demanda(s) atualizada(s)` });
      onDone();
    },
    [toast, onDone]
  );

  return {
    reassignResponsavel: (ids: string[], responsavel_id: string) =>
      runUpdate(ids, { responsavel_id }, "Responsável alterado"),
    moveSetor: (ids: string[], setor_id: string | null) =>
      runUpdate(ids, { setor_id }, "Setor alterado"),
    setPrioridade: (ids: string[], prioritaria: boolean) =>
      runUpdate(ids, { prioritaria }, prioritaria ? "Marcadas como prioritárias" : "Prioridade removida"),
    setUrgencia: (ids: string[], muito_urgente: boolean) =>
      runUpdate(ids, { muito_urgente }, muito_urgente ? "Marcadas como urgentes" : "Urgência removida"),
    setStatusResponsavel: (ids: string[], status: Status) =>
      runUpdate(ids, { status_responsavel: status }, "Status do responsável atualizado"),
    setStatusGestor: (ids: string[], status: Status) =>
      runUpdate(ids, { status_gestor: status }, "Aprovação atualizada"),
    softDelete: (ids: string[]) => runUpdate(ids, { ativa: false }, "Demandas removidas"),
  };
}