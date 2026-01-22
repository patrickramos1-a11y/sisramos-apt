import { TableCell, TableRow } from "@/components/ui/table";
import StatusBolinha from "./StatusBolinha";
import { cn } from "@/lib/utils";

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
  semanaLimite: number;
  prioritaria: boolean;
  canEditResponsavel: boolean;
  canEditGestor: boolean;
  onStatusResponsavelChange: () => void;
  onStatusGestorChange: () => void;
  onClick?: () => void;
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
  onStatusResponsavelChange,
  onStatusGestorChange,
  onClick,
}: DemandaTableRowProps) {
  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        prioritaria && "bg-[hsl(var(--apt-prioritaria))] hover:bg-[hsl(var(--apt-prioritaria))]/80"
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
      <TableCell className="text-center w-16">{semanaLimite}ª</TableCell>
    </TableRow>
  );
}
