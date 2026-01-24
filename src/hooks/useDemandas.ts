import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SortConfig, SortDirection } from "@/components/apt/DemandaSortHeader";
import { MultiFilters } from "@/components/apt/APTFilters";

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
  semana_limite: number[];
  data_limite: string | null;
  prioritaria: boolean;
  ativa: boolean;
  mes: number;
  ano: number;
  grupo_id: string | null;
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

export function useDemandas() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<MultiFilters>({
    responsaveis: [],
    setores: [],
    meses: [String(new Date().getMonth() + 1)],
    anos: [String(new Date().getFullYear())],
    semanas: [],
    statusResponsavel: [],
    statusGestor: [],
    busca: "",
  });
  // Ordenação padrão: setor, responsável e semana em ordem alfabética (A-Z)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    setor: "asc",
    responsavel: "asc",
    descricao: null,
    semana: "asc",
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
      // mantém uma ordem estável vinda do backend; a ordenação principal é feita client-side
      .order("created_at", { ascending: true });

    // Apply multi-select filters using .in() for arrays
    if (filters.meses.length > 0) {
      query = query.in("mes", filters.meses.map((m) => parseInt(m)));
    }
    if (filters.anos.length > 0) {
      query = query.in("ano", filters.anos.map((a) => parseInt(a)));
    }
    if (filters.responsaveis.length > 0) {
      query = query.in("responsavel_id", filters.responsaveis);
    }
    if (filters.setores.length > 0) {
      query = query.in("setor_id", filters.setores);
    }
    if (filters.statusResponsavel.length > 0) {
      query = query.in("status_responsavel", filters.statusResponsavel as StatusBolinha[]);
    }
    if (filters.statusGestor.length > 0) {
      query = query.in("status_gestor", filters.statusGestor as StatusBolinha[]);
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
      setDemandas([]);
    } else {
      // Filter semanas client-side since it's an array column
      let filteredData = data || [];
      if (filters.semanas.length > 0) {
        const semanaNumbers = filters.semanas.map((s) => parseInt(s));
        filteredData = filteredData.filter((d) =>
          d.semana_limite.some((sl: number) => semanaNumbers.includes(sl))
        );
      }
      setDemandas(filteredData);
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
      responsaveis: [],
      setores: [],
      meses: [],
      anos: [],
      semanas: [],
      statusResponsavel: [],
      statusGestor: [],
      busca: "",
    });
  };

  const getProfileById = useCallback((userId: string) => {
    return profiles.find((p) => p.user_id === userId);
  }, [profiles]);

  const getSetorById = useCallback((setorId: string | null) => {
    if (!setorId) return null;
    return setores.find((s) => s.id === setorId);
  }, [setores]);

  const toggleSort = (field: keyof SortConfig) => {
    setSortConfig((prev) => {
      const currentDirection = prev[field];
      let newDirection: SortDirection;
      
      if (currentDirection === null) {
        newDirection = "asc";
      } else if (currentDirection === "asc") {
        newDirection = "desc";
      } else {
        newDirection = null;
      }
      
      return { ...prev, [field]: newDirection };
    });
  };

  const resetSort = () => {
    setSortConfig({
      setor: "asc",
      responsavel: "asc",
      descricao: null,
      semana: "asc",
    });
  };

  // Sort demandas based on sortConfig
  const sortedDemandas = useMemo(() => {
    if (!Object.values(sortConfig).some((v) => v !== null)) {
      return demandas;
    }

    return [...demandas].sort((a, b) => {
      // Sort by each configured field in order
      for (const field of ["setor", "responsavel", "descricao", "semana"] as const) {
        const direction = sortConfig[field];
        if (!direction) continue;

        let comparison = 0;

        if (field === "setor") {
          const setorA = getSetorById(a.setor_id)?.nome || "";
          const setorB = getSetorById(b.setor_id)?.nome || "";
          comparison = setorA.localeCompare(setorB, "pt-BR");
        } else if (field === "responsavel") {
          const respA = getProfileById(a.responsavel_id)?.nome || "";
          const respB = getProfileById(b.responsavel_id)?.nome || "";
          comparison = respA.localeCompare(respB, "pt-BR");
        } else if (field === "descricao") {
          comparison = a.descricao.localeCompare(b.descricao, "pt-BR");
        } else if (field === "semana") {
          // semana_limite é um array: ordena pela menor semana marcada (1ª..5ª)
          const semanaA = a.semana_limite?.length ? Math.min(...a.semana_limite) : 0;
          const semanaB = b.semana_limite?.length ? Math.min(...b.semana_limite) : 0;
          comparison = semanaA - semanaB;
        }

        if (comparison !== 0) {
          return direction === "asc" ? comparison : -comparison;
        }
      }

      return 0;
    });
  }, [demandas, sortConfig, getSetorById, getProfileById]);

  // Get sibling count for a demand
  const getSiblingCount = useCallback((grupoId: string | null) => {
    if (!grupoId) return 1;
    return demandas.filter((d) => d.grupo_id === grupoId).length;
  }, [demandas]);

  const pendingCount = demandas.filter(
    (d) => d.status_responsavel === "pendente"
  ).length;

  const pendingApprovalCount = demandas.filter(
    (d) => d.status_responsavel === "executado" && d.status_gestor === "pendente"
  ).length;

  return {
    demandas: sortedDemandas,
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
    getSiblingCount,
    sortConfig,
    toggleSort,
    resetSort,
    pendingCount,
    pendingApprovalCount,
  };
}
