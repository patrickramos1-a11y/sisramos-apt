import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Filter, SlidersHorizontal } from "lucide-react";
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

  const selectTriggerClass = vertical ? "w-full h-11" : "";

  return (
    <div className={containerClass}>
      {/* Ano */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Ano</Label>
        <Select value={filters.ano} onValueChange={(v) => onFilterChange("ano", v)}>
          <SelectTrigger className={cn("h-9 w-[100px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {anos.map((ano) => (
              <SelectItem key={ano.value} value={ano.value}>{ano.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mês */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Mês</Label>
        <Select value={filters.mes} onValueChange={(v) => onFilterChange("mes", v)}>
          <SelectTrigger className={cn("h-9 w-[120px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {meses.map((mes) => (
              <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Semana */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Semana</Label>
        <Select value={filters.semana} onValueChange={(v) => onFilterChange("semana", v)}>
          <SelectTrigger className={cn("h-9 w-[110px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {semanas.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Responsável */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Responsável</Label>
        <Select value={filters.responsavel} onValueChange={(v) => onFilterChange("responsavel", v)}>
          <SelectTrigger className={cn("h-9 w-[140px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Setor */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Setor</Label>
        <Select value={filters.setor} onValueChange={(v) => onFilterChange("setor", v)}>
          <SelectTrigger className={cn("h-9 w-[140px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {setores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Feito */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Status Feito</Label>
        <Select value={filters.statusFeito} onValueChange={(v) => onFilterChange("statusFeito", v)}>
          <SelectTrigger className={cn("h-9 w-[120px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Aprovado */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Status Aprovado</Label>
        <Select value={filters.statusAprovado} onValueChange={(v) => onFilterChange("statusAprovado", v)}>
          <SelectTrigger className={cn("h-9 w-[120px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Repetições */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Repetições</Label>
        <Select value={filters.repeticao} onValueChange={(v) => onFilterChange("repeticao", v)}>
          <SelectTrigger className={cn("h-9 w-[90px]", selectTriggerClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {repeticaoOptions.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {/* Limpar */}
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

  // Mobile: Filter drawer
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-10">
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

  // Desktop: Horizontal inline
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
