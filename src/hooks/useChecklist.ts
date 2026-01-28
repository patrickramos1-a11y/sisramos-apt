import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistItemAssignee {
  id: string;
  checklist_item_id: string;
  user_id: string;
}

export interface ChecklistItem {
  id: string;
  semana: number;
  texto: string;
  concluido: boolean;
  ordem: number;
  mes: number;
  ano: number;
  created_at: string;
  updated_at: string;
  assignees?: string[]; // user_ids assigned to this item
}

interface UseChecklistOptions {
  meses: number[];
  anos: number[];
  semanas: number[];
  searchTerm?: string;
}

export function useChecklist({ meses, anos, semanas, searchTerm }: UseChecklistOptions) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [assigneesMap, setAssigneesMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignees = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) return {};
    
    const { data, error } = await (supabase
      .from("checklist_item_assignees")
      .select("*") as any)
      .in("checklist_item_id", itemIds);
    
    if (error) {
      console.error("Error fetching assignees:", error);
      return {};
    }
    
    const map: Record<string, string[]> = {};
    (data || []).forEach((a: ChecklistItemAssignee) => {
      if (!map[a.checklist_item_id]) {
        map[a.checklist_item_id] = [];
      }
      map[a.checklist_item_id].push(a.user_id);
    });
    return map;
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      // Use any to bypass type checking for new columns not yet in types.ts
      let query = (supabase
        .from("checklist_items")
        .select("*") as any)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
        .order("semana")
        .order("ordem")
        .order("created_at");

      // Apply multi-select filters using .in() for arrays
      if (meses.length > 0) {
        query = query.in("mes", meses);
      }
      if (anos.length > 0) {
        query = query.in("ano", anos);
      }
      if (semanas.length > 0) {
        query = query.in("semana", semanas);
      }

      if (searchTerm && searchTerm.trim()) {
        query = query.ilike("texto", `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const fetchedItems = (data as ChecklistItem[]) || [];
      const itemIds = fetchedItems.map((i) => i.id);
      const assignees = await fetchAssignees(itemIds);
      setAssigneesMap(assignees);
      
      // Attach assignees to items
      const itemsWithAssignees = fetchedItems.map((item) => ({
        ...item,
        assignees: assignees[item.id] || [],
      }));
      
      setItems(itemsWithAssignees);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [meses, anos, semanas, searchTerm, fetchAssignees]);

  useEffect(() => {
    fetchItems();

    // Subscribe to realtime changes for checklist_items
    const itemsChannel = supabase
      .channel("checklist_items_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_items",
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for assignees
    const assigneesChannel = supabase
      .channel("checklist_assignees_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_item_assignees",
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(assigneesChannel);
    };
  }, [fetchItems]);

  const addItem = async (semanaNum: number, texto: string, mes: number, ano: number) => {
    try {
      // Get the max order for this week in this specific month/year
      const weekItems = items.filter(
        (i) => i.semana === semanaNum && i.mes === mes && i.ano === ano
      );
      const maxOrder = weekItems.length > 0 
        ? Math.max(...weekItems.map((i) => i.ordem)) 
        : -1;

      const { error } = await (supabase.from("checklist_items") as any).insert({
        semana: semanaNum,
        texto,
        ordem: maxOrder + 1,
        mes,
        ano,
      });

      if (error) throw error;

      toast({
        title: "Item adicionado",
        description: "O item foi adicionado ao checklist",
      });
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar",
        description: error.message,
      });
    }
  };

  const updateItem = async (id: string, updates: Partial<Pick<ChecklistItem, "texto" | "concluido">>) => {
    try {
      // Optimistically update local state immediately to prevent visual refresh
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      );

      const { error } = await supabase
        .from("checklist_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating item:", error);
      // Revert optimistic update on error
      fetchItems();
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Item removido",
        description: "O item foi removido do checklist",
      });
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message,
      });
    }
  };

  const getItemsByWeek = (semanaNum: number, mes?: number, ano?: number) => {
    return items.filter((item) => {
      let match = item.semana === semanaNum;
      if (mes !== undefined) match = match && item.mes === mes;
      if (ano !== undefined) match = match && item.ano === ano;
      return match;
    });
  };

  const rolloverToNextMonth = async (fromMes: number, fromAno: number) => {
    try {
      // Calculate next month
      let nextMes = fromMes + 1;
      let nextAno = fromAno;
      if (nextMes > 12) {
        nextMes = 1;
        nextAno = fromAno + 1;
      }

      // Get items from source month
      const sourceItems = items.filter((i) => i.mes === fromMes && i.ano === fromAno);

      if (sourceItems.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhum item para copiar",
          description: `Não há itens em ${fromMes}/${fromAno} para copiar.`,
        });
        return;
      }

      // Check if next month already has items
      const { data: existingItems } = await (supabase
        .from("checklist_items")
        .select("id") as any)
        .eq("mes", nextMes)
        .eq("ano", nextAno)
        .limit(1);

      if (existingItems && existingItems.length > 0) {
        toast({
          variant: "destructive",
          title: "Rollover já realizado",
          description: `O mês ${nextMes}/${nextAno} já possui itens cadastrados.`,
        });
        return;
      }

      // Copy items to next month with concluido = false
      const itemsToInsert = sourceItems.map((item) => ({
        semana: item.semana,
        texto: item.texto,
        ordem: item.ordem,
        mes: nextMes,
        ano: nextAno,
        concluido: false,
      }));

      const { error } = await (supabase.from("checklist_items") as any).insert(itemsToInsert);

      if (error) throw error;

      toast({
        title: "Rollover concluído",
        description: `${itemsToInsert.length} itens copiados para ${nextMes}/${nextAno}`,
      });
    } catch (error: any) {
      console.error("Error during rollover:", error);
      toast({
        variant: "destructive",
        title: "Erro no rollover",
        description: error.message,
      });
    }
  };

  const updateAssignees = async (itemId: string, userIds: string[]) => {
    try {
      // Get current assignees
      const currentAssignees = assigneesMap[itemId] || [];
      
      // Find users to add and remove
      const toAdd = userIds.filter((id) => !currentAssignees.includes(id));
      const toRemove = currentAssignees.filter((id) => !userIds.includes(id));
      
      // Remove unassigned users
      if (toRemove.length > 0) {
        const { error: deleteError } = await (supabase
          .from("checklist_item_assignees") as any)
          .delete()
          .eq("checklist_item_id", itemId)
          .in("user_id", toRemove);
        
        if (deleteError) throw deleteError;
      }
      
      // Add new assignees
      if (toAdd.length > 0) {
        const { error: insertError } = await (supabase
          .from("checklist_item_assignees") as any)
          .insert(toAdd.map((userId) => ({
            checklist_item_id: itemId,
            user_id: userId,
          })));
        
        if (insertError) throw insertError;
      }
      
      // Update local state immediately
      setAssigneesMap((prev) => ({
        ...prev,
        [itemId]: userIds,
      }));
      
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, assignees: userIds } : item
        )
      );
    } catch (error: any) {
      console.error("Error updating assignees:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atribuir usuários",
        description: error.message,
      });
    }
  };

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    getItemsByWeek,
    rolloverToNextMonth,
    updateAssignees,
    refetch: fetchItems,
  };
}
