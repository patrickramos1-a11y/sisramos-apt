import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
// MultiSelectDropdown now has built-in search

export interface ChecklistMultiFilters {
  meses: string[];
  anos: string[];
  semanas: string[];
  searchTerm: string;
}

interface ChecklistFiltersProps {
  filters: ChecklistMultiFilters;
  onFiltersChange: (filters: ChecklistMultiFilters) => void;
  onClearFilters: () => void;
}

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const SEMANAS = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

export default function ChecklistFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: ChecklistFiltersProps) {
  // Guard against undefined filters during hot reload
  if (!filters) {
    return null;
  }

  const hasActiveFilters =
    filters.semanas.length > 0 ||
    filters.searchTerm.trim() !== "" ||
    filters.meses.length !== 1 ||
    filters.anos.length !== 1 ||
    (filters.meses.length === 1 && filters.meses[0] !== String(new Date().getMonth() + 1)) ||
    (filters.anos.length === 1 && filters.anos[0] !== String(new Date().getFullYear()));

  const updateFilter = <K extends keyof ChecklistMultiFilters>(
    key: K,
    value: ChecklistMultiFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Ano */}
        <div className="w-full sm:w-32">
          <MultiSelectDropdown
            options={ANOS}
            selected={filters.anos}
            onChange={(value) => updateFilter("anos", value)}
            placeholder="Ano"
          />
        </div>

        {/* Mês */}
        <div className="w-full sm:w-40">
          <MultiSelectDropdown
            options={MESES}
            selected={filters.meses}
            onChange={(value) => updateFilter("meses", value)}
            placeholder="Mês"
          />
        </div>

        {/* Semana */}
        <div className="w-full sm:w-40">
          <MultiSelectDropdown
            options={SEMANAS}
            selected={filters.semanas}
            onChange={(value) => updateFilter("semanas", value)}
            placeholder="Todas as semanas"
          />
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-10 gap-2 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Textarea
          placeholder="Pesquisar itens do checklist..."
          value={filters.searchTerm}
          onChange={(e) => updateFilter("searchTerm", e.target.value)}
          className="pl-10 min-h-[44px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
      </div>
    </div>
  );
}
