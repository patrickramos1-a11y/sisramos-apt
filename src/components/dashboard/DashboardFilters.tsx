import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardFilters as FiltersType, CrossFilter } from "@/hooks/useDashboardFilters";

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

export default function DashboardFilters({
  profiles,
  setores,
  filters,
  crossFilter,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: DashboardFiltersProps) {
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
      
      <div className="flex flex-wrap items-end gap-3">
        {/* Ano */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select value={filters.ano} onValueChange={(v) => onFilterChange("ano", v)}>
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {anos.map((ano) => (
                <SelectItem key={ano.value} value={ano.value}>
                  {ano.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mês */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Select value={filters.mes} onValueChange={(v) => onFilterChange("mes", v)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {meses.map((mes) => (
                <SelectItem key={mes.value} value={mes.value}>
                  {mes.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Semana */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Semana</Label>
          <Select value={filters.semana} onValueChange={(v) => onFilterChange("semana", v)}>
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {semanas.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Responsável</Label>
          <Select value={filters.responsavel} onValueChange={(v) => onFilterChange("responsavel", v)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Setor */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Setor</Label>
          <Select value={filters.setor} onValueChange={(v) => onFilterChange("setor", v)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {setores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Feito */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status Feito</Label>
          <Select value={filters.statusFeito} onValueChange={(v) => onFilterChange("statusFeito", v)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Aprovado */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status Aprovado</Label>
          <Select value={filters.statusAprovado} onValueChange={(v) => onFilterChange("statusAprovado", v)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Repetições */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Repetições</Label>
          <Select value={filters.repeticao} onValueChange={(v) => onFilterChange("repeticao", v)}>
            <SelectTrigger className="h-9 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {repeticaoOptions.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Urgente */}
        <Button
          variant={filters.urgente ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9",
            filters.urgente && "bg-destructive hover:bg-destructive/90"
          )}
          onClick={() => onFilterChange("urgente", !filters.urgente)}
        >
          Urgente
        </Button>

        {/* Prioridade */}
        <Button
          variant={filters.prioridade ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9",
            filters.prioridade && "bg-warning hover:bg-warning/90 text-warning-foreground"
          )}
          onClick={() => onFilterChange("prioridade", !filters.prioridade)}
        >
          Prioridade
        </Button>

        {/* Limpar */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-destructive hover:text-destructive gap-1"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
