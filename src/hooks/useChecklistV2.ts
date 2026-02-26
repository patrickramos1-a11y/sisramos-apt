import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ChecklistStatus = "pendente" | "concluido" | "nao_realizado";
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
    const { data, error } = await (supabase
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
        descricao: inst.descricao_override || template?.descricao || "(Sem descrição)",
        link: inst.link_override ?? template?.link_default ?? null,
        ordem: inst.ordem_override ?? template?.ordem_global ?? 0,
        assignees: assigneesMap[inst.id] || [],
      };
    });

    setInstances(resolvedInstances);
    return resolvedInstances;
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedTemplates = await fetchTemplates();
      await fetchInstances(mes, ano, loadedTemplates);
    } finally {
      setIsLoading(false);
    }
  }, [mes, ano, fetchTemplates, fetchInstances]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is stable now

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get instances by week, building hierarchy
  const getInstancesByWeek = useCallback((semana: number) => {
    const weekInstances = instances
      .filter((i) => i.semana === semana && !i.parent_id)
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
    const weekItems = instances.filter((i) => i.semana === semana && !i.parent_id);
    const total = weekItems.length;
    const completed = weekItems.filter((i) => {
      if (i.is_group) {
        const children = instances.filter((c) => c.parent_id === i.id);
        return children.length > 0 && children.every((c) => c.status === "concluido");
      }
      return i.status === "concluido";
    }).length;
    const notDone = weekItems.filter((i) => {
      if (i.is_group) {
        const children = instances.filter((c) => c.parent_id === i.id);
        return children.length > 0 && children.every((c) => c.status === "nao_realizado");
      }
      return i.status === "nao_realizado";
    }).length;
    return { total, completed, notDone };
  }, [instances]);

  // Update instance status
  const updateInstanceStatus = useCallback(async (instanceId: string, newStatus: ChecklistStatus) => {
    // Optimistic update
    setInstances((prev) =>
      prev.map((i) => (i.id === instanceId ? { ...i, status: newStatus } : i))
    );

    const { error } = await (supabase
      .from("checklist_instances") as any)
      .update({ status: newStatus })
      .eq("id", instanceId);

    if (error) {
      console.error("Error updating instance status:", error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao atualizar status", description: error.message });
      return;
    }

    // Check if this instance has a parent - update parent status
    const instance = instances.find((i) => i.id === instanceId);
    if (instance?.parent_id) {
      await recalculateParentStatus(instance.parent_id);
    }
  }, [instances, loadData, toast]);

  // Recalculate parent status based on children
  const recalculateParentStatus = useCallback(async (parentId: string) => {
    const children = instances.filter((i) => i.parent_id === parentId);
    if (children.length === 0) return;

    let newStatus: ChecklistStatus = "pendente";
    const allConcluido = children.every((c) => c.status === "concluido");
    const allNaoRealizado = children.every((c) => c.status === "nao_realizado");
    const allProcessed = children.every((c) => c.status !== "pendente");

    if (allConcluido) newStatus = "concluido";
    else if (allNaoRealizado) newStatus = "nao_realizado";
    else if (allProcessed) newStatus = "nao_realizado"; // Mixed = not fully done

    setInstances((prev) =>
      prev.map((i) => (i.id === parentId ? { ...i, status: newStatus } : i))
    );

    await (supabase.from("checklist_instances") as any)
      .update({ status: newStatus })
      .eq("id", parentId);
  }, [instances]);

  // Update instance text/link
  const updateInstance = useCallback(async (instanceId: string, updates: { descricao_override?: string; link_override?: string | null }) => {
    setInstances((prev) =>
      prev.map((i) => {
        if (i.id !== instanceId) return i;
        return {
          ...i,
          ...(updates.descricao_override !== undefined && { descricao: updates.descricao_override }),
          ...(updates.link_override !== undefined && { link: updates.link_override }),
          ...updates,
        };
      })
    );

    const { error } = await (supabase.from("checklist_instances") as any)
      .update(updates)
      .eq("id", instanceId);

    if (error) {
      console.error("Error updating instance:", error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
    }
  }, [loadData, toast]);

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
            for (const week of params.semanas) {
              instancesInsert.push({
                template_id: templateData.id,
                ano: year,
                mes: month,
                semana: week,
                tipo_item: "recorrente",
                parent_id: params.parent_id || null,
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
            for (const week of params.semanas) {
              instancesInsert.push({
                template_id: null,
                ano: year,
                mes: month,
                semana: week,
                tipo_item: params.tipo_item,
                descricao_override: params.descricao,
                link_override: params.link || null,
                parent_id: params.parent_id || null,
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
      await loadData();
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({ variant: "destructive", title: "Erro ao adicionar", description: error.message });
    }
  }, [templates, loadData, toast]);

  // Reorder item
  const reorderItem = useCallback(async (instanceId: string, newIndex: number, semana: number) => {
    const weekItems = instances
      .filter((i) => i.semana === semana && !i.parent_id)
      .sort((a, b) => a.ordem - b.ordem);

    const oldIndex = weekItems.findIndex((i) => i.id === instanceId);
    if (oldIndex === -1 || oldIndex === newIndex) return;

    const movedItem = weekItems[oldIndex];
    const reordered = [...weekItems];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedItem);

    // Set ordem_override on EVERY item in this week (independent per week)
    setInstances((prev) =>
      prev.map((inst) => {
        const newPos = reordered.findIndex((r) => r.id === inst.id);
        if (newPos !== -1 && inst.semana === semana && !inst.parent_id) {
          return { ...inst, ordem: newPos, ordem_override: newPos };
        }
        return inst;
      })
    );

    // Batch update all items in this week with their new ordem_override
    const updates = reordered.map((item, idx) => 
      (supabase.from("checklist_instances") as any)
        .update({ ordem_override: idx })
        .eq("id", item.id)
    );
    await Promise.all(updates);
  }, [instances]);

  // Update assignees for an instance
  const updateAssignees = useCallback(async (instanceId: string, userIds: string[]) => {
    const current = instances.find((i) => i.id === instanceId);
    if (!current) return;

    const currentAssignees = current.assignees || [];
    const toAdd = userIds.filter((id) => !currentAssignees.includes(id));
    const toRemove = currentAssignees.filter((id) => !userIds.includes(id));

    if (toRemove.length > 0) {
      await (supabase.from("checklist_instance_assignees") as any)
        .delete()
        .eq("instance_id", instanceId)
        .in("user_id", toRemove);
    }

    if (toAdd.length > 0) {
      await (supabase.from("checklist_instance_assignees") as any)
        .insert(toAdd.map((userId) => ({ instance_id: instanceId, user_id: userId })));
    }

    setInstances((prev) =>
      prev.map((i) => (i.id === instanceId ? { ...i, assignees: userIds } : i))
    );
  }, [instances]);

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

      // Also copy children (sub-items of groups)
      for (let i = 0; i < sourceInstances.length; i++) {
        const src = sourceInstances[i];
        if (src.is_group && inserted?.[i]) {
          const children = instances.filter((c) => c.parent_id === src.id);
          if (children.length > 0) {
            const childInserts = children.map((child) => ({
              template_id: child.template_id,
              ano: nextAno,
              mes: nextMes,
              semana: child.semana,
              tipo_item: child.tipo_item,
              status: "pendente",
              descricao_override: child.descricao_override,
              link_override: child.link_override,
              parent_id: inserted[i].id,
            }));
            await (supabase.from("checklist_instances") as any).insert(childInserts);
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

      const { error } = await (supabase.from("checklist_instances") as any)
        .insert({
          template_id: null,
          ano,
          mes,
          semana,
          tipo_item: "avulso_semana",
          descricao_override: descricao,
          parent_id: parentId,
        });

      if (error) throw error;
      toast({ title: "Sub-item adicionado" });
      await loadData();
    } catch (error: any) {
      console.error("Error adding sub-item:", error);
      toast({ variant: "destructive", title: "Erro ao adicionar sub-item", description: error.message });
    }
  }, [instances, mes, ano, loadData, toast]);

  // Quick add avulso item
  const addQuickAvulso = useCallback(async (descricao: string, semana: number) => {
    try {
      const { error } = await (supabase.from("checklist_instances") as any)
        .insert({
          template_id: null,
          ano,
          mes,
          semana,
          tipo_item: "avulso_semana",
          descricao_override: descricao,
          status: "pendente",
        });

      if (error) throw error;
      toast({ title: "Avulso adicionado", description: "Item avulso criado com sucesso" });
      await loadData();
    } catch (error: any) {
      console.error("Error adding quick avulso:", error);
      toast({ variant: "destructive", title: "Erro ao adicionar avulso", description: error.message });
    }
  }, [ano, mes, loadData, toast]);

  // Delete all instances for a specific week
  const deleteAllWeekInstances = useCallback(async (semana: number) => {
    try {
      const weekIds = instances.filter((i) => i.semana === semana).map((i) => i.id);
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
        .eq("semana", semana);

      if (error) throw error;

      setInstances((prev) => prev.filter((i) => i.semana !== semana));
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
      const allIds = instances.map((i) => i.id);
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

      setInstances([]);
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
    getWeekStats,
    updateInstanceStatus,
    updateInstance,
    deleteInstance,
    addItem,
    reorderItem,
    updateAssignees,
    rolloverToNextMonth,
    addSubItem,
    addQuickAvulso,
    deleteAllWeekInstances,
    deleteAllMonthInstances,
    refetch: loadData,
  };
}
