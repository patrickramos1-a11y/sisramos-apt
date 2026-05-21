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
        "transition-all hover:shadow-md overflow-hidden relative",
        muitoUrgente && "border-destructive/30",
        prioritaria && !muitoUrgente && "border-warning/30"
      )}
    >
      {(muitoUrgente || prioritaria) && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            muitoUrgente ? "bg-destructive" : "bg-warning"
          )}
        />
      )}
      <CardContent className="p-0">
        {/* Header com número, setor e badges */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
              #{numero}
            </Badge>
            <Badge
              style={{ backgroundColor: setorCor }}
              className="text-foreground text-xs px-2 py-0.5"
            >
              {setor}
            </Badge>
            {muitoUrgente && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive border border-destructive/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                <Flame className="h-2.5 w-2.5" /> Urgente
              </span>
            )}
            {prioritaria && !muitoUrgente && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning border border-warning/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                <Star className="h-2.5 w-2.5" /> Prioridade
              </span>
            )}
          </div>
          
          {/* Indicador de swipe quando pode editar */}
          {canEditDemanda && (
            <span className="text-[10px] text-muted-foreground/60 italic">
              ← deslize
            </span>
          )}
        </div>

        {/* Descrição */}
        <div className="px-3 py-2">
          <p className="text-sm font-medium leading-snug whitespace-normal break-words">
            {descricao}
          </p>
          {pendingExclusao && (
            <span className="inline-flex items-center rounded-full bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-medium mt-1">
              Aguardando exclusão
            </span>
          )}
        </div>

        {/* Observações */}
        {showObservacoes && observacoes && (
          <div className="px-3 pb-2">
            <p className="text-xs text-muted-foreground italic break-words">
              <span className="font-semibold not-italic text-foreground/70">Obs: </span>
              {observacoes}
            </p>
          </div>
        )}

        {/* Metadados organizados em grid */}
        <div className="grid grid-cols-3 gap-2 px-3 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium">{responsavel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{semanasRepeticao}x</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{semanaOrdenacao}ª sem.</span>
          </div>
        </div>

        {/* Status section - larger touch targets */}
        <div className="flex items-center justify-center gap-8 px-3 py-3 bg-muted/30 border-t">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground font-medium">Feito?</span>
            <StatusBolinha
              status={statusResponsavel}
              onClick={onStatusResponsavelChange}
              disabled={!canEditResponsavel}
              size="md"
            />
          </div>
          {showGestorStatus && (
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-muted-foreground font-medium">Aprovado?</span>
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

  // Wrap with swipeable only if can edit
  if (canEditDemanda) {
    return (
      <SwipeableCard onEdit={onEdit} onDelete={onDelete}>
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
}
