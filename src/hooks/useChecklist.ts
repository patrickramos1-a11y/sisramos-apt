import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistItem {
  id: string;
  semana: number;
  texto: string;
  concluido: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .order("semana")
        .order("ordem")
        .order("created_at");

      if (error) throw error;
      setItems((data as ChecklistItem[]) || []);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const addItem = async (semana: number, texto: string) => {
    try {
      // Get the max order for this week
      const weekItems = items.filter((i) => i.semana === semana);
      const maxOrder = weekItems.length > 0 
        ? Math.max(...weekItems.map((i) => i.ordem)) 
        : -1;

      const { error } = await supabase.from("checklist_items").insert({
        semana,
        texto,
        ordem: maxOrder + 1,
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

  const getItemsByWeek = (semana: number) => {
    return items.filter((item) => item.semana === semana);
  };

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    getItemsByWeek,
    refetch: fetchItems,
  };
}
