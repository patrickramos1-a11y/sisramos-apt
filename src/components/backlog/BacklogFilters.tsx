import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { 
  useBacklogProjetos, 
  CATEGORIAS_LABELS, 
  STATUS_LABELS, 
  PRIORIDADE_LABELS,
  BacklogCategoria,
  BacklogStatus,
  BacklogPrioridade
} from "@/hooks/useBacklog";

interface BacklogFiltersProps {
  filters: {
    projetoId?: string;
    categoria?: BacklogCategoria;
    status?: BacklogStatus;
    prioridade?: BacklogPrioridade;
    dependenteCreditos?: boolean;
    search?: string;
  };
  onFiltersChange: (filters: BacklogFiltersProps["filters"]) => void;
}

export default function BacklogFilters({ filters, onFiltersChange }: BacklogFiltersProps) {
  const { data: projetos } = useBacklogProjetos();

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
          <Select
            value={filters.projetoId || "all"}
            onValueChange={(v) => onFiltersChange({ ...filters, projetoId: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projetos?.map(projeto => (
                <SelectItem key={projeto.id} value={projeto.id}>{projeto.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoria */}
        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select
            value={filters.categoria || "all"}
            onValueChange={(v) => onFiltersChange({ ...filters, categoria: v === "all" ? undefined : v as BacklogCategoria })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.entries(CATEGORIAS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? undefined : v as BacklogStatus })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridade */}
        <div>
          <Label className="text-xs text-muted-foreground">Prioridade</Label>
          <Select
            value={filters.prioridade || "all"}
            onValueChange={(v) => onFiltersChange({ ...filters, prioridade: v === "all" ? undefined : v as BacklogPrioridade })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
