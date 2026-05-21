import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X, ChevronDown, Search, Filter, Flame, Star, SlidersHorizontal } from "lucide-react";
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
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
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
  // Auto-apply: every change immediately propagates upward
  const update = <K extends keyof MultiFilters>(key: K, value: MultiFilters[K]) => {
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

  // Build the "active chips" list
  type Chip = { key: string; label: string; onRemove: () => void; tone?: "destructive" | "warning" };
  const chips: Chip[] = [];
  filters.meses.forEach((m) => {
    const opt = meses.find((o) => o.value === m);
    chips.push({ key: `mes-${m}`, label: `Mês: ${opt?.label || m}`, onRemove: () => update("meses", filters.meses.filter((x) => x !== m)) });
  });
  filters.anos.forEach((a) => {
    chips.push({ key: `ano-${a}`, label: `Ano: ${a}`, onRemove: () => update("anos", filters.anos.filter((x) => x !== a)) });
  });
  filters.responsaveis.forEach((r) => {
    const opt = responsavelOptions.find((o) => o.value === r);
    chips.push({ key: `resp-${r}`, label: `Resp: ${opt?.label || "—"}`, onRemove: () => update("responsaveis", filters.responsaveis.filter((x) => x !== r)) });
  });
  filters.setores.forEach((s) => {
    const opt = setorOptions.find((o) => o.value === s);
    chips.push({ key: `set-${s}`, label: `Setor: ${opt?.label || "—"}`, onRemove: () => update("setores", filters.setores.filter((x) => x !== s)) });
  });
  filters.semanas.forEach((w) => chips.push({ key: `sem-${w}`, label: `${w}ª semana`, onRemove: () => update("semanas", filters.semanas.filter((x) => x !== w)) }));
  filters.repeticoes.forEach((r) => chips.push({ key: `rep-${r}`, label: `Rep. ${r}x`, onRemove: () => update("repeticoes", filters.repeticoes.filter((x) => x !== r)) }));
  filters.statusResponsavel.forEach((s) => {
    const opt = statusOptions.find((o) => o.value === s);
    chips.push({ key: `srs-${s}`, label: `Feito: ${opt?.label || s}`, onRemove: () => update("statusResponsavel", filters.statusResponsavel.filter((x) => x !== s)) });
  });
  filters.statusGestor.forEach((s) => {
    const opt = statusOptions.find((o) => o.value === s);
    chips.push({ key: `sgs-${s}`, label: `Aprovado: ${opt?.label || s}`, onRemove: () => update("statusGestor", filters.statusGestor.filter((x) => x !== s)) });
  });
  if (filters.urgente) chips.push({ key: "urg", label: "Urgente", tone: "destructive", onRemove: () => update("urgente", false) });
  if (filters.prioridade) chips.push({ key: "pri", label: "Prioridade", tone: "warning", onRemove: () => update("prioridade", false) });
  if (filters.busca) chips.push({ key: "busca", label: `“${filters.busca}”`, onRemove: () => update("busca", "") });

  const advancedActiveCount =
    filters.semanas.length +
    filters.repeticoes.length +
    filters.statusResponsavel.length +
    filters.statusGestor.length +
    (filters.urgente ? 1 : 0) +
    (filters.prioridade ? 1 : 0);

  return (
    <div className="bg-card border rounded-xl p-2.5 mb-3 shadow-xs">
      {/* Compact essentials row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            value={filters.busca}
            onChange={(e) => update("busca", e.target.value)}
            className="h-9 pl-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <CompactDropdown label="" options={meses} selected={filters.meses} onChange={(v) => update("meses", v)} placeholder="Mês" />
          <CompactDropdown label="" options={anos} selected={filters.anos} onChange={(v) => update("anos", v)} placeholder="Ano" />
          {showResponsavelFilter && (
            <CompactDropdown label="" options={responsavelOptions} selected={filters.responsaveis} onChange={(v) => update("responsaveis", v)} placeholder="Responsável" />
          )}
          <CompactDropdown label="" options={setorOptions} selected={filters.setores} onChange={(v) => update("setores", v)} placeholder="Setor" />
        </div>

        {/* Toggles: Urgente / Prioridade as pill toggles */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => update("urgente", !filters.urgente)}
            className={cn(
              "inline-flex items-center gap-1 h-9 px-2.5 rounded-md border text-xs font-medium transition-colors",
              filters.urgente
                ? "bg-destructive/10 border-destructive/40 text-destructive"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="h-3.5 w-3.5" /> Urgente
          </button>
          <button
            type="button"
            onClick={() => update("prioridade", !filters.prioridade)}
            className={cn(
              "inline-flex items-center gap-1 h-9 px-2.5 rounded-md border text-xs font-medium transition-colors",
              filters.prioridade
                ? "bg-warning/10 border-warning/40 text-warning"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className="h-3.5 w-3.5" /> Prioridade
          </button>
        </div>

        {/* More filters drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {advancedActiveCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                  {advancedActiveCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[340px] sm:w-[380px]">
            <SheetHeader>
              <SheetTitle>Filtros avançados</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Semana</Label>
                <CompactDropdown label="" options={semanaOptions} selected={filters.semanas} onChange={(v) => update("semanas", v)} placeholder="Todas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Repetições</Label>
                <CompactDropdown label="" options={repeticaoOptions} selected={filters.repeticoes} onChange={(v) => update("repeticoes", v)} placeholder="Todas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status Feito</Label>
                <CompactDropdown label="" options={statusOptions} selected={filters.statusResponsavel} onChange={(v) => update("statusResponsavel", v)} placeholder="Todos" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status Aprovado</Label>
                <CompactDropdown label="" options={filters.statusGestor ? statusOptions : statusOptions} selected={filters.statusGestor} onChange={(v) => update("statusGestor", v)} placeholder="Todos" />
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-destructive" onClick={onClearFilters}>
                  <X className="h-3.5 w-3.5" /> Limpar todos os filtros
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-destructive gap-1 ml-auto"
            onClick={onClearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/60">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.onRemove}
              className={cn(
                "group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                c.tone === "destructive" && "bg-destructive/10 border-destructive/30 text-destructive",
                c.tone === "warning" && "bg-warning/10 border-warning/30 text-warning",
                !c.tone && "bg-muted border-border text-foreground hover:bg-muted/70"
              )}
            >
              {c.label}
              <X className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
