import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBolinha from "./StatusBolinha";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, User, RefreshCw, Calendar } from "lucide-react";

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
        "transition-all hover:shadow-md overflow-hidden",
        prioritaria && "bg-[hsl(var(--apt-prioritaria))] border-warning/30"
      )}
    >
      <CardContent className="p-0">
        {/* Header com número, setor e badges */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/50 border-b">
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
            {prioritaria && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Prioritária
              </Badge>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div className="px-4 py-3">
          <p className="text-sm font-medium leading-relaxed whitespace-normal break-words">
            {descricao}
          </p>
        </div>

        {/* Metadados organizados em grid */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
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

        {/* Status section - horizontal layout */}
        <div className="flex items-center justify-center gap-6 px-4 py-3 bg-muted/30 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Feito?</span>
            <StatusBolinha
              status={statusResponsavel}
              onClick={onStatusResponsavelChange}
              disabled={!canEditResponsavel}
              size="md"
            />
          </div>
          {showGestorStatus && (
            <div className="flex items-center gap-2">
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

        {/* Ações */}
        {canEditDemanda && (
          <div className="flex items-center gap-2 p-3 border-t bg-card">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 h-9"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
