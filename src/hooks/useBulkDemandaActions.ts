import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DemandaModoExecucao, clearDemandasPrazoMeta, isPrazoColumnMissingError, saveDemandasPrazoMeta } from "@/lib/demandas-prazo";

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
    runRepeticoes: (ids: string[], n: number) =>
      runUpdate(ids, { semanas_repeticao: n }, "Repetições atualizadas"),
    setPrazoMeta: async (
      ids: string[],
      payload: {
        modo_execucao: DemandaModoExecucao;
        semana_inicio_prazo: number | null;
        semana_fim_prazo: number | null;
      },
      label: string
    ) => {
      if (ids.length === 0) return;
      const patch = {
        modo_execucao: payload.modo_execucao,
        semana_inicio_prazo: payload.modo_execucao === "prazo" ? payload.semana_inicio_prazo : null,
        semana_fim_prazo: payload.modo_execucao === "prazo" ? payload.semana_fim_prazo : null,
      };
      const { error } = await supabase.from("demandas").update(patch).in("id", ids);
      if (error) {
        if (isPrazoColumnMissingError(error)) {
          if (payload.modo_execucao === "prazo") saveDemandasPrazoMeta(ids, payload);
          else clearDemandasPrazoMeta(ids);
          toast({ title: label, description: `${ids.length} demanda(s) atualizada(s) em modo local` });
          onDone();
          return;
        }
        toast({ variant: "destructive", title: "Erro", description: error.message });
        return;
      }
      if (payload.modo_execucao === "prazo") saveDemandasPrazoMeta(ids, payload);
      else clearDemandasPrazoMeta(ids);
      toast({ title: label, description: `${ids.length} demanda(s) atualizada(s)` });
      onDone();
    },
    softDelete: (ids: string[]) => runUpdate(ids, { ativa: false }, "Demandas removidas"),
  };
}
