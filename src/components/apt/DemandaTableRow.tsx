import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBolinha from "./StatusBolinha";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface DemandaTableRowProps {
  id: string;
  numero: number;
  setor: string;
  setorCor: string;
  responsavel: string;
  descricao: string;
  statusResponsavel: StatusBolinha;
  statusGestor: StatusBolinha;
  semanasRepeticao: number;
  semanaLimite: number[];
  prioritaria: boolean;
  canEditResponsavel: boolean;
  canEditGestor: boolean;
  canEditDemanda?: boolean;
  showGestorColumn?: boolean;
  isAlternateRow?: boolean;
  isSelected?: boolean;
  showCheckbox?: boolean;
  onStatusResponsavelChange: () => void;
  onStatusGestorChange: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelectChange?: (checked: boolean) => void;
}

export default function DemandaTableRow({
  id,
  numero,
  setor,
  setorCor,
  responsavel,
  descricao,
  statusResponsavel,
  statusGestor,
  semanasRepeticao,
  semanaLimite,
  prioritaria,
  canEditResponsavel,
  canEditGestor,
  canEditDemanda,
  showGestorColumn = true,
  isAlternateRow,
  isSelected,
  showCheckbox,
  onStatusResponsavelChange,
  onStatusGestorChange,
  onClick,
  onEdit,
  onDelete,
  onSelectChange,
}: DemandaTableRowProps) {
  const semanaOrdenacao = semanaLimite?.length ? Math.min(...semanaLimite) : 0;

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors",
        prioritaria && "bg-[hsl(var(--apt-prioritaria))] hover:bg-[hsl(var(--apt-prioritaria))]/80",
        !prioritaria && isAlternateRow && "bg-[hsl(var(--apt-zebra))]",
        !prioritaria && !isAlternateRow && "bg-card",
        !prioritaria && "hover:bg-muted/70",
        isSelected && "ring-2 ring-inset ring-primary/50"
      )}
      onClick={onClick}
    >
      {showCheckbox && (
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange?.(checked as boolean)}
          />
        </TableCell>
      )}
      <TableCell className="font-mono text-center w-16">{numero}</TableCell>
      <TableCell className="w-24">
        <span
          className="inline-block px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: setorCor }}
        >
          {setor}
        </span>
      </TableCell>
      <TableCell className="w-32 truncate">{responsavel}</TableCell>
      <TableCell className="whitespace-normal break-words">{descricao}</TableCell>
      <TableCell className="text-center w-20" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <StatusBolinha
            status={statusResponsavel}
            onClick={onStatusResponsavelChange}
            disabled={!canEditResponsavel}
          />
        </div>
      </TableCell>
      {showGestorColumn && (
        <TableCell className="text-center w-20" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center">
            <StatusBolinha
              status={statusGestor}
              onClick={onStatusGestorChange}
              disabled={!canEditGestor}
            />
          </div>
        </TableCell>
      )}
      <TableCell className="text-center w-12">{semanasRepeticao}x</TableCell>
      <TableCell className="text-center w-20">{semanaOrdenacao}ª</TableCell>
      {canEditDemanda && (
        <TableCell className="text-center w-12" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}
