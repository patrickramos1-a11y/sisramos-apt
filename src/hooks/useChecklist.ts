import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

interface UseChecklistOptions {
  meses: number[];
  anos: number[];
  semanas: number[];
  searchTerm?: string;
}

export function useChecklist({ meses, anos, semanas, searchTerm }: UseChecklistOptions) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
      setItems((data as ChecklistItem[]) || []);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [meses, anos, semanas, searchTerm]);

  useEffect(() => {
    fetchItems();

    // Subscribe to realtime changes
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
      const { error } = await supabase
        .from("checklist_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating item:", error);
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

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    getItemsByWeek,
    rolloverToNextMonth,
    refetch: fetchItems,
  };
}
