import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SortConfig, SortDirection } from "@/components/apt/DemandaSortHeader";


type StatusBolinha = "pendente" | "executado" | "nao_realizado";

export interface MultiFilters {
  responsaveis: string[];
  setores: string[];
  meses: string[];
  anos: string[];
  semanas: string[];
  statusResponsavel: string[];
  statusGestor: string[];
  repeticoes: string[];
  busca: string;
  urgente: boolean;
  prioridade: boolean;
}

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  observacoes: string | null;
  status_responsavel: StatusBolinha;
  status_gestor: StatusBolinha;
  semanas_repeticao: number;
  semana_limite: number[];
  data_limite: string | null;
  prioritaria: boolean;
  muito_urgente: boolean;
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
  cor?: string | null;
}

interface Setor {
  id: string;
  nome: string;
  cor: string;
  acoes?: unknown;
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
    repeticoes: [],
    busca: "",
    urgente: false,
    prioridade: false,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    numero: null,
    setor: null,
    responsavel: null,
    descricao: null,
    semana: null,
  });

  const { user, isGestorOrAdmin, profile } = useAuth();
  const { toast } = useToast();

  const fetchDemandas = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    let query = supabase
      .from("demandas")
      .select("*")
      .eq("ativa", true)
      // ordem estável (e global) baseada na numeração persistida no banco
      .order("numero", { ascending: true });

    // Colaboradores só veem suas próprias demandas
    if (!isGestorOrAdmin) {
      query = query.eq("responsavel_id", user.id);
    }

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
      
      // Filter by repetition count client-side
      if (filters.repeticoes.length > 0) {
        const repeticaoNumbers = filters.repeticoes.map((r) => parseInt(r));
        filteredData = filteredData.filter((d) =>
          repeticaoNumbers.includes(d.semanas_repeticao)
        );
      }
      
      // Filter by urgente (muito_urgente)
      if (filters.urgente) {
        filteredData = filteredData.filter((d) => d.muito_urgente);
      }
      
      // Filter by prioridade (prioritaria)
      if (filters.prioridade) {
        filteredData = filteredData.filter((d) => d.prioritaria);
      }
      
      setDemandas(filteredData);
    }

    setIsLoading(false);
  }, [user, filters, toast, isGestorOrAdmin]);

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
    if (!isGestorOrAdmin || !user || !profile) return;
    
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
      // Atualizar estado local
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
      repeticoes: [],
      busca: "",
      urgente: false,
      prioridade: false,
    });
  };

  const getProfileById = useCallback((userId: string) => {
    return profiles.find((p) => p.user_id === userId);
  }, [profiles]);

  const getSetorById = useCallback((setorId: string | null) => {
    if (!setorId) return null;
    return setores.find((s) => s.id === setorId);
  }, [setores]);

  // Toggle sort direction for a field
  const toggleSort = (field: keyof SortConfig) => {
    setSortConfig((prev) => {
      const current = prev[field];
      let next: SortDirection;
      if (current === null) next = "asc";
      else if (current === "asc") next = "desc";
      else next = null;
      return { ...prev, [field]: next };
    });
  };

  const resetSort = () => {
    setSortConfig({
      numero: null,
      setor: null,
      responsavel: null,
      descricao: null,
      semana: null,
    });
  };

  // Sort demandas based on sortConfig
  const sortedDemandas = useMemo(() => {
    // If no sort is applied, return original order (by numero)
    const hasAnySort = Object.values(sortConfig).some((v) => v !== null);
    if (!hasAnySort) {
      return [...demandas].sort((a, b) => a.numero - b.numero);
    }

    return [...demandas].sort((a, b) => {
      // Apply sorts in order: numero, setor, responsavel, descricao, semana
      if (sortConfig.numero) {
        const cmp = a.numero - b.numero;
        if (cmp !== 0) return sortConfig.numero === "asc" ? cmp : -cmp;
      }

      if (sortConfig.setor) {
        const setorA = getSetorById(a.setor_id)?.nome || "";
        const setorB = getSetorById(b.setor_id)?.nome || "";
        const cmp = setorA.localeCompare(setorB, "pt-BR");
        if (cmp !== 0) return sortConfig.setor === "asc" ? cmp : -cmp;
      }

      if (sortConfig.responsavel) {
        const respA = getProfileById(a.responsavel_id)?.nome || "";
        const respB = getProfileById(b.responsavel_id)?.nome || "";
        const cmp = respA.localeCompare(respB, "pt-BR");
        if (cmp !== 0) return sortConfig.responsavel === "asc" ? cmp : -cmp;
      }

      if (sortConfig.descricao) {
        const cmp = a.descricao.localeCompare(b.descricao, "pt-BR");
        if (cmp !== 0) return sortConfig.descricao === "asc" ? cmp : -cmp;
      }

      if (sortConfig.semana) {
        const semanaA = a.semana_limite?.length ? Math.min(...a.semana_limite) : 0;
        const semanaB = b.semana_limite?.length ? Math.min(...b.semana_limite) : 0;
        const cmp = semanaA - semanaB;
        if (cmp !== 0) return sortConfig.semana === "asc" ? cmp : -cmp;
      }

      // Tie-breaker: numero
      return a.numero - b.numero;
    });
  }, [demandas, sortConfig, getSetorById, getProfileById]);

  // Get sibling count for a demand - with heuristic fallback for null grupo_id
  const getSiblingCount = useCallback((demanda: { grupo_id: string | null; semanas_repeticao: number; descricao: string; responsavel_id: string; mes: number; ano: number }) => {
    if (demanda.grupo_id) {
      return demandas.filter((d) => d.grupo_id === demanda.grupo_id).length;
    }
    // Heuristic fallback: if semanas_repeticao > 1 but no grupo_id, match by description+responsavel+mes+ano
    if (demanda.semanas_repeticao > 1) {
      return demandas.filter((d) =>
        d.descricao === demanda.descricao &&
        d.responsavel_id === demanda.responsavel_id &&
        d.mes === demanda.mes &&
        d.ano === demanda.ano
      ).length;
    }
    return 1;
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
    sortConfig,
    toggleSort,
    resetSort,
    fetchDemandas,
    updateStatusResponsavel,
    updateStatusGestor,
    getProfileById,
    getSetorById,
    getSiblingCount,
    pendingCount,
    pendingApprovalCount,
  };
}
