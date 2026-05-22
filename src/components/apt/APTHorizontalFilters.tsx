import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flame,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
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
  currentWeek: number;
  suggestedWeek?: number | null;
  currentUserId?: string | null;
}

type ArrayFilterKey =
  | "responsaveis"
  | "setores"
  | "meses"
  | "anos"
  | "semanas"
  | "statusResponsavel"
  | "statusGestor"
  | "repeticoes";

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

const semanaOptions = [
  { value: "1", label: "1ª", tone: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100", activeTone: "border-emerald-500 bg-emerald-500 text-white shadow-sm" },
  { value: "2", label: "2ª", tone: "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100", activeTone: "border-sky-500 bg-sky-500 text-white shadow-sm" },
  { value: "3", label: "3ª", tone: "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100", activeTone: "border-amber-500 bg-amber-500 text-white shadow-sm" },
  { value: "4", label: "4ª", tone: "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100", activeTone: "border-violet-500 bg-violet-500 text-white shadow-sm" },
  { value: "5", label: "5ª", tone: "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100", activeTone: "border-rose-500 bg-rose-500 text-white shadow-sm" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, index) => ({
  value: String(currentYear - 2 + index),
  label: String(currentYear - 2 + index),
}));

const collaboratorStyles = [
  {
    active: "border-sky-500 bg-sky-500 text-white shadow-sm",
    idle: "border-sky-200 bg-sky-50/80 text-sky-900 hover:bg-sky-100",
  },
  {
    active: "border-emerald-500 bg-emerald-500 text-white shadow-sm",
    idle: "border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100",
  },
  {
    active: "border-fuchsia-500 bg-fuchsia-500 text-white shadow-sm",
    idle: "border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-900 hover:bg-fuchsia-100",
  },
  {
    active: "border-orange-500 bg-orange-500 text-white shadow-sm",
    idle: "border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100",
  },
  {
    active: "border-violet-500 bg-violet-500 text-white shadow-sm",
    idle: "border-violet-200 bg-violet-50/80 text-violet-900 hover:bg-violet-100",
  },
  {
    active: "border-cyan-500 bg-cyan-500 text-white shadow-sm",
    idle: "border-cyan-200 bg-cyan-50/80 text-cyan-900 hover:bg-cyan-100",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/85">
      {children}
    </div>
  );
}

function FilterPill({
  active,
  children,
  onClick,
  tone = "neutral",
  icon,
  className,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
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

export default function APTHorizontalFilters({
  profiles,
  setores,
  filters,
  onFiltersChange,
  onClearFilters,
  showResponsavelFilter = true,
  currentWeek,
  suggestedWeek = null,
  currentUserId = null,
}: APTHorizontalFiltersProps) {
  const [setorSearch, setSetorSearch] = useState("");

  const update = <K extends keyof MultiFilters>(key: K, value: MultiFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const updateMany = (patch: Partial<MultiFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const toggleValue = (key: ArrayFilterKey, value: string) => {
    const current = filters[key];
    update(
      key,
      (current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]) as MultiFilters[ArrayFilterKey]
    );
  };

  const setExclusive = (key: ArrayFilterKey, values: string[]) => {
    const current = filters[key];
    const same =
      current.length === values.length &&
      [...current].sort().join("|") === [...values].sort().join("|");

    update(key, (same ? [] : values) as MultiFilters[ArrayFilterKey]);
  };

  const hasActiveFilters =
    filters.responsaveis.length > 0 ||
    filters.setores.length > 0 ||
    filters.meses.length > 0 ||
    filters.anos.length > 0 ||
    filters.semanas.length > 0 ||
    filters.statusResponsavel.length > 0 ||
    filters.statusGestor.length > 0 ||
    filters.busca !== "" ||
    filters.urgente ||
    filters.prioridade;

  const isMyQueueActive =
    !!currentUserId &&
    filters.responsaveis.length === 1 &&
    filters.responsaveis[0] === currentUserId;
  const isCurrentWeekActive =
    filters.semanas.length === 1 &&
    filters.semanas[0] === String(currentWeek);
  const isSuggestedWeekActive =
    suggestedWeek !== null &&
    filters.semanas.length === 1 &&
    filters.semanas[0] === String(suggestedWeek);
  const isPendingOnlyActive =
    filters.statusResponsavel.length === 1 &&
    filters.statusResponsavel[0] === "pendente" &&
    filters.statusGestor.length === 0;
  const isWaitingApprovalActive =
    filters.statusGestor.length === 1 &&
    filters.statusGestor[0] === "pendente" &&
    filters.statusResponsavel.length === 2 &&
    filters.statusResponsavel.includes("executado") &&
    filters.statusResponsavel.includes("nao_realizado");

  const responsavelOptions = profiles.map((profile, index) => ({
    value: profile.user_id,
    label: profile.nome,
    style: collaboratorStyles[index % collaboratorStyles.length],
  }));

  const filteredSetores = useMemo(() => {
    const query = setorSearch.trim().toLowerCase();
    if (!query) return setores;
    return setores.filter((setor) => setor.nome.toLowerCase().includes(query));
  }, [setorSearch, setores]);

  const setorSummary =
    filters.setores.length === 0
      ? "Setores"
      : filters.setores.length === 1
        ? setores.find((setor) => setor.id === filters.setores[0])?.nome ?? "1 setor"
        : `${filters.setores.length} setores`;

  const advancedActiveCount = filters.anos.length;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-2.5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] max-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            value={filters.busca}
            onChange={(event) => update("busca", event.target.value)}
            className="h-8 rounded-full pl-9 text-sm"
          />
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 pr-1">
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-1.5 py-1">
            {meses.map((mes) => (
              <FilterPill
                key={mes.value}
                active={filters.meses.includes(mes.value)}
                tone="green"
                onClick={() => setExclusive("meses", [mes.value])}
              >
                {mes.label}
              </FilterPill>
            ))}
            </div>

            <div className="h-7 w-px shrink-0 bg-border/70" />

            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-1.5 py-1">
            <FilterPill
              active={filters.urgente}
              tone="red"
              icon={<Flame className={cn("h-3 w-3", filters.urgente && "fill-current")} />}
              onClick={() => update("urgente", !filters.urgente)}
            >
              Urgente
            </FilterPill>

            <FilterPill
              active={filters.prioridade}
              tone="amber"
              icon={<Star className={cn("h-3 w-3", filters.prioridade && "fill-current")} />}
              onClick={() => update("prioridade", !filters.prioridade)}
            >
              Prioridade
            </FilterPill>
            </div>

            <div className="h-7 w-px shrink-0 bg-border/70" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3">
                  {setorSummary}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px] p-0">
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
                        const active = filters.setores.includes(setor.id);
                        return (
                          <button
                            key={setor.id}
                            type="button"
                            onClick={() => toggleValue("setores", setor.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <span className="truncate">{setor.nome}</span>
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
        </div>

        <Sheet>
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

          <SheetContent side="right" className="w-[360px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Filtros avancados</SheetTitle>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <div>
                <SectionTitle>Ano</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {anos.map((ano) => (
                    <FilterPill
                      key={ano.value}
                      active={filters.anos.includes(ano.value)}
                      tone="neutral"
                      onClick={() => toggleValue("anos", ano.value)}
                    >
                      {ano.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle>Visoes rapidas</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {currentUserId && (
                    <FilterPill
                      active={isMyQueueActive}
                      tone="blue"
                      icon={<UserRound className="h-3.5 w-3.5" />}
                      onClick={() => setExclusive("responsaveis", [currentUserId])}
                    >
                      Minha fila
                    </FilterPill>
                  )}
                  <FilterPill
                    active={isCurrentWeekActive}
                    tone="green"
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    onClick={() => setExclusive("semanas", [String(currentWeek)])}
                  >
                    Semana atual
                  </FilterPill>
                  {suggestedWeek !== null && (
                    <FilterPill
                      active={isSuggestedWeekActive}
                      tone="amber"
                      icon={<Clock3 className="h-3.5 w-3.5" />}
                      onClick={() => setExclusive("semanas", [String(suggestedWeek)])}
                    >
                      Foco APT
                    </FilterPill>
                  )}
                  <FilterPill
                    active={isPendingOnlyActive}
                    tone="amber"
                    onClick={() => setExclusive("statusResponsavel", ["pendente"])}
                  >
                    Pendentes
                  </FilterPill>
                  <FilterPill
                    active={isWaitingApprovalActive}
                    tone="green"
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() =>
                      updateMany({
                        statusResponsavel:
                          isWaitingApprovalActive ? [] : ["executado", "nao_realizado"],
                        statusGestor: isWaitingApprovalActive ? [] : ["pendente"],
                      })
                    }
                  >
                    Aguardando aprovacao
                  </FilterPill>
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive"
                  onClick={onClearFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar todos os filtros
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-2 text-muted-foreground hover:text-destructive"
            onClick={onClearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      <div
        className={cn(
          "mt-2 grid gap-2.5 border-t border-border/50 pt-2",
          showResponsavelFilter
            ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        )}
      >
        {showResponsavelFilter && (
          <div className="min-w-0">
            <SectionTitle>Colaboradores</SectionTitle>
            <div className="grid grid-cols-4 gap-1.5 xl:grid-cols-5">
              {responsavelOptions.map((option) => {
                const active = filters.responsaveis.includes(option.value);
                return (
                  <FilterPill
                    key={option.value}
                    active={active}
                    tone="neutral"
                    className={cn(
                      "w-full justify-center px-2",
                      active ? option.style.active : option.style.idle
                    )}
                    onClick={() => toggleValue("responsaveis", option.value)}
                  >
                    {option.label.split(" ")[0]}
                  </FilterPill>
                );
              })}
            </div>
          </div>
        )}

        <div className="min-w-0">
          <SectionTitle>Semanas</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {semanaOptions.map((option) => {
              const active = filters.semanas.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue("semanas", option.value)}
                  className={cn(
                    "inline-flex h-7 min-w-[64px] items-center justify-center rounded-full border px-2.5 text-[12px] font-medium transition-colors",
                    active ? option.activeTone : option.tone
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <SectionTitle>Status</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={
                filters.statusResponsavel.length === 1 &&
                filters.statusResponsavel[0] === "pendente"
              }
              tone="amber"
              onClick={() => setExclusive("statusResponsavel", ["pendente"])}
            >
              Pendentes
            </FilterPill>
            <FilterPill
              active={
                filters.statusResponsavel.length === 1 &&
                filters.statusResponsavel[0] === "executado"
              }
              tone="green"
              onClick={() => setExclusive("statusResponsavel", ["executado"])}
            >
              Feitas
            </FilterPill>
            <FilterPill
              active={
                filters.statusResponsavel.length === 1 &&
                filters.statusResponsavel[0] === "nao_realizado"
              }
              tone="red"
              onClick={() => setExclusive("statusResponsavel", ["nao_realizado"])}
            >
              Nao feitas
            </FilterPill>
            {showResponsavelFilter && (
              <>
                <FilterPill
                  active={
                    filters.statusGestor.length === 1 &&
                    filters.statusGestor[0] === "executado"
                  }
                  tone="blue"
                  onClick={() => setExclusive("statusGestor", ["executado"])}
                >
                  Aprovadas
                </FilterPill>
                <FilterPill
                  active={
                    filters.statusGestor.length === 1 &&
                    filters.statusGestor[0] === "pendente"
                  }
                  tone="amber"
                  onClick={() => setExclusive("statusGestor", ["pendente"])}
                >
                  Aguardando gestor
                </FilterPill>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
