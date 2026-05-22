import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Clock3,
  Search,
  SlidersHorizontal,
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
  { value: "1", label: "1a Semana" },
  { value: "2", label: "2a Semana" },
  { value: "3", label: "3a Semana" },
  { value: "4", label: "4a Semana" },
  { value: "5", label: "5a Semana" },
];

const repeticaoOptions = [
  { value: "1", label: "1X" },
  { value: "2", label: "2X" },
  { value: "3", label: "3X" },
  { value: "4", label: "4X" },
  { value: "5", label: "5X" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, index) => ({
  value: String(currentYear - 2 + index),
  label: String(currentYear - 2 + index),
}));

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
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
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
    filters.repeticoes.length > 0 ||
    filters.busca !== "" ||
    filters.urgente ||
    filters.prioridade;

  const advancedActiveCount =
    filters.setores.length +
    filters.anos.length +
    filters.repeticoes.length +
    (filters.urgente ? 1 : 0) +
    (filters.prioridade ? 1 : 0);

  const responsavelOptions = profiles.map((profile) => ({
    value: profile.user_id,
    label: profile.nome,
  }));

  const setorOptions = setores.map((setor) => ({
    value: setor.id,
    label: setor.nome,
  }));

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

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-2.5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            value={filters.busca}
            onChange={(event) => update("busca", event.target.value)}
            className="h-8 rounded-full pl-9 text-sm"
          />
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1.5 pr-1">
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

              {showResponsavelFilter && (
                <div>
                  <SectionTitle>Responsaveis</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {responsavelOptions.map((option) => (
                      <FilterPill
                        key={option.value}
                        active={filters.responsaveis.includes(option.value)}
                        tone="blue"
                        onClick={() => toggleValue("responsaveis", option.value)}
                      >
                        {option.label.split(" ")[0]}
                      </FilterPill>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <SectionTitle>Setores</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {setorOptions.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={filters.setores.includes(option.value)}
                      tone="green"
                      onClick={() => toggleValue("setores", option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle>Repeticoes</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {repeticaoOptions.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={filters.repeticoes.includes(option.value)}
                      tone="amber"
                      onClick={() => toggleValue("repeticoes", option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle>Bandeiras</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    active={filters.urgente}
                    tone="red"
                    onClick={() => update("urgente", !filters.urgente)}
                  >
                    Urgente
                  </FilterPill>
                  <FilterPill
                    active={filters.prioridade}
                    tone="amber"
                    onClick={() => update("prioridade", !filters.prioridade)}
                  >
                    Prioridade
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

      <div className="mt-2 border-t border-border/50 pt-2">
        <div>
          <SectionTitle>Visoes rapidas</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
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
                Foco APT: {suggestedWeek}a semana
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

        <div
          className={cn(
            "mt-2.5 grid gap-2.5",
            showResponsavelFilter
              ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)]"
              : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          )}
        >
          {showResponsavelFilter && (
            <div className="min-w-0">
              <SectionTitle>Responsaveis</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {responsavelOptions.map((option) => (
                  <FilterPill
                    key={option.value}
                    active={filters.responsaveis.includes(option.value)}
                    tone="blue"
                    onClick={() => toggleValue("responsaveis", option.value)}
                  >
                    {option.label.split(" ")[0]}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}

          <div className="min-w-0">
            <SectionTitle>Semanas</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {semanaOptions.map((option) => (
                <FilterPill
                  key={option.value}
                  active={filters.semanas.includes(option.value)}
                  tone="green"
                  onClick={() => toggleValue("semanas", option.value)}
                >
                  {option.label}
                </FilterPill>
              ))}
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
    </div>
  );
}
