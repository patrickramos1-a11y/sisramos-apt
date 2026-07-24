import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  isChecklistMonthlyAvulsoResolved,
  isChecklistStatusFinal,
  normalizeChecklistStatus,
  type ChecklistStatus,
} from "@/lib/checklist-status";

export type { ChecklistStatus } from "@/lib/checklist-status";
export type TipoItem = "recorrente" | "avulso_semana" | "avulso_mes";

export interface ChecklistTemplate {
  id: string;
  descricao: string;
  ordem_global: number;
  link_default: string | null;
  ativo: boolean;
  semanas_aplicaveis: number[];
  created_at: string;
  updated_at: string;
  default_assignees?: string[];
}

export type Prioridade = "alta" | "media" | "baixa" | null;

export interface ChecklistInstance {
  id: string;
  template_id: string | null;
  ano: number;
  mes: number;
  semana: number;
  tipo_item: TipoItem;
  status: ChecklistStatus;
  descricao_override: string | null;
  link_override: string | null;
  ordem_override: number | null;
  parent_id: string | null;
  is_group: boolean;
  prioridade: Prioridade;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  descricao: string; // resolved from template or override
  link: string | null; // resolved
  ordem: number; // resolved from template ordem_global or override
  assignees: string[];
  children?: ChecklistInstance[];
}

interface UseChecklistV2Options {
  mes: number;
  ano: number;
}

export function useChecklistV2({ mes, ano }: UseChecklistV2Options) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all active templates
  const fetchTemplates = useCallback(async () => {
    const { data, error } = await (supabase
      .from("checklist_templates")
      .select("*") as any)
      .eq("ativo", true)
      .order("ordem_global");

    if (error) {
      console.error("Error fetching templates:", error);
      return [];
    }

    // Fetch default assignees
    const templateIds = (data || []).map((t: any) => t.id);
    let assigneesMap: Record<string, string[]> = {};

    if (templateIds.length > 0) {
      const { data: assigneesData } = await (supabase
        .from("checklist_template_assignees")
        .select("*") as any)
        .in("template_id", templateIds);

      (assigneesData || []).forEach((a: any) => {
        if (!assigneesMap[a.template_id]) assigneesMap[a.template_id] = [];
        assigneesMap[a.template_id].push(a.user_id);
      });
    }

    const templatesWithAssignees = (data || []).map((t: any) => ({
      ...t,
      default_assignees: assigneesMap[t.id] || [],
    }));

    setTemplates(templatesWithAssignees);
    return templatesWithAssignees;
  }, []);

  // Fetch instances for a specific month
  const fetchInstances = useCallback(async (targetMes: number, targetAno: number, loadedTemplates: ChecklistTemplate[]) => {
    const { data: monthInstances, error } = await (supabase
      .from("checklist_instances")
      .select("*") as any)
      .eq("mes", targetMes)
      .eq("ano", targetAno)
      .order("semana")
      .order("created_at");

    if (error) {
      console.error("Error fetching instances:", error);
      return [];
    }

    // Monthly ad-hoc items are an open follow-up queue: they remain available
    // across later weeks, moments, and months until a definitive outcome.
    const { data: allMonthlyAvulsos, error: avulsosError } = await (supabase
      .from("checklist_instances")
      .select("*") as any)
      .eq("tipo_item", "avulso_mes")
      .order("created_at");

    if (avulsosError) {
      console.error("Error fetching open monthly avulsos:", avulsosError);
    }

    const isCurrentOrPastPeriod = (instance: any) =>
      instance.ano < targetAno ||
      (instance.ano === targetAno && instance.mes <= targetMes);
    const carriedAvulsos = (allMonthlyAvulsos || []).filter(
      (instance: any) =>
        isCurrentOrPastPeriod(instance) &&
        !isChecklistMonthlyAvulsoResolved(instance.status),
    );
    const instancesById = new Map<string, any>();
    [...(monthInstances || []), ...carriedAvulsos].forEach((instance) => {
      instancesById.set(instance.id, instance);
    });
    const data = Array.from(instancesById.values());

    // Fetch instance assignees
    const instanceIds = (data || []).map((i: any) => i.id);
    let assigneesMap: Record<string, string[]> = {};

    if (instanceIds.length > 0) {
      const { data: assigneesData } = await (supabase
        .from("checklist_instance_assignees")
        .select("*") as any)
        .in("instance_id", instanceIds);

      (assigneesData || []).forEach((a: any) => {
        if (!assigneesMap[a.instance_id]) assigneesMap[a.instance_id] = [];
        assigneesMap[a.instance_id].push(a.user_id);
      });
    }

    const tpls = loadedTemplates;

    // Resolve descriptions, links, and ordem from templates
    const resolvedInstances: ChecklistInstance[] = (data || []).map((inst: any) => {
      const template = tpls.find((t) => t.id === inst.template_id);
      return {
        ...inst,
        status: normalizeChecklistStatus(inst.status),
        descricao: inst.descricao_override || template?.descricao || "(Sem descrição)",
        link: inst.link_override ?? template?.link_default ?? null,
        ordem: inst.ordem_override ?? template?.ordem_global ?? 0,
        prioridade: inst.prioridade || (template as any)?.prioridade_default || null,
        assignees: assigneesMap[inst.id] || [],
      };
    });

    // The third week is the reference ordering for recurring items. Applying the
    // same key-based order here keeps every moment aligned even when old instance
    // overrides differ between weeks.
    const recurringKey = (instance: ChecklistInstance) =>
      instance.template_id
        ? `template:${instance.template_id}`
        : `legacy:${instance.descricao.trim().toLocaleLowerCase("pt-BR")}`;
    const referenceRecurring = resolvedInstances
      .filter(
        (instance) =>
          instance.semana === 3 &&
          instance.tipo_item === "recorrente" &&
          !instance.parent_id,
      )
      .sort((a, b) => a.ordem - b.ordem);
    const referenceOrder = new Map<string, number>();
    referenceRecurring.forEach((instance) => {
      const key = recurringKey(instance);
      if (!referenceOrder.has(key)) referenceOrder.set(key, referenceOrder.size);
    });

    const normalizedInstances = referenceOrder.size > 0
      ? resolvedInstances.map((instance) => {
          if (instance.tipo_item !== "recorrente" || instance.parent_id) return instance;
          const canonicalOrder = referenceOrder.get(recurringKey(instance));
          return canonicalOrder === undefined
            ? { ...instance, ordem: referenceOrder.size + instance.ordem }
            : { ...instance, ordem: canonicalOrder };
        })
      : resolvedInstances;

    setInstances(normalizedInstances);
    return normalizedInstances;
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedTemplates = await fetchTemplates();
      const loaded = await fetchInstances(mes, ano, loadedTemplates);

      // 🔄 Auto-rollover safety net:
      // If we're viewing the CURRENT month and it has no recurring items
      // but the previous month does, automatically run the rollover so
      // the user never has to copy manually.
      try {
        const today = new Date();
        const isCurrentMonth =
          mes === today.getMonth() + 1 && ano === today.getFullYear();
        const hasRecorrente = loaded.some(
          (i: any) => i.tipo_item === "recorrente" && !i.parent_id,
        );

        if (isCurrentMonth && !hasRecorrente) {
          let prevMes = mes - 1;
          let prevAno = ano;
          if (prevMes === 0) { prevMes = 12; prevAno = ano - 1; }

          const { data: prevHas } = await (supabase
            .from("checklist_instances")
            .select("id") as any)
            .eq("mes", prevMes)
            .eq("ano", prevAno)
            .eq("tipo_item", "recorrente")
            .is("parent_id", null)
            .limit(1);

          if (prevHas && prevHas.length > 0) {
            console.log(
              `[checklist] Auto-rollover triggered for ${mes}/${ano} (previous month has recurring items)`,
            );
            const { data: rollResp, error: rollErr } = await supabase.functions.invoke(
              "auto-rollover",
              { body: {} },
            );
            if (rollErr) {
              console.error("[checklist] auto-rollover invoke error:", rollErr);
            } else {
              console.log("[checklist] auto-rollover response:", rollResp);
              await fetchInstances(mes, ano, loadedTemplates);
              toast({
                title: "Checklist atualizado",
                description: "As tarefas recorrentes foram trazidas do mês anterior automaticamente.",
              });
            }
          }
        }
      } catch (e) {
        console.error("[checklist] auto-rollover safety net failed:", e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mes, ano, fetchTemplates, fetchInstances, toast]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is stable now

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get instances by week, building hierarchy
  const getInstancesByWeek = useCallback((semana: number) => {
    const weekInstances = instances
      .filter((i) => i.semana === semana && i.tipo_item !== "avulso_mes" && !i.parent_id)
      .sort((a, b) => a.ordem - b.ordem);

    // Attach children
    return weekInstances.map((parent) => ({
      ...parent,
      children: parent.is_group
        ? instances
            .filter((i) => i.parent_id === parent.id)
            .sort((a, b) => a.ordem - b.ordem)
        : undefined,
    }));
  }, [instances]);

  // Week stats
  const getWeekStats = useCallback((semana: number) => {
    const weekItems = instances.filter((i) => i.semana === semana && i.tipo_item !== "avulso_mes" && !i.parent_id);
    const resolveGroupStatus = (item: ChecklistInstance) => {
      if (!item.is_group) return normalizeChecklistStatus(item.status);
      const children = instances.filter((child) => child.parent_id === item.id);
      if (children.length === 0) return normalizeChecklistStatus(item.status);
      const childStatuses = children.map((child) => normalizeChecklistStatus(child.status));
      if (childStatuses.every((status) => status === "feito")) return "feito";
      if (childStatuses.every((status) => status === "nao_feito")) return "nao_feito";
      if (childStatuses.every((status) => status === "nao_relevante")) return "nao_relevante";
      if (childStatuses.every((status) => status === "nao_consegui")) return "nao_consegui";
      return childStatuses.every((status) => status !== "pendente") ? "feito" : "pendente";
    };

    const total = weekItems.length;
    const completed = weekItems.filter((item) => resolveGroupStatus(item) === "feito").length;
    const notDone = weekItems.filter((item) => resolveGroupStatus(item) === "nao_feito").length;
    const notRelevant = weekItems.filter((item) => resolveGroupStatus(item) === "nao_relevante").length;
    const couldNot = weekItems.filter((item) => resolveGroupStatus(item) === "nao_consegui").length;
    return { total, completed, notDone, notRelevant, couldNot };
  }, [instances]);

  // Update instance status
  const updateInstanceStatus = useCallback(async (instanceId: string, newStatus: ChecklistStatus) => {
    const normalizedNewStatus = normalizeChecklistStatus(newStatus);
    // Optimistic update + recalculate parent in one pass
    let parentId: string | null = null;
    let parentNewStatus: ChecklistStatus | null = null;

    setInstances((prev) => {
      const updated = prev.map((i) => (i.id === instanceId ? { ...i, status: normalizedNewStatus } : i));
      
      // Find parent and recalculate
      const instance = updated.find((i) => i.id === instanceId);
      if (instance?.parent_id) {
        parentId = instance.parent_id;
        const children = updated.filter((i) => i.parent_id === parentId);
        if (children.length > 0) {
          const allConcluido = children.every((c) => normalizeChecklistStatus(c.status) === "feito");
          const allNaoRealizado = children.every((c) => normalizeChecklistStatus(c.status) === "nao_feito");
          const allProcessed = children.every((c) => isChecklistStatusFinal(c.status));

          if (allConcluido) parentNewStatus = "feito";
          else if (allNaoRealizado) parentNewStatus = "nao_feito";
          else if (allProcessed) parentNewStatus = "feito";
          else parentNewStatus = "pendente";

          return updated.map((i) => (i.id === parentId ? { ...i, status: parentNewStatus! } : i));
        }
      }
      return updated;
    });

    const { error } = await (supabase
      .from("checklist_instances") as any)
      .update({ status: normalizedNewStatus })
      .eq("id", instanceId);

    if (error) {
      console.error("Error updating instance status:", error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao atualizar status", description: error.message });
      return;
    }

    // Persist parent status to DB
    if (parentId && parentNewStatus) {
      await (supabase.from("checklist_instances") as any)
        .update({ status: parentNewStatus })
        .eq("id", parentId);
    }
  }, [loadData, toast]);

  // Recurring edits update the current-month series and the template used by future months.
  const updateInstance = useCallback(async (instanceId: string, updates: { descricao_override?: string; link_override?: string | null; prioridade?: Prioridade }) => {
    const current = instances.find((instance) => instance.id === instanceId);
    if (!current) return;

    // Sub-items do not have their own template. Match them through the recurring
    // parent and their numbered position so structural edits reach every week.
    if (current.parent_id) {
      const currentParent = instances.find((instance) => instance.id === current.parent_id);
      if (currentParent?.tipo_item === "recorrente") {
        const currentChildren = instances
          .filter((instance) => instance.parent_id === currentParent.id)
          .sort((a, b) => a.ordem - b.ordem);
        const currentIndex = currentChildren.findIndex((instance) => instance.id === current.id);

        const equivalentParents = instances.filter((instance) => {
          if (
            instance.mes !== mes ||
            instance.ano !== ano ||
            instance.parent_id ||
            instance.tipo_item !== "recorrente"
          ) {
            return false;
          }

          const sameTemplate = Boolean(
            currentParent.template_id &&
            instance.template_id === currentParent.template_id,
          );
          const sameLegacyRecurring =
            !currentParent.template_id &&
            !instance.template_id &&
            instance.descricao === currentParent.descricao;
          return sameTemplate || sameLegacyRecurring;
        });

        const siblingIds = equivalentParents
          .map((parent) =>
            instances
              .filter((instance) => instance.parent_id === parent.id)
              .sort((a, b) => a.ordem - b.ordem)[currentIndex],
          )
          .filter((instance): instance is ChecklistInstance => Boolean(instance))
          .map((instance) => instance.id);

        if (currentIndex >= 0 && siblingIds.length > 0) {
          const { error } = await (supabase.from("checklist_instances") as any)
            .update(updates)
            .in("id", siblingIds);

          if (error) {
            toast({
              variant: "destructive",
              title: "Erro ao atualizar as subtarefas",
              description: error.message,
            });
            return;
          }

          setInstances((previous) => previous.map((instance) => siblingIds.includes(instance.id) ? {
            ...instance,
            ...(updates.descricao_override !== undefined && {
              descricao: updates.descricao_override,
              descricao_override: updates.descricao_override,
            }),
            ...(updates.link_override !== undefined && {
              link: updates.link_override,
              link_override: updates.link_override,
            }),
            ...(updates.prioridade !== undefined && { prioridade: updates.prioridade }),
          } : instance));
          toast({
            title: "Subtarefas atualizadas",
            description: `A alteração foi aplicada em ${siblingIds.length} semana${siblingIds.length === 1 ? "" : "s"}.`,
          });
          return;
        }
      }
    }

    if (current.tipo_item === "recorrente" && current.template_id) {
      const templateUpdates: Record<string, unknown> = {};
      const instanceUpdates: Record<string, unknown> = {};

      if (updates.descricao_override !== undefined) {
        templateUpdates.descricao = updates.descricao_override;
        instanceUpdates.descricao_override = null;
      }
      if (updates.link_override !== undefined) {
        templateUpdates.link_default = updates.link_override;
        instanceUpdates.link_override = null;
      }
      if (updates.prioridade !== undefined) {
        templateUpdates.prioridade_default = updates.prioridade;
        instanceUpdates.prioridade = updates.prioridade;
      }

      const { error: templateError } = await (supabase.from("checklist_templates") as any)
        .update(templateUpdates)
        .eq("id", current.template_id);

      if (templateError) {
        toast({ variant: "destructive", title: "Erro ao atualizar a série", description: templateError.message });
        return;
      }

      const siblingIds = instances
        .filter((instance) => {
          if (instance.mes !== mes || instance.ano !== ano || instance.parent_id) return false;
          const sameTemplate = Boolean(current.template_id && instance.template_id === current.template_id);
          const sameLegacyRecurring = instance.tipo_item === "recorrente" && instance.descricao === current.descricao;
          return sameTemplate || sameLegacyRecurring;
        })
        .map((instance) => instance.id);

      if (siblingIds.length > 0 && Object.keys(instanceUpdates).length > 0) {
        const { error: instancesError } = await (supabase.from("checklist_instances") as any)
          .update(instanceUpdates)
          .in("id", siblingIds);
        if (instancesError) {
          loadData();
          toast({ variant: "destructive", title: "Erro ao atualizar as semanas", description: instancesError.message });
          return;
        }
      }

      setTemplates((previous) => previous.map((template) => template.id === current.template_id ? {
        ...template,
        ...(updates.descricao_override !== undefined && { descricao: updates.descricao_override }),
        ...(updates.link_override !== undefined && { link_default: updates.link_override }),
      } : template));
      setInstances((previous) => previous.map((instance) => siblingIds.includes(instance.id) ? {
        ...instance,
        ...(updates.descricao_override !== undefined && { descricao: updates.descricao_override, descricao_override: null }),
        ...(updates.link_override !== undefined && { link: updates.link_override, link_override: null }),
        ...(updates.prioridade !== undefined && { prioridade: updates.prioridade }),
      } : instance));
      toast({ title: "Série atualizada", description: "A alteração foi aplicada às semanas deste mês e ao modelo futuro." });
      return;
    }

    setInstances((previous) => previous.map((instance) => instance.id === instanceId ? {
      ...instance,
      ...(updates.descricao_override !== undefined && { descricao: updates.descricao_override }),
      ...(updates.link_override !== undefined && { link: updates.link_override }),
      ...(updates.prioridade !== undefined && { prioridade: updates.prioridade }),
      ...updates,
    } : instance));

    const { error } = await (supabase.from("checklist_instances") as any).update(updates).eq("id", instanceId);
    if (error) {
      loadData();
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
    }
  }, [ano, instances, loadData, mes, toast]);

  // Delete instance
  const deleteInstance = useCallback(async (instanceId: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== instanceId && i.parent_id !== instanceId));

    const { error } = await (supabase.from("checklist_instances") as any)
      .delete()
      .eq("id", instanceId);

    if (error) {
      console.error("Error deleting instance:", error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao remover", description: error.message });
    } else {
      toast({ title: "Item removido", description: "O item foi removido do checklist" });
    }
  }, [loadData, toast]);

  // Add new item
  const addItem = useCallback(async (params: {
    descricao: string;
    tipo_item: TipoItem;
    semanas: number[];
    meses: number[];
    anos: number[];
    link?: string;
    assignees?: string[];
    parent_id?: string;
    prioridade?: Prioridade;
  }) => {
    try {
      if (params.tipo_item === "recorrente") {
        // Create a template first
        const { data: templateData, error: templateError } = await (supabase
          .from("checklist_templates") as any)
          .insert({
            descricao: params.descricao,
            link_default: params.link || null,
            ordem_global: templates.length,
            semanas_aplicaveis: params.semanas,
            prioridade_default: params.prioridade || null,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Add default assignees to template
        if (params.assignees && params.assignees.length > 0) {
          await (supabase.from("checklist_template_assignees") as any)
            .insert(params.assignees.map((userId) => ({
              template_id: templateData.id,
              user_id: userId,
            })));
        }

        // Create instances for each combination
        const instancesInsert: any[] = [];
        for (const year of params.anos) {
          for (const month of params.meses) {
            for (const week of (params.tipo_item === "avulso_mes" ? [params.semanas[0] ?? 1] : params.semanas)) {
              instancesInsert.push({
                template_id: templateData.id,
                ano: year,
                mes: month,
                semana: week,
                tipo_item: "recorrente",
                parent_id: params.parent_id || null,
                prioridade: params.prioridade || null,
              });
            }
          }
        }

        const { data: insertedInstances, error: instanceError } = await (supabase
          .from("checklist_instances") as any)
          .insert(instancesInsert)
          .select();

        if (instanceError) throw instanceError;

        // Add assignees to each instance
        if (params.assignees && params.assignees.length > 0 && insertedInstances) {
          const assigneeInserts = insertedInstances.flatMap((inst: any) =>
            params.assignees!.map((userId) => ({
              instance_id: inst.id,
              user_id: userId,
            }))
          );
          await (supabase.from("checklist_instance_assignees") as any).insert(assigneeInserts);
        }
      } else {
        // Avulso - create instance(s) directly without template
        const instancesInsert: any[] = [];
        for (const year of params.anos) {
          for (const month of params.meses) {
            for (const week of (params.tipo_item === "avulso_mes" ? [params.semanas[0] ?? 1] : params.semanas)) {
              instancesInsert.push({
                template_id: null,
                ano: year,
                mes: month,
                semana: week,
                tipo_item: params.tipo_item,
                descricao_override: params.descricao,
                link_override: params.link || null,
                parent_id: params.parent_id || null,
                prioridade: params.prioridade || null,
              });
            }
          }
        }

        const { data: insertedInstances, error } = await (supabase
          .from("checklist_instances") as any)
          .insert(instancesInsert)
          .select();

        if (error) throw error;

        if (params.assignees && params.assignees.length > 0 && insertedInstances) {
          const assigneeInserts = insertedInstances.flatMap((inst: any) =>
            params.assignees!.map((userId) => ({
              instance_id: inst.id,
              user_id: userId,
            }))
          );
          await (supabase.from("checklist_instance_assignees") as any).insert(assigneeInserts);
        }
      }

      toast({ title: "Item adicionado", description: "O item foi adicionado ao checklist" });
      await loadData(); // Full reload needed for complex multi-week/month inserts
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({ variant: "destructive", title: "Erro ao adicionar", description: error.message });
    }
  }, [templates, loadData, toast]);

  // Reorder item. Recurring order becomes the month pattern, not only one week.
  const reorderItem = useCallback(async (instanceId: string, newIndex: number, semana: number) => {
    const weekItems = instances
      .filter((i) => i.semana === semana && i.tipo_item !== "avulso_mes" && !i.parent_id)
      .sort((a, b) => a.ordem - b.ordem);

    const oldIndex = weekItems.findIndex((i) => i.id === instanceId);
    if (oldIndex === -1 || oldIndex === newIndex) return;

    const movedItem = weekItems[oldIndex];
    const reordered = [...weekItems];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedItem);

    const recurringOrderByTemplate = new Map<string, number>();
    const recurringOrderByDescription = new Map<string, number>();
    reordered.forEach((item, idx) => {
      if (item.tipo_item !== "recorrente") return;
      if (item.template_id) recurringOrderByTemplate.set(item.template_id, idx);
      recurringOrderByDescription.set(item.descricao, idx);
    });

    setInstances((prev) =>
      prev.map((inst) => {
        const directPos = reordered.findIndex((r) => r.id === inst.id);
        if (directPos !== -1 && inst.semana === semana && !inst.parent_id) {
          return { ...inst, ordem: directPos, ordem_override: directPos };
        }
        if (inst.tipo_item === "recorrente" && inst.mes === mes && inst.ano === ano && !inst.parent_id) {
          const recurringPos = inst.template_id
            ? recurringOrderByTemplate.get(inst.template_id)
            : recurringOrderByDescription.get(inst.descricao);
          if (recurringPos !== undefined) return { ...inst, ordem: recurringPos, ordem_override: recurringPos };
        }
        return inst;
      })
    );

    const instanceUpdates = instances
      .filter((inst) => {
        if (inst.semana === semana && !inst.parent_id && reordered.some((r) => r.id === inst.id)) return true;
        if (inst.tipo_item !== "recorrente" || inst.mes !== mes || inst.ano !== ano || inst.parent_id) return false;
        if (inst.template_id && recurringOrderByTemplate.has(inst.template_id)) return true;
        return recurringOrderByDescription.has(inst.descricao);
      })
      .map((inst) => {
        const directPos = reordered.findIndex((r) => r.id === inst.id);
        const ordem = directPos !== -1
          ? directPos
          : inst.template_id
            ? recurringOrderByTemplate.get(inst.template_id)
            : recurringOrderByDescription.get(inst.descricao);
        return ordem === undefined ? null : { id: inst.id, ordem };
      })
      .filter(Boolean) as Array<{ id: string; ordem: number }>;

    await Promise.all([
      ...instanceUpdates.map((item) =>
        (supabase.from("checklist_instances") as any)
          .update({ ordem_override: item.ordem })
          .eq("id", item.id)
      ),
      ...Array.from(recurringOrderByTemplate.entries()).map(([templateId, ordem]) =>
        (supabase.from("checklist_templates") as any)
          .update({ ordem_global: ordem })
          .eq("id", templateId)
      ),
    ]);
  }, [ano, instances, mes]);
  // Reorder sub-item within a parent group
  const reorderSubItem = useCallback(async (instanceId: string, newIndex: number, parentId: string) => {
    const children = instances
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.ordem - b.ordem);

    const oldIndex = children.findIndex((i) => i.id === instanceId);
    if (oldIndex === -1 || oldIndex === newIndex) return;

    const reordered = [...children];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setInstances((prev) =>
      prev.map((inst) => {
        const newPos = reordered.findIndex((r) => r.id === inst.id);
        if (newPos !== -1 && inst.parent_id === parentId) {
          return { ...inst, ordem: newPos, ordem_override: newPos };
        }
        return inst;
      })
    );

    const updates = reordered.map((item, idx) =>
      (supabase.from("checklist_instances") as any)
        .update({ ordem_override: idx })
        .eq("id", item.id)
    );
    await Promise.all(updates);
  }, [instances]);

  // Assignment changes on recurring items follow the same series identity.
  const updateAssignees = useCallback(async (instanceId: string, userIds: string[]) => {
    const current = instances.find((instance) => instance.id === instanceId);
    if (!current) return;

    const targets = current.tipo_item === "recorrente" && current.template_id
      ? instances.filter((instance) => instance.template_id === current.template_id && instance.mes === mes && instance.ano === ano)
      : [current];
    const targetIds = targets.map((instance) => instance.id);

    await (supabase.from("checklist_instance_assignees") as any).delete().in("instance_id", targetIds);
    if (userIds.length > 0) {
      await (supabase.from("checklist_instance_assignees") as any).insert(
        targetIds.flatMap((targetId) => userIds.map((userId) => ({ instance_id: targetId, user_id: userId }))),
      );
    }

    if (current.tipo_item === "recorrente" && current.template_id) {
      await (supabase.from("checklist_template_assignees") as any).delete().eq("template_id", current.template_id);
      if (userIds.length > 0) {
        await (supabase.from("checklist_template_assignees") as any).insert(
          userIds.map((userId) => ({ template_id: current.template_id, user_id: userId })),
        );
      }
    }

    setInstances((previous) => previous.map((instance) => targetIds.includes(instance.id) ? { ...instance, assignees: userIds } : instance));
  }, [ano, instances, mes]);

  // Rollover to next month - only recorrentes
  const rolloverToNextMonth = useCallback(async (fromMes: number, fromAno: number) => {
    try {
      let nextMes = fromMes + 1;
      let nextAno = fromAno;
      if (nextMes > 12) { nextMes = 1; nextAno++; }

      // Check if next month already has instances
      const { data: existing } = await (supabase
        .from("checklist_instances")
        .select("id") as any)
        .eq("mes", nextMes)
        .eq("ano", nextAno)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({ variant: "destructive", title: "Rollover já realizado", description: `O mês ${nextMes}/${nextAno} já possui itens.` });
        return;
      }

      // Get recorrente instances from source month
      const sourceInstances = instances.filter(
        (i) => i.mes === fromMes && i.ano === fromAno && i.tipo_item === "recorrente" && !i.parent_id
      );

      if (sourceInstances.length === 0) {
        toast({ variant: "destructive", title: "Nenhum item para copiar", description: "Não há itens recorrentes neste mês." });
        return;
      }

      const newInstances = sourceInstances.map((inst) => ({
        template_id: inst.template_id,
        ano: nextAno,
        mes: nextMes,
        semana: inst.semana,
        tipo_item: "recorrente",
        status: "pendente",
        link_override: inst.link_override,
        ordem_override: inst.ordem_override ?? inst.ordem,
        is_group: inst.is_group,
        descricao_override: inst.descricao_override,
        prioridade: inst.prioridade || null,
      }));

      const { data: inserted, error } = await (supabase.from("checklist_instances") as any)
        .insert(newInstances)
        .select();

      if (error) throw error;

      // Copy assignees
      if (inserted) {
        const assigneeInserts: any[] = [];
        for (let i = 0; i < sourceInstances.length; i++) {
          const src = sourceInstances[i];
          const dest = inserted[i];
          if (src.assignees && dest) {
            src.assignees.forEach((userId: string) => {
              assigneeInserts.push({ instance_id: dest.id, user_id: userId });
            });
          }
        }
        if (assigneeInserts.length > 0) {
          await (supabase.from("checklist_instance_assignees") as any).insert(assigneeInserts);
        }
      }

      // Also copy children (sub-items of groups) with assignees and order
      for (let i = 0; i < sourceInstances.length; i++) {
        const src = sourceInstances[i];
        if (src.is_group && inserted?.[i]) {
          const children = instances
            .filter((c) => c.parent_id === src.id)
            .sort((a, b) => a.ordem - b.ordem);
          if (children.length > 0) {
            const childInserts = children.map((child, idx) => ({
              template_id: child.template_id,
              ano: nextAno,
              mes: nextMes,
              semana: child.semana,
              tipo_item: child.tipo_item,
              status: "pendente",
              descricao_override: child.descricao_override,
              link_override: child.link_override,
              ordem_override: child.ordem_override ?? idx,
              prioridade: child.prioridade || null,
              parent_id: inserted[i].id,
            }));
            const { data: insertedChildren } = await (supabase.from("checklist_instances") as any)
              .insert(childInserts)
              .select();

            // Copy assignees for children
            if (insertedChildren) {
              const childAssigneeInserts: any[] = [];
              for (let j = 0; j < children.length; j++) {
                const srcChild = children[j];
                const destChild = insertedChildren[j];
                if (srcChild.assignees && destChild) {
                  srcChild.assignees.forEach((userId: string) => {
                    childAssigneeInserts.push({ instance_id: destChild.id, user_id: userId });
                  });
                }
              }
              if (childAssigneeInserts.length > 0) {
                await (supabase.from("checklist_instance_assignees") as any).insert(childAssigneeInserts);
              }
            }
          }
        }
      }

      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      toast({
        title: "Rollover concluído",
        description: `${sourceInstances.length} itens copiados para ${monthNames[nextMes - 1]}/${nextAno}`,
      });
    } catch (error: any) {
      console.error("Error during rollover:", error);
      toast({ variant: "destructive", title: "Erro no rollover", description: error.message });
    }
  }, [instances, toast]);

  // Add sub-item to a group
  const addSubItem = useCallback(async (parentId: string, descricao: string, semana: number) => {
    try {
      // Mark parent as group if not already
      const parent = instances.find((i) => i.id === parentId);
      if (parent && !parent.is_group) {
        await (supabase.from("checklist_instances") as any)
          .update({ is_group: true })
          .eq("id", parentId);
      }

      const { data: inserted, error } = await (supabase.from("checklist_instances") as any)
        .insert({
          template_id: null,
          ano,
          mes,
          semana,
          tipo_item: "avulso_semana",
          descricao_override: descricao,
          parent_id: parentId,
        })
        .select()
        .single();

      if (error) throw error;

      const newInstance: ChecklistInstance = {
        ...inserted,
        descricao: descricao,
        link: null,
        ordem: inserted.ordem_override ?? 999,
        assignees: [],
      };
      setInstances((prev) => [
        ...prev.map((i) => (i.id === parentId ? { ...i, is_group: true } : i)),
        newInstance,
      ]);
      toast({ title: "Sub-item adicionado" });
    } catch (error: any) {
      console.error("Error adding sub-item:", error);
      toast({ variant: "destructive", title: "Erro ao adicionar sub-item", description: error.message });
    }
  }, [instances, mes, ano, toast]);

  // Quick add avulso item
  const addQuickAvulso = useCallback(async (descricao: string, semana = 1) => {
    try {
      const { data: inserted, error } = await (supabase.from("checklist_instances") as any)
        .insert({
          template_id: null,
          ano,
          mes,
          semana,
          tipo_item: "avulso_mes",
          descricao_override: descricao,
          status: "pendente",
        })
        .select()
        .single();

      if (error) throw error;

      const newInstance: ChecklistInstance = {
        ...inserted,
        descricao: descricao,
        link: null,
        ordem: inserted.ordem_override ?? 999,
        assignees: [],
      };
      setInstances((prev) => [...prev, newInstance]);
      toast({ title: "Avulso adicionado", description: "Item avulso criado com sucesso" });
    } catch (error: any) {
      console.error("Error adding quick avulso:", error);
      toast({ variant: "destructive", title: "Erro ao adicionar avulso", description: error.message });
    }
  }, [ano, mes, toast]);

  // Delete all instances for a specific week
  const deleteAllWeekInstances = useCallback(async (semana: number) => {
    try {
      const weekIds = instances
        .filter((i) => i.mes === mes && i.ano === ano && i.semana === semana && i.tipo_item !== "avulso_mes")
        .map((i) => i.id);
      if (weekIds.length === 0) return;

      // Delete assignees first
      await (supabase.from("checklist_instance_assignees") as any)
        .delete()
        .in("instance_id", weekIds);

      // Delete instances
      const { error } = await (supabase.from("checklist_instances") as any)
        .delete()
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("semana", semana)
        .neq("tipo_item", "avulso_mes");

      if (error) throw error;

      setInstances((prev) => prev.filter(
        (i) => i.mes !== mes || i.ano !== ano || i.semana !== semana || i.tipo_item === "avulso_mes",
      ));
      toast({ title: "Semana limpa", description: `Todos os itens da ${semana}ª semana foram removidos.` });
    } catch (error: any) {
      console.error("Error deleting week instances:", error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao apagar semana", description: error.message });
    }
  }, [instances, mes, ano, loadData, toast]);

  // Delete all instances for the current month
  const deleteAllMonthInstances = useCallback(async () => {
    try {
      const allIds = instances
        .filter((i) => i.mes === mes && i.ano === ano)
        .map((i) => i.id);
      if (allIds.length === 0) return;

      // Delete assignees first
      await (supabase.from("checklist_instance_assignees") as any)
        .delete()
        .in("instance_id", allIds);

      // Delete all instances for this month
      const { error } = await (supabase.from("checklist_instances") as any)
        .delete()
        .eq("mes", mes)
        .eq("ano", ano);

      if (error) throw error;

      setInstances((prev) => prev.filter((i) => i.mes !== mes || i.ano !== ano));
      toast({ title: "Mês limpo", description: `Todos os itens do mês foram removidos.` });
    } catch (error: any) {
      console.error("Error deleting all instances:", error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao apagar mês", description: error.message });
    }
  }, [instances, mes, ano, loadData, toast]);

  return {
    templates,
    instances,
    isLoading,
    getInstancesByWeek,
    monthlyAvulsos: instances.filter((instance) => instance.tipo_item === "avulso_mes" && !instance.parent_id),
    getWeekStats,
    updateInstanceStatus,
    updateInstance,
    deleteInstance,
    addItem,
    reorderItem,
    reorderSubItem,
    updateAssignees,
    rolloverToNextMonth,
    addSubItem,
    addQuickAvulso,
    deleteAllWeekInstances,
    deleteAllMonthInstances,
    refetch: loadData,
  };
}


