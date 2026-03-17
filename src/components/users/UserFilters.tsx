import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, X } from "lucide-react";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AppRole = "admin" | "gestor" | "colaborador";
type SortField = "nome" | "email" | "role";
type SortDirection = "asc" | "desc";

interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: AppRole[];
  onRoleFilterChange: (value: AppRole[]) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: () => void;
}

const roleOptions = [
  { value: "admin", label: "Administrador" },
  { value: "gestor", label: "Gestor" },
  { value: "colaborador", label: "Colaborador" },
];

export default function UserFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
}: UserFiltersProps) {
  const hasActiveFilters = searchTerm || roleFilter.length > 0;

  const clearFilters = () => {
    onSearchChange("");
    onRoleFilterChange([]);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Role Filter - Multi Select */}
      <div className="w-full sm:w-[200px]">
        <MultiSelectDropdown
          options={roleOptions}
          selected={roleFilter}
          onChange={(v) => onRoleFilterChange(v as AppRole[])}
          placeholder="Todos os perfis"
          searchable={false}
        />
      </div>

      {/* Sort Field */}
      <Select
        value={sortField}
        onValueChange={(value) => onSortFieldChange(value as SortField)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nome">Nome</SelectItem>
          <SelectItem value="email">E-mail</SelectItem>
          <SelectItem value="role">Perfil</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Direction Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={onSortDirectionChange}
        title={sortDirection === "asc" ? "Ordem crescente (A-Z)" : "Ordem decrescente (Z-A)"}
      >
        <ArrowUpDown className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFilters}
          title="Limpar filtros"
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
