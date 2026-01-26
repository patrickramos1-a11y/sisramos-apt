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
  mes: number;
  ano: number;
  semana?: number | null;
  searchTerm?: string;
}

export function useChecklist({ mes, ano, semana, searchTerm }: UseChecklistOptions) {
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
        .eq("mes", mes)
        .eq("ano", ano)
        .order("semana")
        .order("ordem")
        .order("created_at");

      if (semana) {
        query = query.eq("semana", semana);
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
  }, [mes, ano, semana, searchTerm]);

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

  const addItem = async (semanaNum: number, texto: string) => {
    try {
      // Get the max order for this week
      const weekItems = items.filter((i) => i.semana === semanaNum);
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

  const getItemsByWeek = (semanaNum: number) => {
    return items.filter((item) => item.semana === semanaNum);
  };

  const rolloverToNextMonth = async () => {
    try {
      // Calculate next month
      let nextMes = mes + 1;
      let nextAno = ano;
      if (nextMes > 12) {
        nextMes = 1;
        nextAno = ano + 1;
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
      const itemsToInsert: Array<{
        semana: number;
        texto: string;
        ordem: number;
        mes: number;
        ano: number;
        concluido: boolean;
      }> = items.map((item) => ({
        semana: item.semana,
        texto: item.texto,
        ordem: item.ordem,
        mes: nextMes,
        ano: nextAno,
        concluido: false,
      }));

      if (itemsToInsert.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhum item para copiar",
          description: "Não há itens no mês atual para copiar.",
        });
        return;
      }

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
