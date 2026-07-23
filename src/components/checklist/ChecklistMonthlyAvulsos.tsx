import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ChecklistInstance, ChecklistStatus } from "@/hooks/useChecklistV2";
import {
  CHECKLIST_STATUS_OPTIONS,
  getChecklistStatusOption,
  isChecklistStatusFinal,
  normalizeChecklistStatus,
} from "@/lib/checklist-status";

interface ChecklistMonthlyAvulsosProps {
  items: ChecklistInstance[];
  canModify: boolean;
  currentUserId?: string;
  isGestorOrAdmin: boolean;
  onUpdateStatus: (id: string, status: ChecklistStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (description: string) => Promise<void>;
}

export default function ChecklistMonthlyAvulsos({
  items,
  canModify,
  currentUserId,
  isGestorOrAdmin,
  onUpdateStatus,
  onDelete,
  onAdd,
}: ChecklistMonthlyAvulsosProps) {
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const pendingItems = useMemo(
    () => items.filter((item) => !isChecklistStatusFinal(item.status)),
    [items],
  );
  const historyItems = useMemo(
    () => items.filter((item) => isChecklistStatusFinal(item.status)),
    [items],
  );

  const handleAdd = async () => {
    const value = description.trim();
    if (!value || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(value);
      setDescription("");
    } finally {
      setIsAdding(false);
    }
  };

  const renderItem = (item: ChecklistInstance) => {
    const normalizedStatus = normalizeChecklistStatus(item.status);
    const option = getChecklistStatusOption(normalizedStatus);
    const StatusIcon = option.icon;
    const isAssigned =
      isGestorOrAdmin ||
      item.assignees.length === 0 ||
      Boolean(currentUserId && item.assignees.includes(currentUserId));

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center gap-2 border-t px-3 py-2 first:border-t-0",
          normalizedStatus === "feito" && "bg-emerald-50/60",
          normalizedStatus === "nao_feito" && "bg-red-50/60",
          normalizedStatus === "nao_relevante" && "bg-sky-50/60",
          normalizedStatus === "nao_consegui" && "bg-amber-50/60",
        )}
      >
        <Select
          value={normalizedStatus}
          onValueChange={(value) => onUpdateStatus(item.id, value as ChecklistStatus)}
          disabled={!isAssigned}
        >
          <SelectTrigger
            aria-label={`Status: ${option.label}`}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full border p-0 [&>svg:last-child]:hidden",
              option.className,
            )}
          >
            <StatusIcon className="mx-auto h-4 w-4" />
          </SelectTrigger>
          <SelectContent align="start">
            {CHECKLIST_STATUS_OPTIONS.map((statusOption) => {
              const Icon = statusOption.icon;
              return (
                <SelectItem key={statusOption.value} value={statusOption.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {statusOption.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", isChecklistStatusFinal(item.status) && "text-muted-foreground")}>
            {item.descricao}
          </p>
          {isChecklistStatusFinal(item.status) && (
            <p className="text-[11px] text-muted-foreground">{option.label}</p>
          )}
        </div>

        {canModify && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(item.id)}
            aria-label="Excluir item avulso"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-amber-50/60 px-3 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Avulsos do mês</h2>
            <p className="text-xs text-muted-foreground">
              Permanecem aqui até receberem um resultado final.
            </p>
          </div>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {pendingItems.length} pendente{pendingItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {canModify && (
          <div className="flex min-w-0 gap-2 sm:w-[420px]">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleAdd()}
              placeholder="Adicionar demanda avulsa do mês..."
              className="h-9 bg-background"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1"
              onClick={handleAdd}
              disabled={!description.trim() || isAdding}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        )}
      </div>

      {pendingItems.length > 0 ? (
        <div>{pendingItems.map(renderItem)}</div>
      ) : (
        <div className="px-4 py-5 text-center text-sm text-muted-foreground">
          Nenhuma demanda avulsa pendente neste mês.
        </div>
      )}

      {historyItems.length > 0 && (
        <div className="border-t">
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full justify-between rounded-none px-3 text-xs text-muted-foreground"
            onClick={() => setShowHistory((current) => !current)}
          >
            <span>Histórico do mês ({historyItems.length})</span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showHistory && <div className="border-t">{historyItems.map(renderItem)}</div>}
        </div>
      )}
    </section>
  );
}
