import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Filter, SlidersHorizontal, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardFilters as FiltersType, CrossFilter } from "@/hooks/useDashboardFilters";
import { useIsMobile } from "@/hooks/use-mobile";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface DashboardFiltersProps {
  profiles: Profile[];
  setores: Setor[];
  filters: FiltersType;
  crossFilter: CrossFilter | null;
  onFilterChange: <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
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

const semanas = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "executado", label: "Executado" },
  { value: "nao_realizado", label: "Não Realizado" },
];

const repeticaoOptions = [
  { value: "1", label: "1X" },
  { value: "2", label: "2X" },
  { value: "3", label: "3X" },
  { value: "4", label: "4X" },
  { value: "5", label: "5X" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

// --- Multi-select dropdown with search ---
interface MultiSelectDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Todos",
  className,
}: MultiSelectDropdownProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

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
    return `${selected.length} sel.`;
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "h-9 justify-between font-normal",
              selected.length > 0 && "text-foreground"
            )}
          >
            <span className="truncate text-sm">{getDisplayText()}</span>
            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full min-w-[180px] p-0 bg-popover border shadow-lg z-50"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {options.length > 5 && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {!search && (
              <>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAll(); }}
                >
                  <Checkbox checked={selected.length === options.length} className="pointer-events-none" />
                  <span className="text-sm font-medium">
                    {selected.length === options.length ? "Desmarcar todos" : "Selecionar todos"}
                  </span>
                </div>
                <div className="border-t my-1" />
              </>
            )}
            {filteredOptions.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">Nenhum resultado</div>
            )}
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(option.value); }}
              >
                <Checkbox checked={selected.includes(option.value)} className="pointer-events-none" />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// --- Filter fields content ---
function FilterFields({
  profiles,
  setores,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  vertical = false,
}: DashboardFiltersProps & { vertical?: boolean }) {
  const containerClass = vertical
    ? "flex flex-col gap-4"
    : "flex flex-wrap items-end gap-3";

  return (
    <div className={containerClass}>
      <MultiSelectDropdown
        label="Ano"
        options={anos}
        selected={filters.anos}
        onChange={(v) => onFilterChange("anos", v)}
        className={vertical ? "" : "w-[110px]"}
      />
      <MultiSelectDropdown
        label="Mês"
        options={meses}
        selected={filters.meses}
        onChange={(v) => onFilterChange("meses", v)}
        className={vertical ? "" : "w-[130px]"}
      />
      <MultiSelectDropdown
        label="Semana"
        options={semanas}
        selected={filters.semanas}
        onChange={(v) => onFilterChange("semanas", v)}
        placeholder="Todas"
        className={vertical ? "" : "w-[120px]"}
      />
      <MultiSelectDropdown
        label="Responsável"
        options={profiles.map((p) => ({ value: p.user_id, label: p.nome }))}
        selected={filters.responsaveis}
        onChange={(v) => onFilterChange("responsaveis", v)}
        className={vertical ? "" : "w-[150px]"}
      />
      <MultiSelectDropdown
        label="Setor"
        options={setores.map((s) => ({ value: s.id, label: s.nome }))}
        selected={filters.setores}
        onChange={(v) => onFilterChange("setores", v)}
        className={vertical ? "" : "w-[150px]"}
      />
      <MultiSelectDropdown
        label="Status Feito"
        options={statusOptions}
        selected={filters.statusFeito}
        onChange={(v) => onFilterChange("statusFeito", v)}
        className={vertical ? "" : "w-[130px]"}
      />
      <MultiSelectDropdown
        label="Status Aprovado"
        options={statusOptions}
        selected={filters.statusAprovado}
        onChange={(v) => onFilterChange("statusAprovado", v)}
        className={vertical ? "" : "w-[130px]"}
      />
      <MultiSelectDropdown
        label="Repetições"
        options={repeticaoOptions}
        selected={filters.repeticoes}
        onChange={(v) => onFilterChange("repeticoes", v)}
        placeholder="Todas"
        className={vertical ? "" : "w-[100px]"}
      />

      {/* Toggle buttons */}
      <div className={cn(vertical ? "flex gap-2" : "flex gap-2")}>
        <Button
          variant={filters.urgente ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 flex-1",
            vertical && "h-11",
            filters.urgente && "bg-destructive hover:bg-destructive/90"
          )}
          onClick={() => onFilterChange("urgente", !filters.urgente)}
        >
          Urgente
        </Button>
        <Button
          variant={filters.prioridade ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 flex-1",
            vertical && "h-11",
            filters.prioridade && "bg-warning hover:bg-warning/90 text-warning-foreground"
          )}
          onClick={() => onFilterChange("prioridade", !filters.prioridade)}
        >
          Prioridade
        </Button>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-9 text-destructive hover:text-destructive gap-1", vertical && "h-11 w-full")}
          onClick={onClearFilters}
        >
          <X className="h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export default function DashboardFilters(props: DashboardFiltersProps) {
  const isMobile = useIsMobile();
  const { crossFilter, hasActiveFilters } = props;

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-11 min-w-[44px]">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                !
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] pb-safe">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros do Dashboard
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 max-h-[65vh]">
            <div className="pb-6">
              <FilterFields {...props} vertical />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros Globais</span>
        {crossFilter && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            Cross-filter: {crossFilter.type} = {crossFilter.value}
          </span>
        )}
      </div>
      <FilterFields {...props} />
    </div>
  );
}
