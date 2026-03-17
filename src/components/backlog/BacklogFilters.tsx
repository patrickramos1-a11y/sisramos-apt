import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { 
  useBacklogProjetos, 
  CATEGORIAS_LABELS, 
  STATUS_LABELS, 
  PRIORIDADE_LABELS,
  BacklogCategoria,
  BacklogStatus,
  BacklogPrioridade,
} from "@/hooks/useBacklog";

export interface BacklogMultiFilters {
  projetoIds: string[];
  categorias: BacklogCategoria[];
  statuses: BacklogStatus[];
  prioridades: BacklogPrioridade[];
  dependenteCreditos?: boolean;
  search?: string;
}

interface BacklogFiltersProps {
  filters: BacklogMultiFilters;
  onFiltersChange: (filters: BacklogMultiFilters) => void;
}

export default function BacklogFilters({ filters, onFiltersChange }: BacklogFiltersProps) {
  const { data: projetos } = useBacklogProjetos();

  const projetoOptions = (projetos || []).map(p => ({ value: p.id, label: p.nome }));
  const categoriaOptions = Object.entries(CATEGORIAS_LABELS).map(([key, label]) => ({ value: key, label }));
  const statusOptions = Object.entries(STATUS_LABELS).map(([key, label]) => ({ value: key, label }));
  const prioridadeOptions = Object.entries(PRIORIDADE_LABELS).map(([key, label]) => ({ value: key, label }));

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Search */}
        <div className="xl:col-span-2">
          <Label htmlFor="search" className="text-xs text-muted-foreground">Buscar</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Título ou descrição..."
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Projeto */}
        <div>
          <Label className="text-xs text-muted-foreground">Projeto</Label>
          <div className="mt-1">
            <MultiSelectDropdown
              options={projetoOptions}
              selected={filters.projetoIds}
              onChange={(v) => onFiltersChange({ ...filters, projetoIds: v })}
              placeholder="Todos os projetos"
            />
          </div>
        </div>

        {/* Categoria */}
        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <div className="mt-1">
            <MultiSelectDropdown
              options={categoriaOptions}
              selected={filters.categorias}
              onChange={(v) => onFiltersChange({ ...filters, categorias: v as BacklogCategoria[] })}
              placeholder="Todas as categorias"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="mt-1">
            <MultiSelectDropdown
              options={statusOptions}
              selected={filters.statuses}
              onChange={(v) => onFiltersChange({ ...filters, statuses: v })}
              placeholder="Todos os status"
            />
          </div>
        </div>

        {/* Prioridade */}
        <div>
          <Label className="text-xs text-muted-foreground">Prioridade</Label>
          <div className="mt-1">
            <MultiSelectDropdown
              options={prioridadeOptions}
              selected={filters.prioridades}
              onChange={(v) => onFiltersChange({ ...filters, prioridades: v })}
              placeholder="Todas as prioridades"
            />
          </div>
        </div>
      </div>

      {/* Dependente de Créditos Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="dependente-creditos"
          checked={filters.dependenteCreditos === true}
          onCheckedChange={(checked) => 
            onFiltersChange({ ...filters, dependenteCreditos: checked ? true : undefined })
          }
        />
        <Label htmlFor="dependente-creditos" className="text-sm cursor-pointer">
          Apenas itens dependentes de créditos/recursos
        </Label>
      </div>
    </div>
  );
}
