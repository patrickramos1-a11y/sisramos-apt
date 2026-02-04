import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowUpDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  numero: SortDirection;
  setor: SortDirection;
  responsavel: SortDirection;
  descricao: SortDirection;
  semana: SortDirection;
}

interface DemandaSortHeaderProps {
  sortConfig: SortConfig;
  onSortChange: (field: keyof SortConfig) => void;
  onResetSort: () => void;
}

function SortButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-2 text-xs gap-1",
        direction && "bg-primary/10 text-primary"
      )}
      onClick={onClick}
    >
      {label}
      {direction === "asc" && <ArrowUp className="h-3 w-3" />}
      {direction === "desc" && <ArrowDown className="h-3 w-3" />}
      {!direction && <ArrowUpDown className="h-3 w-3 opacity-50" />}
    </Button>
  );
}

export default function DemandaSortHeader({
  sortConfig,
  onSortChange,
  onResetSort,
}: DemandaSortHeaderProps) {
  const hasAnySort = Object.values(sortConfig).some((v) => v !== null);

  return (
    <div className="flex items-center gap-2 flex-wrap mb-2 p-2 bg-muted/50 rounded-lg">
      <span className="text-xs text-muted-foreground font-medium">Ordenar por:</span>
      <SortButton
        label="Nº"
        direction={sortConfig.numero}
        onClick={() => onSortChange("numero")}
      />
      <SortButton
        label="Setor"
        direction={sortConfig.setor}
        onClick={() => onSortChange("setor")}
      />
      <SortButton
        label="Responsável"
        direction={sortConfig.responsavel}
        onClick={() => onSortChange("responsavel")}
      />
      <SortButton
        label="Descrição"
        direction={sortConfig.descricao}
        onClick={() => onSortChange("descricao")}
      />
      <SortButton
        label="Semana"
        direction={sortConfig.semana}
        onClick={() => onSortChange("semana")}
      />
      {hasAnySort && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
          onClick={onResetSort}
        >
          <RotateCcw className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
