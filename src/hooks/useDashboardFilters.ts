import { useState, useCallback, useMemo } from "react";

export interface DashboardFilters {
  ano: string;
  mes: string;
  semana: string;
  responsavel: string;
  setor: string;
  statusFeito: string;
  statusAprovado: string;
  repeticao: string;
  urgente: boolean;
  prioridade: boolean;
}

export interface CrossFilter {
  type: "status" | "semana" | "responsavel" | "setor" | "repeticao";
  value: string;
}

const defaultFilters: DashboardFilters = {
  ano: new Date().getFullYear().toString(),
  mes: (new Date().getMonth() + 1).toString(),
  semana: "all",
  responsavel: "all",
  setor: "all",
  statusFeito: "all",
  statusAprovado: "all",
  repeticao: "all",
  urgente: false,
  prioridade: false,
};

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  const updateFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Clear cross-filter when global filter changes
    setCrossFilter(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setCrossFilter(null);
  }, []);

  const applyCrossFilter = useCallback((filter: CrossFilter | null) => {
    setCrossFilter(filter);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.ano !== defaultFilters.ano ||
      filters.mes !== defaultFilters.mes ||
      filters.semana !== "all" ||
      filters.responsavel !== "all" ||
      filters.setor !== "all" ||
      filters.statusFeito !== "all" ||
      filters.statusAprovado !== "all" ||
      filters.repeticao !== "all" ||
      filters.urgente ||
      filters.prioridade ||
      crossFilter !== null
    );
  }, [filters, crossFilter]);

  return {
    filters,
    crossFilter,
    updateFilter,
    clearFilters,
    applyCrossFilter,
    hasActiveFilters,
  };
}
