import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Clock3, Flame, RefreshCw, Search, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AptTag } from "@/lib/tags";

export interface ListaFilters {
  busca: string;
  meses: string[];
  semanas: string[];
  responsaveis: string[];
  setores: string[];
  repeticoes: string[];
  urgente: boolean;
  prioridade: boolean;
  persistente: boolean;
  prazo: boolean;
  pendenteAprovacao: boolean;
  todosOsMeses: boolean;
  tags: string[];
}

const MESES_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const MESES_FULL = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SEMANA_OPTIONS = [
  {
    value: "1",
    label: `1\u00AA`,
    tone: "border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100",
    activeTone: "border-emerald-500 bg-emerald-500 text-white shadow-sm",
  },
  {
    value: "2",
    label: `2\u00AA`,
    tone: "border-sky-200 bg-sky-50/80 text-sky-900 hover:bg-sky-100",
    activeTone: "border-sky-500 bg-sky-500 text-white shadow-sm",
  },
  {
    value: "3",
    label: `3\u00AA`,
    tone: "border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100",
    activeTone: "border-amber-500 bg-amber-500 text-white shadow-sm",
  },
  {
    value: "4",
    label: `4\u00AA`,
    tone: "border-violet-200 bg-violet-50/80 text-violet-900 hover:bg-violet-100",
    activeTone: "border-violet-500 bg-violet-500 text-white shadow-sm",
  },
  {
    value: "5",
    label: `5\u00AA`,
    tone: "border-rose-200 bg-rose-50/80 text-rose-900 hover:bg-rose-100",
    activeTone: "border-rose-500 bg-rose-500 text-white shadow-sm",
  },
];

interface Props {
  filters: ListaFilters;
  onChange: (next: ListaFilters) => void;
  profileOptions: { value: string; label: string }[];
  setorOptions: { value: string; label: string }[];
  tagOptions?: AptTag[];
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
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "orange" | "red";
  icon?: React.ReactNode;
  className?: string;
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
    orange: active
      ? "border-orange-500 bg-orange-500 text-white shadow-sm"
      : "border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100",
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
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export default function FiltersBar({ filters, onChange, profileOptions, setorOptions, tagOptions = [] }: Props) {
  const [setorSearch, setSetorSearch] = useState("");

  const update = (patch: Partial<ListaFilters>) => onChange({ ...filters, ...patch });

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
      persistente: false,
      prazo: false,
      pendenteAprovacao: false,
      todosOsMeses: false,
      tags: [],
    });

  const hasChips =
    filters.responsaveis.length > 0 ||
    filters.setores.length > 0 ||
    filters.repeticoes.length > 0 ||
    filters.urgente ||
    filters.prioridade ||
    filters.persistente ||
    filters.prazo ||
    filters.pendenteAprovacao ||
    filters.semanas.length > 0 ||
    filters.todosOsMeses ||
    filters.tags.length > 0;

  const filteredSetores = useMemo(() => {
    const query = setorSearch.trim().toLowerCase();
    if (!query) return setorOptions;
    return setorOptions.filter((setor) => setor.label.toLowerCase().includes(query));
  }, [setorOptions, setorSearch]);

  const setorSummary =
    filters.setores.length === 0
      ? "Setores"
      : filters.setores.length === 1
        ? setorOptions.find((setor) => setor.value === filters.setores[0])?.label ?? "1 setor"
        : `${filters.setores.length} setores`;

  const monthValue = filters.todosOsMeses ? "all" : filters.meses[0] ?? "";

  return (
    <div className="space-y-2.5 rounded-xl border bg-card p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] max-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            value={filters.busca}
            onChange={(event) => update({ busca: event.target.value })}
            className="h-8 rounded-full pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-2 py-1">
          <Select
            value={monthValue}
            onValueChange={(value) =>
              update(
                value === "all"
                  ? { todosOsMeses: true, meses: [] }
                  : { todosOsMeses: false, meses: [value] }
              )
            }
          >
            <SelectTrigger className="h-7 w-[110px] rounded-full border-border/60 bg-background px-3 text-[12px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {MESES_SHORT.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border/70" />

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
            active={filters.persistente}
            tone="orange"
            icon={<RefreshCw className={cn("h-3 w-3", filters.persistente && "stroke-[3]")} />}
            onClick={() => update({ persistente: !filters.persistente })}
          >
            Persistente
          </FilterPill>

          <FilterPill
            active={filters.prazo}
            tone="blue"
            icon={<Clock3 className={cn("h-3 w-3", filters.prazo && "stroke-[3]")} />}
            onClick={() => update({ prazo: !filters.prazo })}
          >
            Prazo
          </FilterPill>

          <FilterPill
            active={filters.pendenteAprovacao}
            tone="blue"
            onClick={() => update({ pendenteAprovacao: !filters.pendenteAprovacao })}
          >
            Aguardando aprovacao
          </FilterPill>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-8 rounded-full px-2 text-muted-foreground hover:text-destructive"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>

      <div className="grid gap-2.5 border-t border-border/50 pt-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SectionTitle>Responsaveis</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
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

        <div className="min-w-0">
          <SectionTitle>Setores</SectionTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between rounded-full px-3 text-sm"
              >
                <span className="truncate">{setorSummary}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] p-0">
              <div className="border-b border-border/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Setores
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar setor..."
                    value={setorSearch}
                    onChange={(event) => setSetorSearch(event.target.value)}
                    className="h-8 pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-2 pr-1">
                {filteredSetores.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground">
                    Nenhum setor encontrado
                  </div>
                ) : (
                  filteredSetores.map((setor) => {
                    const active = filters.setores.includes(setor.value);
                    return (
                      <button
                        key={setor.value}
                        type="button"
                        onClick={() => toggleCollection("setores", setor.value)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{setor.label}</span>
                        <span
                          className={cn(
                            "ml-3 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background"
                          )}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="min-w-0">
          <SectionTitle>Repeticoes</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
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

        <div className="min-w-0">
          <SectionTitle>Semanas</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {SEMANA_OPTIONS.map((option) => {
              const active = filters.semanas.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSemana(option.value)}
                  className={cn(
                    "inline-flex h-7 min-w-[42px] items-center justify-center rounded-full border px-2.5 text-[12px] font-medium transition-colors",
                    active ? option.activeTone : option.tone
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {tagOptions.length > 0 && (
          <div className="min-w-0 lg:col-span-2">
            <SectionTitle>Tags</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {tagOptions.map((tag) => {
                const active = filters.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      update({
                        tags: active
                          ? filters.tags.filter((id) => id !== tag.id)
                          : [...filters.tags, tag.id],
                      })
                    }
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-semibold transition-colors",
                      active ? "shadow-sm" : "opacity-80 hover:opacity-100"
                    )}
                    style={{
                      backgroundColor: active ? tag.cor : `${tag.cor}66`,
                      borderColor: tag.cor,
                    }}
                  >
                    #{tag.nome}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasChips && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-1">
          {filters.todosOsMeses && (
            <Chip
              onRemove={() =>
                update({
                  todosOsMeses: false,
                  meses: [String(new Date().getMonth() + 1)],
                })
              }
            >
              Todos os meses
            </Chip>
          )}

          {filters.semanas.map((semana) => (
            <Chip key={`s${semana}`} onRemove={() => toggleSemana(semana)}>
              {SEMANA_OPTIONS.find((option) => option.value === semana)?.label ?? semana}
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
          {filters.persistente && (
            <Chip onRemove={() => update({ persistente: false })}>Persistente</Chip>
          )}
          {filters.prazo && <Chip onRemove={() => update({ prazo: false })}>Prazo</Chip>}
          {filters.pendenteAprovacao && (
            <Chip onRemove={() => update({ pendenteAprovacao: false })}>
              Aguardando aprovacao
            </Chip>
          )}
          {filters.tags.map((id) => {
            const tag = tagOptions.find((item) => item.id === id);
            return (
              <Chip key={`tag${id}`} onRemove={() => update({ tags: filters.tags.filter((item) => item !== id) })}>
                #{tag?.nome ?? id}
              </Chip>
            );
          })}
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
