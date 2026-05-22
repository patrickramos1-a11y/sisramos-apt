import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBolinha from "./StatusBolinha";
import SwipeableCard from "./SwipeableCard";
import { cn } from "@/lib/utils";
import { User, RefreshCw, Calendar, Flame, Star } from "lucide-react";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface DemandaCardProps {
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
  showGestorStatus?: boolean;
  showObservacoes?: boolean;
  pendingExclusao?: boolean;
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
  showGestorStatus = true,
  showObservacoes = true,
  pendingExclusao,
  onStatusResponsavelChange,
  onStatusGestorChange,
  onEdit,
  onDelete,
}: DemandaCardProps) {
  const semanaOrdenacao = semanaLimite?.length ? Math.min(...semanaLimite) : 0;

  const cardContent = (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        muitoUrgente && "border-destructive/30",
        prioritaria && !muitoUrgente && "border-warning/30"
      )}
    >
      {(muitoUrgente || prioritaria) && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 left-0 top-0 w-1",
            muitoUrgente ? "bg-destructive" : "bg-warning"
          )}
        />
      )}

      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-2 py-0.5 font-mono text-xs">
              #{numero}
            </Badge>
            <Badge
              style={{ backgroundColor: setorCor }}
              className="px-2 py-0.5 text-xs text-foreground"
            >
              {setor}
            </Badge>
          </div>

          {canEditDemanda && (
            <span className="text-[10px] italic text-muted-foreground/60">deslize</span>
          )}
        </div>

        <div className="px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
              {muitoUrgente ? (
                <Flame className="h-3.5 w-3.5 fill-destructive text-destructive" />
              ) : prioritaria ? (
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              ) : null}
            </span>

            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium leading-snug break-words">{descricao}</p>
              {pendingExclusao && (
                <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                  Aguardando exclusao
                </span>
              )}
            </div>
          </div>
        </div>

        {showObservacoes && observacoes && (
          <div className="px-3 pb-2">
            <p className="break-words text-xs italic text-muted-foreground">
              <span className="font-semibold not-italic text-foreground/70">Obs: </span>
              {observacoes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 px-3 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium">{responsavel}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{semanasRepeticao}x</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{semanaOrdenacao}a sem.</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 border-t bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-muted-foreground">Feito?</span>
            <StatusBolinha
              status={statusResponsavel}
              onClick={onStatusResponsavelChange}
              disabled={!canEditResponsavel}
              size="md"
            />
          </div>
          {showGestorStatus && (
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-muted-foreground">Aprovado?</span>
              <StatusBolinha
                status={statusGestor}
                onClick={onStatusGestorChange}
                disabled={!canEditGestor}
                size="md"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (canEditDemanda) {
    return (
      <SwipeableCard onEdit={onEdit} onDelete={onDelete}>
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
}
