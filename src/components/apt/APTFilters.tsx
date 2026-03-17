import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
import { Filter, X, ChevronDown, Search } from "lucide-react";
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

const repeticaoOptions = [
  { value: "1", label: "1X" },
  { value: "2", label: "2X" },
  { value: "3", label: "3X" },
  { value: "4", label: "4X" },
  { value: "5", label: "5X" },
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [filters.busca]);

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
    filters.busca !== "";

  const responsavelOptions = profiles.map((p) => ({
    value: p.user_id,
    label: p.nome,
  }));

  const setorOptions = setores.map((s) => ({
    value: s.id,
    label: s.nome,
  }));

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Buscar</Label>
        <Textarea
          ref={textareaRef}
          placeholder="Buscar por descrição..."
          value={filters.busca}
          onChange={(e) => updateFilter("busca", e.target.value)}
          className="min-h-[38px] resize-none overflow-hidden"
          rows={1}
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

      <MultiSelectDropdown
        label="Repetição (X)"
        options={repeticaoOptions}
        selected={filters.repeticoes}
        onChange={(v) => updateFilter("repeticoes", v)}
        placeholder="Todas"
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
        {content}
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
          <SheetContent side="right" className="w-80 flex flex-col">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 mt-6 -mx-6 px-6">
              <div className="pb-6">
                {content}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
