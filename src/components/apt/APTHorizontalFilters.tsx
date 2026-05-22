import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
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
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "executado", label: "Executado" },
  { value: "nao_realizado", label: "Não realizado" },
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
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }

    onChange([...selected, value]);
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
      return;
    }

    onChange(options.map((option) => option.value));
  };

  const display =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ?? selected[0]
        : `${selected.length} selecionados`;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-full justify-between font-normal",
              selected.length > 0 && "border-primary/40 text-foreground"
            )}
          >
            <span className="truncate">{display}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[220px] p-2"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] font-medium text-primary"
            >
              {selected.length === options.length ? "Limpar" : "Todos"}
            </button>
          </div>
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Checkbox checked={selected.includes(option.value)} className="pointer-events-none h-3.5 w-3.5" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
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
    const normalizedCurrent = [...current].sort().join("|");
    const normalizedNext = [...values].sort().join("|");
    update(key, (normalizedCurrent === normalizedNext ? [] : values) as MultiFilters[ArrayFilterKey]);
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
    <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda, observação ou palavra-chave..."
            value={filters.busca}
            onChange={(event) => update("busca", event.target.value)}
            className="h-10 rounded-xl border-border/70 bg-background pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <CompactDropdown
            label="Mês"
            options={meses}
            selected={filters.meses}
            onChange={(value) => update("meses", value)}
            placeholder="Mês"
          />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-2 rounded-xl">
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
                <SheetTitle>Filtros avançados</SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <CompactDropdown
                  label="Ano"
                  options={anos}
                  selected={filters.anos}
                  onChange={(value) => update("anos", value)}
                  placeholder="Ano atual"
                />
                <CompactDropdown
                  label="Setor"
                  options={setorOptions}
                  selected={filters.setores}
                  onChange={(value) => update("setores", value)}
                  placeholder="Todos os setores"
                />
                <CompactDropdown
                  label="Repetições"
                  options={repeticaoOptions}
                  selected={filters.repeticoes}
                  onChange={(value) => update("repeticoes", value)}
                  placeholder="Todas"
                />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Bandeiras</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => update("urgente", !filters.urgente)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        filters.urgente
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Urgente
                    </button>
                    <button
                      type="button"
                      onClick={() => update("prioridade", !filters.prioridade)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        filters.prioridade
                          ? "border-warning/40 bg-warning/10 text-warning"
                          : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Prioridade
                    </button>
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
              className="h-10 gap-1.5 rounded-xl text-muted-foreground hover:text-destructive"
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Visões rápidas
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUserId && (
              <button
                type="button"
                onClick={() => setExclusive("responsaveis", [currentUserId])}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  isMyQueueActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <UserRound className="mr-1.5 inline h-3.5 w-3.5" />
                Minha fila
              </button>
            )}
            <button
              type="button"
              onClick={() => setExclusive("semanas", [String(currentWeek)])}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                isCurrentWeekActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />
              Semana atual
            </button>
            {suggestedWeek !== null && (
              <button
                type="button"
                onClick={() => setExclusive("semanas", [String(suggestedWeek)])}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  isSuggestedWeekActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                Foco APT: {suggestedWeek}ª semana
              </button>
            )}
            <button
              type="button"
              onClick={() => setExclusive("statusResponsavel", ["pendente"])}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                isPendingOnlyActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() =>
                updateMany({
                  statusResponsavel:
                    isWaitingApprovalActive ? [] : ["executado", "nao_realizado"],
                  statusGestor: isWaitingApprovalActive ? [] : ["pendente"],
                })
              }
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                isWaitingApprovalActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />
              Aguardando aprovação
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Responsáveis
          </div>
          {showResponsavelFilter ? (
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-2 pr-1">
                {responsavelOptions.map((option) => {
                  const firstName = option.label.split(" ")[0];
                  const active = filters.responsaveis.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleValue("responsaveis", option.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {firstName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              A lista já está focada no colaborador selecionado.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Semanas
          </div>
          <div className="flex flex-wrap gap-2">
            {semanaOptions.map((option) => {
              const active = filters.semanas.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue("semanas", option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExclusive("statusResponsavel", ["pendente"])}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filters.statusResponsavel.length === 1 && filters.statusResponsavel[0] === "pendente"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setExclusive("statusResponsavel", ["executado"])}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filters.statusResponsavel.length === 1 && filters.statusResponsavel[0] === "executado"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Feitas
            </button>
            <button
              type="button"
              onClick={() => setExclusive("statusResponsavel", ["nao_realizado"])}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filters.statusResponsavel.length === 1 && filters.statusResponsavel[0] === "nao_realizado"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Não feitas
            </button>
            {showResponsavelFilter && (
              <>
                <button
                  type="button"
                  onClick={() => setExclusive("statusGestor", ["executado"])}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    filters.statusGestor.length === 1 && filters.statusGestor[0] === "executado"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  Aprovadas
                </button>
                <button
                  type="button"
                  onClick={() => setExclusive("statusGestor", ["pendente"])}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    filters.statusGestor.length === 1 && filters.statusGestor[0] === "pendente"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  Aguardando gestor
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
