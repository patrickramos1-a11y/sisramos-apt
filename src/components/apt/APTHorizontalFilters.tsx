import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, ChevronDown, Search } from "lucide-react";
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
  repeticoes: string[];
  busca: string;
  urgente: boolean;
  prioridade: boolean;
}

interface APTHorizontalFiltersProps {
  profiles: Profile[];
  setores: Setor[];
  filters: MultiFilters;
  onFiltersChange: (filters: MultiFilters) => void;
  onClearFilters: () => void;
  showResponsavelFilter?: boolean;
}

const meses = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Fev" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Abr" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Ago" },
  { value: "9", label: "Set" },
  { value: "10", label: "Out" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dez" },
];

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "executado", label: "Executado" },
  { value: "nao_realizado", label: "Não Realizado" },
];

const semanaOptions = [
  { value: "1", label: "1ª" },
  { value: "2", label: "2ª" },
  { value: "3", label: "3ª" },
  { value: "4", label: "4ª" },
  { value: "5", label: "5ª" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

const repeticaoOptions = [
  { value: "1", label: "1X" },
  { value: "2", label: "2X" },
  { value: "3", label: "3X" },
  { value: "4", label: "4X" },
  { value: "5", label: "5X" },
];

interface CompactDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

function CompactDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Todos",
}: CompactDropdownProps) {
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
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            size="sm"
            className={cn(
              "h-9 min-w-[100px] justify-between font-normal text-xs",
              selected.length > 0 && "text-foreground border-primary/50"
            )}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto min-w-[140px] p-0 bg-popover border shadow-lg z-50" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {options.length > 5 && (
            <div className="p-1.5 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 pl-7 text-xs"
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
            {!search && (
              <>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-xs"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAll(); }}
                >
                  <Checkbox checked={selected.length === options.length} className="pointer-events-none h-3.5 w-3.5" />
                  <span className="font-medium">
                    {selected.length === options.length ? "Desmarcar todos" : "Selecionar todos"}
                  </span>
                </div>
                <div className="border-t my-0.5" />
              </>
            )}
            {filteredOptions.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-2">Nenhum resultado</div>
            )}
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-xs"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleOption(option.value);
                }}
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  className="pointer-events-none h-3.5 w-3.5"
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function APTHorizontalFilters({
  profiles,
  setores,
  filters,
  onFiltersChange,
  onClearFilters,
  showResponsavelFilter = true,
}: APTHorizontalFiltersProps) {
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
    filters.repeticoes.length > 0 ||
    filters.busca !== "" ||
    filters.urgente ||
    filters.prioridade;

  const responsavelOptions = profiles.map((p) => ({
    value: p.user_id,
    label: p.nome,
  }));

  const setorOptions = setores.map((s) => ({
    value: s.id,
    label: s.nome,
  }));

  return (
    <div className="bg-card border rounded-lg p-3 mb-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-[300px]">
          <Label className="text-xs text-muted-foreground">Buscar demanda</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={filters.busca}
              onChange={(e) => updateFilter("busca", e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Responsável */}
        {showResponsavelFilter && (
          <CompactDropdown
            label="Responsável"
            options={responsavelOptions}
            selected={filters.responsaveis}
            onChange={(v) => updateFilter("responsaveis", v)}
          />
        )}

        {/* Setor */}
        <CompactDropdown
          label="Setor"
          options={setorOptions}
          selected={filters.setores}
          onChange={(v) => updateFilter("setores", v)}
        />

        {/* Repetições */}
        <CompactDropdown
          label="Repetições"
          options={repeticaoOptions}
          selected={filters.repeticoes}
          onChange={(v) => updateFilter("repeticoes", v)}
          placeholder="Todas"
        />

        {/* Mês */}
        <CompactDropdown
          label="Mês"
          options={meses}
          selected={filters.meses}
          onChange={(v) => updateFilter("meses", v)}
        />

        {/* Ano */}
        <CompactDropdown
          label="Ano"
          options={anos}
          selected={filters.anos}
          onChange={(v) => updateFilter("anos", v)}
        />

        {/* Semana */}
        <CompactDropdown
          label="Semana"
          options={semanaOptions}
          selected={filters.semanas}
          onChange={(v) => updateFilter("semanas", v)}
          placeholder="Todas"
        />

        {/* Status Responsável */}
        <CompactDropdown
          label="Status Feito"
          options={statusOptions}
          selected={filters.statusResponsavel}
          onChange={(v) => updateFilter("statusResponsavel", v)}
        />

        {/* Status Gestor */}
        <CompactDropdown
          label="Status Aprovado"
          options={statusOptions}
          selected={filters.statusGestor}
          onChange={(v) => updateFilter("statusGestor", v)}
        />

        {/* Urgente toggle */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Urgente</Label>
          <Button
            variant={filters.urgente ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 text-xs",
              filters.urgente && "bg-destructive hover:bg-destructive/90"
            )}
            onClick={() => updateFilter("urgente", !filters.urgente)}
          >
            Urgente
          </Button>
        </div>

        {/* Prioridade toggle */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Prioridade</Label>
          <Button
            variant={filters.prioridade ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 text-xs",
              filters.prioridade && "bg-warning hover:bg-warning/90 text-warning-foreground"
            )}
            onClick={() => updateFilter("prioridade", !filters.prioridade)}
          >
            Prioridade
          </Button>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-destructive hover:text-destructive gap-1"
            onClick={onClearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
