import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

export interface MultiFilters {
  responsaveis: string[];
  setores: string[];
  meses: string[];
  anos: string[];
  semanas: string[];
  statusResponsavel: string[];
  statusGestor: string[];
  busca: string;
}

interface APTFiltersProps {
  profiles: Profile[];
  setores: Setor[];
  filters: MultiFilters;
  onFiltersChange: (filters: MultiFilters) => void;
  onClearFilters: () => void;
  showResponsavelFilter?: boolean;
}

const meses = [
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

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "executado", label: "Executado" },
  { value: "nao_realizado", label: "Não Realizado" },
];

const semanaOptions = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

interface MultiSelectDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Selecionar...",
}: MultiSelectDropdownProps) {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || selected[0];
    }
    return `${selected.length} selecionados`;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between font-normal",
              selected.length > 0 && "text-foreground"
            )}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full min-w-[200px] p-0 bg-popover border shadow-lg z-50" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleAll();
              }}
            >
              <Checkbox
                checked={selected.length === options.length}
                className="pointer-events-none"
              />
              <span className="text-sm font-medium">
                {selected.length === options.length ? "Desmarcar todos" : "Selecionar todos"}
              </span>
            </div>
            <div className="border-t my-1" />
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleOption(option.value);
                }}
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  className="pointer-events-none"
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function APTFilters({
  profiles,
  setores,
  filters,
  onFiltersChange,
  onClearFilters,
  showResponsavelFilter = true,
}: APTFiltersProps) {
  const updateFilter = <K extends keyof MultiFilters>(key: K, value: MultiFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.responsaveis.length > 0 ||
    filters.setores.length > 0 ||
    filters.meses.length > 0 ||
    filters.anos.length > 0 ||
    filters.semanas.length > 0 ||
    filters.statusResponsavel.length > 0 ||
    filters.statusGestor.length > 0 ||
    filters.busca !== "";

  const responsavelOptions = profiles.map((p) => ({
    value: p.user_id,
    label: p.nome,
  }));

  const setorOptions = setores.map((s) => ({
    value: s.id,
    label: s.nome,
  }));

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Buscar</Label>
        <Input
          placeholder="Buscar por descrição..."
          value={filters.busca}
          onChange={(e) => updateFilter("busca", e.target.value)}
        />
      </div>

      {showResponsavelFilter && (
        <MultiSelectDropdown
          label="Responsáveis"
          options={responsavelOptions}
          selected={filters.responsaveis}
          onChange={(v) => updateFilter("responsaveis", v)}
          placeholder="Todos"
        />
      )}

      <MultiSelectDropdown
        label="Setores"
        options={setorOptions}
        selected={filters.setores}
        onChange={(v) => updateFilter("setores", v)}
        placeholder="Todos"
      />

      <div className="grid grid-cols-2 gap-2">
        <MultiSelectDropdown
          label="Meses"
          options={meses}
          selected={filters.meses}
          onChange={(v) => updateFilter("meses", v)}
          placeholder="Todos"
        />

        <MultiSelectDropdown
          label="Anos"
          options={anos}
          selected={filters.anos}
          onChange={(v) => updateFilter("anos", v)}
          placeholder="Todos"
        />
      </div>

      <MultiSelectDropdown
        label="Semanas"
        options={semanaOptions}
        selected={filters.semanas}
        onChange={(v) => updateFilter("semanas", v)}
        placeholder="Todas"
      />

      <MultiSelectDropdown
        label="Status Responsável"
        options={statusOptions}
        selected={filters.statusResponsavel}
        onChange={(v) => updateFilter("statusResponsavel", v)}
        placeholder="Todos"
      />

      <MultiSelectDropdown
        label="Status Gestor"
        options={statusOptions}
        selected={filters.statusGestor}
        onChange={(v) => updateFilter("statusGestor", v)}
        placeholder="Todos"
      />

      <Button 
        variant="destructive" 
        className="w-full" 
        onClick={onClearFilters}
        disabled={!hasActiveFilters}
      >
        <X className="mr-2 h-4 w-4" />
        Limpar Todos os Filtros
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop filters */}
      <div className="hidden lg:block">
        <FilterContent />
      </div>

      {/* Mobile filters */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
