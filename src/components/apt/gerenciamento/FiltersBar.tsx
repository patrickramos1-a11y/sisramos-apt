import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X, Flame, Star, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListaFilters {
  busca: string;
  meses: string[];
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
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  filters: ListaFilters;
  onChange: (next: ListaFilters) => void;
  profileOptions: { value: string; label: string }[];
  setorOptions: { value: string; label: string }[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/85">
      {children}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  tone = "neutral",
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
  icon?: React.ReactNode;
}) {
  const tones = {
    neutral: active
      ? "border-foreground bg-foreground text-background shadow-sm"
      : "border-border/70 bg-background text-muted-foreground hover:bg-muted/70 hover:text-foreground",
    blue: active
      ? "border-sky-500 bg-sky-500 text-white shadow-sm"
      : "border-sky-200 bg-sky-50/70 text-sky-900 hover:bg-sky-100",
    green: active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
    amber: active
      ? "border-amber-500 bg-amber-500 text-white shadow-sm"
      : "border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100",
    red: active
      ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
      : "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
        tones[tone]
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export default function FiltersBar({ filters, onChange, profileOptions, setorOptions }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const update = (patch: Partial<ListaFilters>) => onChange({ ...filters, ...patch });

  const toggleMes = (mes: string) => {
    if (filters.todosOsMeses) {
      update({ todosOsMeses: false, meses: [mes] });
      return;
    }

    update({
      meses: filters.meses.includes(mes)
        ? filters.meses.filter((value) => value !== mes)
        : [...filters.meses, mes],
    });
  };

  const toggleSemana = (semana: string) =>
    update({
      semanas: filters.semanas.includes(semana)
        ? filters.semanas.filter((value) => value !== semana)
        : [...filters.semanas, semana],
    });

  const toggleCollection = (
    key: "responsaveis" | "setores" | "repeticoes",
    value: string
  ) =>
    update({
      [key]: filters[key].includes(value)
        ? filters[key].filter((item) => item !== value)
        : [...filters[key], value],
    } as Partial<ListaFilters>);

  const removeChip = (kind: "responsavel" | "setor" | "rep", value: string) => {
    if (kind === "responsavel") {
      update({ responsaveis: filters.responsaveis.filter((item) => item !== value) });
    }
    if (kind === "setor") {
      update({ setores: filters.setores.filter((item) => item !== value) });
    }
    if (kind === "rep") {
      update({ repeticoes: filters.repeticoes.filter((item) => item !== value) });
    }
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

  const advancedActiveCount =
    filters.responsaveis.length +
    filters.setores.length +
    filters.repeticoes.length +
    filters.semanas.length +
    (filters.urgente ? 1 : 0) +
    (filters.prioridade ? 1 : 0);

  return (
    <div className="space-y-2.5 rounded-xl border bg-card p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] max-w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            value={filters.busca}
            onChange={(event) => update({ busca: event.target.value })}
            className="h-8 rounded-full pl-9 text-sm"
          />
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1.5 pr-1">
            {MESES_SHORT.map((label, index) => {
              const value = String(index + 1);
              const active = !filters.todosOsMeses && filters.meses.includes(value);

              return (
                <FilterPill
                  key={value}
                  active={active}
                  tone="green"
                  onClick={() => toggleMes(value)}
                >
                  {label}
                </FilterPill>
              );
            })}

            <FilterPill
              active={filters.todosOsMeses}
              tone="neutral"
              icon={<CalendarRange className="h-3 w-3" />}
              onClick={() =>
                update({
                  todosOsMeses: !filters.todosOsMeses,
                  meses: filters.todosOsMeses ? [String(new Date().getMonth() + 1)] : [],
                })
              }
            >
              Todos
            </FilterPill>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <FilterPill
            active={filters.urgente}
            tone="red"
            icon={<Flame className={cn("h-3 w-3", filters.urgente && "fill-current")} />}
            onClick={() => update({ urgente: !filters.urgente })}
          >
            Urgente
          </FilterPill>

          <FilterPill
            active={filters.prioridade}
            tone="amber"
            icon={<Star className={cn("h-3 w-3", filters.prioridade && "fill-current")} />}
            onClick={() => update({ prioridade: !filters.prioridade })}
          >
            Prioridade
          </FilterPill>

          <FilterPill
            active={filters.pendenteAprovacao}
            tone="blue"
            onClick={() => update({ pendenteAprovacao: !filters.pendenteAprovacao })}
          >
            Aguardando aprovacao
          </FilterPill>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full px-3">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Mais filtros
                {advancedActiveCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {advancedActiveCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent className="w-[360px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filtros avancados</SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <div>
                  <SectionTitle>Responsaveis</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {profileOptions.map((option) => (
                      <FilterPill
                        key={option.value}
                        active={filters.responsaveis.includes(option.value)}
                        tone="blue"
                        onClick={() => toggleCollection("responsaveis", option.value)}
                      >
                        {option.label.split(" ")[0]}
                      </FilterPill>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle>Setores</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {setorOptions.map((option) => (
                      <FilterPill
                        key={option.value}
                        active={filters.setores.includes(option.value)}
                        tone="green"
                        onClick={() => toggleCollection("setores", option.value)}
                      >
                        {option.label}
                      </FilterPill>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle>Repeticoes</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((repeticao) => {
                      const value = String(repeticao);
                      return (
                        <FilterPill
                          key={value}
                          active={filters.repeticoes.includes(value)}
                          tone="amber"
                          onClick={() => toggleCollection("repeticoes", value)}
                        >
                          {repeticao}X
                        </FilterPill>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <SectionTitle>Semanas</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((semana) => {
                      const value = String(semana);
                      return (
                        <FilterPill
                          key={value}
                          active={filters.semanas.includes(value)}
                          tone="green"
                          onClick={() => toggleSemana(value)}
                        >
                          {semana}
                        </FilterPill>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <SectionTitle>Bandeiras</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill
                      active={filters.urgente}
                      tone="red"
                      icon={<Flame className={cn("h-3 w-3", filters.urgente && "fill-current")} />}
                      onClick={() => update({ urgente: !filters.urgente })}
                    >
                      Urgente
                    </FilterPill>
                    <FilterPill
                      active={filters.prioridade}
                      tone="amber"
                      icon={<Star className={cn("h-3 w-3", filters.prioridade && "fill-current")} />}
                      onClick={() => update({ prioridade: !filters.prioridade })}
                    >
                      Prioridade
                    </FilterPill>
                  </div>
                </div>

                {hasChips && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive"
                    onClick={clearAll}
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {hasChips && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-1">
          {filters.semanas.map((semana) => (
            <Chip key={`s${semana}`} onRemove={() => toggleSemana(semana)}>
              Semana {semana}
            </Chip>
          ))}

          {filters.responsaveis.map((id) => {
            const option = profileOptions.find((item) => item.value === id);
            return (
              <Chip key={`r${id}`} onRemove={() => removeChip("responsavel", id)}>
                {option?.label ?? id}
              </Chip>
            );
          })}

          {filters.setores.map((id) => {
            const option = setorOptions.find((item) => item.value === id);
            return (
              <Chip key={`st${id}`} onRemove={() => removeChip("setor", id)}>
                {option?.label ?? id}
              </Chip>
            );
          })}

          {filters.repeticoes.map((repeticao) => (
            <Chip key={`rep${repeticao}`} onRemove={() => removeChip("rep", repeticao)}>
              {repeticao}X
            </Chip>
          ))}

          {filters.urgente && <Chip onRemove={() => update({ urgente: false })}>Urgente</Chip>}
          {filters.prioridade && (
            <Chip onRemove={() => update({ prioridade: false })}>Prioridade</Chip>
          )}
          {filters.pendenteAprovacao && (
            <Chip onRemove={() => update({ pendenteAprovacao: false })}>
              Aguardando aprovacao
            </Chip>
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
      className="h-6 gap-1 bg-muted pl-2 pr-1 text-[11px] font-medium hover:bg-muted/80"
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
