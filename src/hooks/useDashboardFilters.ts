import { useState, useCallback, useMemo } from "react";

export interface DashboardFilters {
  anos: string[];
  meses: string[];
  semanas: string[];
  responsaveis: string[];
  setores: string[];
  statusFeito: string[];
  statusAprovado: string[];
  repeticoes: string[];
  urgente: boolean;
  prioridade: boolean;
  tags: string[];
}

export interface CrossFilter {
  type: "status" | "semana" | "responsavel" | "setor" | "repeticao";
  value: string;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const defaultFilters: DashboardFilters = {
  anos: [String(currentYear)],
  meses: [String(currentMonth)],
  semanas: [],
  responsaveis: [],
  setores: [],
  statusFeito: [],
  statusAprovado: [],
  repeticoes: [],
  urgente: false,
  prioridade: false,
  tags: [],
};

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  const updateFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      JSON.stringify(filters.anos) !== JSON.stringify(defaultFilters.anos) ||
      JSON.stringify(filters.meses) !== JSON.stringify(defaultFilters.meses) ||
      filters.semanas.length > 0 ||
      filters.responsaveis.length > 0 ||
      filters.setores.length > 0 ||
      filters.statusFeito.length > 0 ||
      filters.statusAprovado.length > 0 ||
      filters.repeticoes.length > 0 ||
      filters.tags.length > 0 ||
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
