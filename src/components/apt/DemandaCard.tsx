import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBolinha from "./StatusBolinha";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface DemandaCardProps {
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
  showGestorStatus?: boolean;
  onStatusResponsavelChange: () => void;
  onStatusGestorChange: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function DemandaCard({
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
  showGestorStatus = true,
  onStatusResponsavelChange,
  onStatusGestorChange,
  onEdit,
  onDelete,
}: DemandaCardProps) {
  const semanaOrdenacao = semanaLimite?.length ? Math.min(...semanaLimite) : 0;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        prioritaria && "bg-[hsl(var(--apt-prioritaria))]"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="font-mono">
                #{numero}
              </Badge>
              <Badge
                style={{ backgroundColor: setorCor }}
                className="text-foreground"
              >
                {setor}
              </Badge>
              {prioritaria && (
                <Badge variant="destructive" className="text-xs">
                  Prioritária
                </Badge>
              )}
            </div>

            <p className="text-sm font-medium mb-2 whitespace-normal break-words">{descricao}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Resp: {responsavel}</span>
              <span>Repetição: {semanasRepeticao}x</span>
              <span>{semanaOrdenacao}ª semana</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-center">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Feito?</p>
              <StatusBolinha
                status={statusResponsavel}
                onClick={onStatusResponsavelChange}
                disabled={!canEditResponsavel}
                size="lg"
              />
            </div>
            {showGestorStatus && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Aprovado?</p>
                <StatusBolinha
                  status={statusGestor}
                  onClick={onStatusGestorChange}
                  disabled={!canEditGestor}
                  size="lg"
                />
              </div>
            )}
          </div>
        </div>

        {canEditDemanda && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
              Excluir
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
