import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES_NOMES: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

interface MonthSettingsControlProps {
  mes: number;
  ano: number;
  isPastMonth: boolean;
  isStatusActive: boolean;
  onToggle: () => void;
  isGestorOrAdmin: boolean;
}

export default function MonthSettingsControl({
  mes,
  ano,
  isPastMonth,
  isStatusActive,
  onToggle,
  isGestorOrAdmin,
}: MonthSettingsControlProps) {
  if (!isPastMonth) {
    return null; // Don't show control for current/future months
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border",
        isStatusActive
          ? "bg-warning/10 border-warning/30"
          : "bg-muted/50 border-muted"
      )}
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {MESES_NOMES[mes]} {ano}
        </span>
        <Badge
          variant={isPastMonth ? "secondary" : "default"}
          className="text-xs"
        >
          Mês passado
        </Badge>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {isStatusActive ? (
          <div className="flex items-center gap-1.5 text-warning">
            <Unlock className="h-4 w-4" />
            <span className="text-xs font-medium">Marcações liberadas</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs font-medium">Marcações bloqueadas</span>
          </div>
        )}

        {isGestorOrAdmin && (
          <div className="flex items-center gap-2 ml-2">
            <Switch
              id="month-status"
              checked={isStatusActive}
              onCheckedChange={onToggle}
            />
            <Label htmlFor="month-status" className="text-xs cursor-pointer">
              {isStatusActive ? "Bloquear" : "Liberar"}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}

// Banner warning for past month restrictions
export function PastMonthWarningBanner({
  isPastMonth,
  isStatusActive,
  isCollaborator,
}: {
  isPastMonth: boolean;
  isStatusActive: boolean;
  isCollaborator: boolean;
}) {
  if (!isPastMonth) return null;

  if (isCollaborator) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted text-sm">
        <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">
          Este é um mês passado. Você pode apenas visualizar as demandas.
        </span>
      </div>
    );
  }

  if (!isStatusActive) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted text-sm">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">
          Marcações de status estão bloqueadas neste mês. Use o controle acima para liberar.
        </span>
      </div>
    );
  }

  return null;
}
