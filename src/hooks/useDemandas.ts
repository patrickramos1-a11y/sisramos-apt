import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  status_responsavel: StatusBolinha;
  status_gestor: StatusBolinha;
  semanas_repeticao: number;
  semana_limite: number;
  data_limite: string | null;
  prioritaria: boolean;
  ativa: boolean;
  mes: number;
  ano: number;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

interface Setor {
  id: string;
  nome: string;
  cor: string;
}

interface Filters {
  responsavel: string;
  setor: string;
  mes: string;
  ano: string;
  semanaLimite: string;
  statusResponsavel: string;
  statusGestor: string;
  busca: string;
}

export function useDemandas() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    responsavel: "",
    setor: "",
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    semanaLimite: "",
    statusResponsavel: "",
    statusGestor: "",
    busca: "",
  });

  const { user, isGestorOrAdmin } = useAuth();
  const { toast } = useToast();

  const fetchDemandas = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    let query = supabase
      .from("demandas")
      .select("*")
      .eq("ativa", true)
      .order("prioritaria", { ascending: false })
      .order("numero", { ascending: true });

    // Apply filters
    if (filters.mes && filters.mes !== "all") {
      query = query.eq("mes", parseInt(filters.mes));
    }
    if (filters.ano && filters.ano !== "all") {
      query = query.eq("ano", parseInt(filters.ano));
    }
    if (filters.responsavel && filters.responsavel !== "all") {
      query = query.eq("responsavel_id", filters.responsavel);
    }
    if (filters.setor && filters.setor !== "all") {
      query = query.eq("setor_id", filters.setor);
    }
    if (filters.semanaLimite && filters.semanaLimite !== "all") {
      query = query.eq("semana_limite", parseInt(filters.semanaLimite));
    }
    if (filters.statusResponsavel && filters.statusResponsavel !== "all") {
      query = query.eq("status_responsavel", filters.statusResponsavel as "pendente" | "executado" | "nao_realizado");
    }
    if (filters.statusGestor && filters.statusGestor !== "all") {
      query = query.eq("status_gestor", filters.statusGestor as "pendente" | "executado" | "nao_realizado");
    }
    if (filters.busca) {
      query = query.ilike("descricao", `%${filters.busca}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching demandas:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar demandas",
      });
    } else {
      setDemandas((data as Demanda[]) || []);
    }

    setIsLoading(false);
  }, [user, filters, toast]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) {
      setProfiles(data);
    }
  }, []);

  const fetchSetores = useCallback(async () => {
    const { data } = await supabase.from("setores").select("*").order("nome");
    if (data) {
      setSetores(data);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchSetores();
  }, [fetchProfiles, fetchSetores]);

  useEffect(() => {
    fetchDemandas();
  }, [fetchDemandas]);

  const cycleStatus = (current: StatusBolinha): StatusBolinha => {
    const cycle: StatusBolinha[] = ["pendente", "executado", "nao_realizado"];
    const currentIndex = cycle.indexOf(current);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  const updateStatusResponsavel = async (demandaId: string, currentStatus: StatusBolinha) => {
    const newStatus = cycleStatus(currentStatus);
    
    const { error } = await supabase
      .from("demandas")
      .update({ status_responsavel: newStatus })
      .eq("id", demandaId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar status",
      });
    } else {
      setDemandas((prev) =>
        prev.map((d) =>
          d.id === demandaId ? { ...d, status_responsavel: newStatus } : d
        )
      );
    }
  };

  const updateStatusGestor = async (demandaId: string, currentStatus: StatusBolinha) => {
    if (!isGestorOrAdmin) return;
    
    const newStatus = cycleStatus(currentStatus);
    
    const { error } = await supabase
      .from("demandas")
      .update({ status_gestor: newStatus })
      .eq("id", demandaId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar status",
      });
    } else {
      setDemandas((prev) =>
        prev.map((d) =>
          d.id === demandaId ? { ...d, status_gestor: newStatus } : d
        )
      );
    }
  };

  const clearFilters = () => {
    setFilters({
      responsavel: "",
      setor: "",
      mes: "",
      ano: "",
      semanaLimite: "",
      statusResponsavel: "",
      statusGestor: "",
      busca: "",
    });
  };

  const getProfileById = (userId: string) => {
    return profiles.find((p) => p.user_id === userId);
  };

  const getSetorById = (setorId: string | null) => {
    if (!setorId) return null;
    return setores.find((s) => s.id === setorId);
  };

  const pendingCount = demandas.filter(
    (d) => d.status_responsavel === "pendente"
  ).length;

  const pendingApprovalCount = demandas.filter(
    (d) => d.status_responsavel === "executado" && d.status_gestor === "pendente"
  ).length;

  return {
    demandas,
    profiles,
    setores,
    isLoading,
    filters,
    setFilters,
    clearFilters,
    fetchDemandas,
    updateStatusResponsavel,
    updateStatusGestor,
    getProfileById,
    getSetorById,
    pendingCount,
    pendingApprovalCount,
  };
}
