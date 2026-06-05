import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SortConfig, SortDirection } from "@/components/apt/DemandaSortHeader";
import { AptTag, uniqueTags } from "@/lib/tags";
import {
  DemandaModoExecucao,
  clearDemandasPrazoMeta,
  isPrazoColumnMissingError,
  mergeDemandasPrazoMeta,
  saveDemandasPrazoMeta,
} from "@/lib/demandas-prazo";


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
  persistente: boolean;
  prazo: boolean;
  tags: string[];
}

export interface Demanda {
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
  modo_execucao?: DemandaModoExecucao | null;
  semana_inicio_prazo?: number | null;
  semana_fim_prazo?: number | null;
  created_at: string;
  updated_at: string;
  tags?: AptTag[];
}

function getDemandaRepetitionCount(demanda: Pick<Demanda, "semanas_repeticao" | "semana_limite">) {
  const semanasMarcadas = Array.isArray(demanda.semana_limite)
    ? new Set(demanda.semana_limite.filter((semana) => Number.isFinite(Number(semana)))).size
    : 0;
  return Math.max(Number(demanda.semanas_repeticao) || 0, semanasMarcadas);
}

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cor?: string | null;
  avatar_url?: string | null;
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
  const [availableTags, setAvailableTags] = useState<AptTag[]>([]);
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
    persistente: false,
    prazo: false,
    tags: [],
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
      .select("*, demanda_tags(tag:tags(id,nome,slug,cor))")
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

    let { data, error } = (await query) as any;

    if (error && /demanda_tags|tags/i.test(error.message)) {
      let fallbackQuery = supabase
        .from("demandas")
        .select("*")
        .eq("ativa", true)
        .order("numero", { ascending: true });

      if (!isGestorOrAdmin) fallbackQuery = fallbackQuery.eq("responsavel_id", user.id);
      if (filters.meses.length > 0) fallbackQuery = fallbackQuery.in("mes", filters.meses.map((m) => parseInt(m)));
      if (filters.anos.length > 0) fallbackQuery = fallbackQuery.in("ano", filters.anos.map((a) => parseInt(a)));
      if (filters.responsaveis.length > 0) fallbackQuery = fallbackQuery.in("responsavel_id", filters.responsaveis);
      if (filters.setores.length > 0) fallbackQuery = fallbackQuery.in("setor_id", filters.setores);
      if (filters.statusResponsavel.length > 0) fallbackQuery = fallbackQuery.in("status_responsavel", filters.statusResponsavel as StatusBolinha[]);
      if (filters.statusGestor.length > 0) fallbackQuery = fallbackQuery.in("status_gestor", filters.statusGestor as StatusBolinha[]);
      if (filters.busca) fallbackQuery = fallbackQuery.ilike("descricao", `%${filters.busca}%`);

      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }

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
      let filteredData = mergeDemandasPrazoMeta(((data || []) as any[]).map((demanda) => ({
        ...demanda,
        tags: (demanda.demanda_tags || [])
          .map((item: any) => item.tag)
          .filter(Boolean),
      })) as Demanda[]);

      setAvailableTags(uniqueTags(filteredData.flatMap((demanda) => demanda.tags || [])));

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
          repeticaoNumbers.includes(getDemandaRepetitionCount(d))
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

      if (filters.prazo) {
        filteredData = filteredData.filter((d) => d.modo_execucao === "prazo");
      }

      if (filters.persistente) {
        filteredData = [];
      }

      if (filters.tags.length > 0) {
        const selectedTagIds = new Set(filters.tags);
        filteredData = filteredData.filter((d) =>
          (d.tags || []).some((tag) => selectedTagIds.has(tag.id))
        );
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
      meses: [String(new Date().getMonth() + 1)],
      anos: [String(new Date().getFullYear())],
      semanas: [],
      statusResponsavel: [],
      statusGestor: [],
      repeticoes: [],
      busca: "",
      urgente: false,
      prioridade: false,
      persistente: false,
      prazo: false,
      tags: [],
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

  const persistPrazoMeta = useCallback(
    async (
      demandaIds: string[],
      payload: {
        modo_execucao: DemandaModoExecucao;
        semana_inicio_prazo?: number | null;
        semana_fim_prazo?: number | null;
      }
    ) => {
      if (demandaIds.length === 0) return { localOnly: false };

      const patch = {
        modo_execucao: payload.modo_execucao,
        semana_inicio_prazo:
          payload.modo_execucao === "prazo" ? payload.semana_inicio_prazo ?? null : null,
        semana_fim_prazo:
          payload.modo_execucao === "prazo" ? payload.semana_fim_prazo ?? null : null,
      };

      const { error } = await supabase.from("demandas").update(patch).in("id", demandaIds);

      if (error) {
        if (isPrazoColumnMissingError(error)) {
          throw new Error("As colunas de demanda com prazo ainda não estão disponíveis no Supabase. Nada foi salvo localmente.");
        }
        throw error;
      }

      if (payload.modo_execucao === "prazo") saveDemandasPrazoMeta(demandaIds, payload);
      else clearDemandasPrazoMeta(demandaIds);
      await fetchDemandas();
      return { localOnly: false };
    },
    [fetchDemandas]
  );

  return {
    demandas: sortedDemandas,
    profiles,
    setores,
    availableTags,
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
    persistPrazoMeta,
  };
}
