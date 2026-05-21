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
import { MoreVertical, Pencil, Trash2, Flame, Star, Repeat } from "lucide-react";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface DemandaTableRowProps {
  id: string;
  numero: number;
  setor: string;
  setorCor: string;
  responsavel: string;
  descricao: string;
  observacoes?: string | null;
  statusResponsavel: StatusBolinha;
  statusGestor: StatusBolinha;
  semanasRepeticao: number;
  semanaLimite: number[];
  prioritaria: boolean;
  muitoUrgente?: boolean;
  canEditResponsavel: boolean;
  canEditGestor: boolean;
  canEditDemanda?: boolean;
  showGestorColumn?: boolean;
  showResponsavelColumn?: boolean;
  showObservacoesColumn?: boolean;
  isAlternateRow?: boolean;
  isSelected?: boolean;
  showCheckbox?: boolean;
  pendingExclusao?: boolean;
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
  observacoes,
  statusResponsavel,
  statusGestor,
  semanasRepeticao,
  semanaLimite,
  prioritaria,
  muitoUrgente,
  canEditResponsavel,
  canEditGestor,
  canEditDemanda,
  showGestorColumn = true,
  showResponsavelColumn = true,
  showObservacoesColumn = true,
  isAlternateRow,
  isSelected,
  showCheckbox,
  pendingExclusao,
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
        "cursor-pointer transition-colors relative",
        // Subtle tint instead of full saturated row
        muitoUrgente && "bg-destructive/[0.04] hover:bg-destructive/[0.07]",
        prioritaria && !muitoUrgente && "bg-warning/[0.05] hover:bg-warning/[0.08]",
        !prioritaria && !muitoUrgente && isAlternateRow && "bg-[hsl(var(--apt-zebra))]",
        !prioritaria && !muitoUrgente && !isAlternateRow && "bg-card",
        !prioritaria && !muitoUrgente && "hover:bg-muted/60",
        isSelected && "ring-2 ring-inset ring-primary/50"
      )}
      onClick={onClick}
    >
      {showCheckbox && (
        <TableCell className="w-10 relative" onClick={(e) => e.stopPropagation()}>
          {(muitoUrgente || prioritaria) && (
            <span
              className={cn(
                "absolute left-0 top-0 bottom-0 w-[3px]",
                muitoUrgente ? "bg-destructive" : "bg-warning"
              )}
              aria-hidden
            />
          )}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange?.(checked as boolean)}
          />
        </TableCell>
      )}
      <TableCell className={cn("font-mono text-center w-16 relative", !showCheckbox && (muitoUrgente || prioritaria) && "pl-3")}>
        {!showCheckbox && (muitoUrgente || prioritaria) && (
          <span
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[3px]",
              muitoUrgente ? "bg-destructive" : "bg-warning"
            )}
            aria-hidden
          />
        )}
        {numero}
      </TableCell>
      <TableCell className="w-24">
        <span
          className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{ backgroundColor: setorCor }}
        >
          {setor}
        </span>
      </TableCell>
      <TableCell className="w-32 truncate">{responsavel}</TableCell>
      <TableCell className="whitespace-normal break-words">
        <div className="flex items-center gap-2 flex-wrap">
          {muitoUrgente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive border border-destructive/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
              <Flame className="h-2.5 w-2.5" /> Urgente
            </span>
          )}
          {prioritaria && !muitoUrgente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning border border-warning/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
              <Star className="h-2.5 w-2.5" /> Prioridade
            </span>
          )}
          <span>{descricao}</span>
          {pendingExclusao && (
            <span className="inline-flex items-center rounded-full bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
              Aguardando exclusão
            </span>
          )}
        </div>
      </TableCell>
      {showObservacoesColumn && (
        <TableCell className="whitespace-normal break-words text-sm text-muted-foreground w-48 align-top">
          {observacoes ? observacoes : <span className="text-muted-foreground/50">—</span>}
        </TableCell>
      )}
      {showResponsavelColumn && (
        <TableCell className="text-center w-20" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center">
            <StatusBolinha
              status={statusResponsavel}
              onClick={onStatusResponsavelChange}
              disabled={!canEditResponsavel}
            />
          </div>
        </TableCell>
      )}
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
      <TableCell className="text-center w-12">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Repeat className="h-3 w-3 opacity-60" />
          {semanasRepeticao}x
        </span>
      </TableCell>
      <TableCell className="text-center w-20">
        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs font-medium">
          {semanaOrdenacao}ª
        </span>
      </TableCell>
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
