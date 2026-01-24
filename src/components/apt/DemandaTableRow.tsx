import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatusBolinha from "./StatusBolinha";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface DemandaTableRowProps {
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
  isAlternateRow?: boolean;
  onStatusResponsavelChange: () => void;
  onStatusGestorChange: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function DemandaTableRow({
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
  isAlternateRow,
  onStatusResponsavelChange,
  onStatusGestorChange,
  onClick,
  onEdit,
  onDelete,
}: DemandaTableRowProps) {
  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        prioritaria && "bg-[hsl(var(--apt-prioritaria))] hover:bg-[hsl(var(--apt-prioritaria))]/80",
        !prioritaria && isAlternateRow && "bg-muted/30",
        !prioritaria && !isAlternateRow && "bg-background",
        !prioritaria && "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
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
      <TableCell className="max-w-xs truncate">{descricao}</TableCell>
      <TableCell className="text-center w-20" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <StatusBolinha
            status={statusResponsavel}
            onClick={onStatusResponsavelChange}
            disabled={!canEditResponsavel}
          />
        </div>
      </TableCell>
      <TableCell className="text-center w-20" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <StatusBolinha
            status={statusGestor}
            onClick={onStatusGestorChange}
            disabled={!canEditGestor}
          />
        </div>
      </TableCell>
      <TableCell className="text-center w-12">{semanasRepeticao}</TableCell>
      <TableCell className="text-center w-20">{semanaLimite.map(s => `${s}ª`).join(", ")}</TableCell>
      {canEditDemanda && (
        <TableCell className="text-center w-20" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="Editar demanda"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Excluir demanda"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
