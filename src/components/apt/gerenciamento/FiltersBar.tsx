import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Search, SlidersHorizontal, X, Flame, Star, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListaFilters {
  busca: string;
  meses: string[]; // empty = all
  semanas: string[];
  responsaveis: string[];
  setores: string[];
  repeticoes: string[];
  urgente: boolean;
  prioridade: boolean;
  pendenteAprovacao: boolean;
  todosOsMeses: boolean;
}

const MESES_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const MESES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  filters: ListaFilters;
  onChange: (next: ListaFilters) => void;
  profileOptions: { value: string; label: string }[];
  setorOptions: { value: string; label: string }[];
}

export default function FiltersBar({ filters, onChange, profileOptions, setorOptions }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const update = (patch: Partial<ListaFilters>) => onChange({ ...filters, ...patch });

  const toggleMes = (m: string) => {
    if (filters.todosOsMeses) {
      update({ todosOsMeses: false, meses: [m] });
      return;
    }
    update({
      meses: filters.meses.includes(m)
        ? filters.meses.filter((x) => x !== m)
        : [...filters.meses, m],
    });
  };

  const toggleSemana = (s: string) =>
    update({
      semanas: filters.semanas.includes(s)
        ? filters.semanas.filter((x) => x !== s)
        : [...filters.semanas, s],
    });

  const removeChip = (kind: "responsavel" | "setor" | "rep", value: string) => {
    if (kind === "responsavel") update({ responsaveis: filters.responsaveis.filter((v) => v !== value) });
    if (kind === "setor") update({ setores: filters.setores.filter((v) => v !== value) });
    if (kind === "rep") update({ repeticoes: filters.repeticoes.filter((v) => v !== value) });
  };

  const clearAll = () =>
    onChange({
      busca: "",
      meses: [String(new Date().getMonth() + 1)],
      semanas: [],
      responsaveis: [],
      setores: [],
      repeticoes: [],
      urgente: false,
      prioridade: false,
      pendenteAprovacao: false,
      todosOsMeses: false,
    });

  const hasChips =
    filters.responsaveis.length > 0 ||
    filters.setores.length > 0 ||
    filters.repeticoes.length > 0 ||
    filters.urgente ||
    filters.prioridade ||
    filters.pendenteAprovacao ||
    filters.semanas.length > 0;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      {/* Row 1: search + month pills + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            value={filters.busca}
            onChange={(e) => update({ busca: e.target.value })}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Mês</span>
          {MESES_SHORT.map((label, i) => {
            const v = String(i + 1);
            const active = !filters.todosOsMeses && filters.meses.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleMes(v)}
                className={cn(
                  "h-7 px-2 rounded-md text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border/70 text-foreground/70"
                )}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => update({ todosOsMeses: !filters.todosOsMeses, meses: filters.todosOsMeses ? [String(new Date().getMonth() + 1)] : [] })}
            className={cn(
              "h-7 px-2 rounded-md text-[11px] font-medium border inline-flex items-center gap-1 transition-colors",
              filters.todosOsMeses
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background hover:bg-muted border-border/70 text-foreground/70"
            )}
          >
            <CalendarRange className="h-3 w-3" /> Todos
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {(["urgente", "prioridade", "pendenteAprovacao"] as const).map((key) => {
            const cfg = {
              urgente: { icon: Flame, label: "Urgente", color: "text-destructive border-destructive/40 bg-destructive/10" },
              prioridade: { icon: Star, label: "Prioritária", color: "text-warning border-warning/40 bg-warning/10" },
              pendenteAprovacao: { icon: null, label: "Aguardando aprovação", color: "text-primary border-primary/40 bg-primary/10" },
            }[key];
            const Icon = cfg.icon;
            const active = filters[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => update({ [key]: !active } as Partial<ListaFilters>)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[11px] font-medium border inline-flex items-center gap-1 transition-colors",
                  active ? cfg.color : "bg-background hover:bg-muted border-border/70 text-muted-foreground"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {cfg.label}
              </button>
            );
          })}

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <SlidersHorizontal className="h-3 w-3" />
                Mais filtros
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[360px]">
              <SheetHeader>
                <SheetTitle>Filtros avançados</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Responsáveis</Label>
                  <MultiSelectDropdown
                    options={profileOptions}
                    selected={filters.responsaveis}
                    onChange={(v) => update({ responsaveis: v })}
                    placeholder="Todos"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Setores</Label>
                  <MultiSelectDropdown
                    options={setorOptions}
                    selected={filters.setores}
                    onChange={(v) => update({ setores: v })}
                    placeholder="Todos"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Repetições</Label>
                  <MultiSelectDropdown
                    options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}X` }))}
                    selected={filters.repeticoes}
                    onChange={(v) => update({ repeticoes: v })}
                    placeholder="Todas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Semanas</Label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const v = String(s);
                      const active = filters.semanas.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleSemana(v)}
                          className={cn(
                            "h-8 w-8 rounded-md text-xs font-semibold border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border/70"
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Row 2: active chips */}
      {hasChips && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
          {filters.semanas.map((s) => (
            <Chip key={`s${s}`} onRemove={() => toggleSemana(s)}>
              Semana {s}
            </Chip>
          ))}
          {filters.responsaveis.map((id) => {
            const opt = profileOptions.find((o) => o.value === id);
            return (
              <Chip key={`r${id}`} onRemove={() => removeChip("responsavel", id)}>
                {opt?.label ?? id}
              </Chip>
            );
          })}
          {filters.setores.map((id) => {
            const opt = setorOptions.find((o) => o.value === id);
            return (
              <Chip key={`st${id}`} onRemove={() => removeChip("setor", id)}>
                {opt?.label ?? id}
              </Chip>
            );
          })}
          {filters.repeticoes.map((r) => (
            <Chip key={`rep${r}`} onRemove={() => removeChip("rep", r)}>
              {r}X
            </Chip>
          ))}
          {filters.urgente && <Chip onRemove={() => update({ urgente: false })}>Urgente</Chip>}
          {filters.prioridade && <Chip onRemove={() => update({ prioridade: false })}>Prioritária</Chip>}
          {filters.pendenteAprovacao && (
            <Chip onRemove={() => update({ pendenteAprovacao: false })}>Aguardando aprovação</Chip>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
          >
            Limpar tudo
          </Button>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-muted hover:bg-muted/80"
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background"
        aria-label="Remover filtro"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export { MESES_FULL };