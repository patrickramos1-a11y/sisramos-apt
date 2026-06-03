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
import { Clock3, MoreVertical, Pencil, Trash2, Flame, Star, Repeat, MessageCircle, RefreshCw } from "lucide-react";
import { AptTag } from "@/lib/tags";
import { DemandaModoExecucao, DemandaPrazoStatusVisual, formatPrazoWindow, getPrazoStatusLabel, getPrazoToneClasses } from "@/lib/demandas-prazo";

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
  modoExecucao?: DemandaModoExecucao | null;
  semanaInicioPrazo?: number | null;
  semanaFimPrazo?: number | null;
  prazoStatusVisual?: DemandaPrazoStatusVisual;
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
  whatsappHref?: string | null;
  tags?: AptTag[];
  onStatusResponsavelChange: () => void;
  onStatusGestorChange: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTransformToPersistent?: () => void;
  onTransformToPrazo?: () => void;
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
  modoExecucao,
  semanaInicioPrazo,
  semanaFimPrazo,
  prazoStatusVisual,
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
  whatsappHref,
  tags = [],
  onStatusResponsavelChange,
  onStatusGestorChange,
  onClick,
  onEdit,
  onDelete,
  onTransformToPersistent,
  onTransformToPrazo,
  onSelectChange,
}: DemandaTableRowProps) {
  const semanaOrdenacao = semanaLimite?.length ? Math.min(...semanaLimite) : 0;
  const prazoWindow = formatPrazoWindow(
    {
      id,
      semana_limite: semanaLimite,
      modo_execucao: modoExecucao,
      semana_inicio_prazo: semanaInicioPrazo,
      semana_fim_prazo: semanaFimPrazo,
    },
    "compact"
  );
  const prazoStatusLabel = getPrazoStatusLabel(prazoStatusVisual ?? null);

  return (
    <TableRow
      className={cn(
        "relative cursor-pointer transition-colors",
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
        <TableCell className="relative w-10" onClick={(e) => e.stopPropagation()}>
          {(muitoUrgente || prioritaria) && (
            <span
              className={cn(
                "absolute bottom-0 left-0 top-0 w-[3px]",
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

      <TableCell
        className={cn(
          "relative w-16 text-center font-mono",
          !showCheckbox && (muitoUrgente || prioritaria) && "pl-3"
        )}
      >
        {!showCheckbox && (muitoUrgente || prioritaria) && (
          <span
            className={cn(
              "absolute bottom-0 left-0 top-0 w-[3px]",
              muitoUrgente ? "bg-destructive" : "bg-warning"
            )}
            aria-hidden
          />
        )}
        {numero}
      </TableCell>

      <TableCell className="w-24">
        <span
          className="inline-block rounded-md px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: setorCor }}
        >
          {setor}
        </span>
      </TableCell>

      <TableCell className="w-28 truncate">{responsavel}</TableCell>

      <TableCell className="whitespace-normal break-words">
        <div className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
            {muitoUrgente ? (
              <Flame className="h-3.5 w-3.5 fill-destructive text-destructive" />
            ) : prioritaria ? (
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            ) : null}
          </span>

          <div className="min-w-0 space-y-1">
            <p className="leading-snug text-foreground">{descricao}</p>
            {prazoWindow && (
              <div className="flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                  <Clock3 className="h-3 w-3" />
                  {prazoWindow}
                </span>
                {prazoStatusLabel && (
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                      getPrazoToneClasses(prazoStatusVisual ?? null)
                    )}
                  >
                    {prazoStatusLabel}
                  </span>
                )}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80"
                    style={{ backgroundColor: `${tag.cor}66`, borderColor: tag.cor }}
                  >
                    #{tag.nome}
                  </span>
                ))}
              </div>
            )}
            {pendingExclusao && (
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                Aguardando exclusao
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {showObservacoesColumn && (
        <TableCell className="w-48 whitespace-normal break-words align-top text-sm text-muted-foreground">
          {observacoes ? observacoes : <span className="text-muted-foreground/50">-</span>}
        </TableCell>
      )}

      {showResponsavelColumn && (
        <TableCell className="w-20 text-center" onClick={(e) => e.stopPropagation()}>
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
        <TableCell className="w-20 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center">
            <StatusBolinha
              status={statusGestor}
              onClick={onStatusGestorChange}
              disabled={!canEditGestor}
            />
          </div>
        </TableCell>
      )}

      <TableCell className="w-12 text-center">
        {prazoWindow ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            <Clock3 className="h-3 w-3" />
            Prazo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat className="h-3 w-3 opacity-60" />
            {semanasRepeticao}x
          </span>
        )}
      </TableCell>

      <TableCell className="w-20 text-center">
        <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
          {prazoWindow || `${semanaOrdenacao}a`}
        </span>
      </TableCell>

      {(canEditDemanda || whatsappHref) && (
        <TableCell className="w-28 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            {whatsappHref && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Enviar mensagem no WhatsApp"
                  title="Tirar duvida no WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
            )}

            {canEditDemanda && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  {onTransformToPersistent && (
                    <DropdownMenuItem onClick={onTransformToPersistent}>
                      <RefreshCw className="mr-2 h-4 w-4 text-orange-600" />
                      Transformar em persistente
                    </DropdownMenuItem>
                  )}
                  {onTransformToPrazo && (
                    <DropdownMenuItem onClick={onTransformToPrazo}>
                      <Clock3 className="mr-2 h-4 w-4 text-sky-600" />
                      Transformar em demanda com prazo
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
