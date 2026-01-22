import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBolinha from "./StatusBolinha";
import { cn } from "@/lib/utils";

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
  semanaLimite: number;
  prioritaria: boolean;
  canEditResponsavel: boolean;
  canEditGestor: boolean;
  onStatusResponsavelChange: () => void;
  onStatusGestorChange: () => void;
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
  onStatusResponsavelChange,
  onStatusGestorChange,
}: DemandaCardProps) {
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

            <p className="text-sm font-medium mb-2 line-clamp-2">{descricao}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Resp: {responsavel}</span>
              <span>X: {semanasRepeticao}</span>
              <span>{semanaLimite}ª semana</span>
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
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Aprovado?</p>
              <StatusBolinha
                status={statusGestor}
                onClick={onStatusGestorChange}
                disabled={!canEditGestor}
                size="lg"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
