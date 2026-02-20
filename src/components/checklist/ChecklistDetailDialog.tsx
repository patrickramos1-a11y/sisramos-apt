import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SortableChecklistItem from "./SortableChecklistItem";
import CircularProgress from "./CircularProgress";
import type { ChecklistStatus } from "@/hooks/useChecklist";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cor?: string | null;
}

interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
  status?: ChecklistStatus;
  link?: string | null;
  assignees?: string[];
  ordem: number;
}

interface ChecklistDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semana: number;
  mes?: number;
  ano?: number;
  items: ChecklistItem[];
  canEdit: boolean;
  isLocked: boolean;
  currentUserId?: string;
  isGestorOrAdmin: boolean;
  profiles: Profile[];
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean; link: string | null; status: ChecklistStatus }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateAssignees: (itemId: string, userIds: string[]) => Promise<void>;
  onReorderItems?: (itemId: string, newOrder: number, semana: number, mes: number, ano: number) => Promise<void>;
}

export default function ChecklistDetailDialog({
  open,
  onOpenChange,
  semana,
  mes,
  ano,
  items,
  canEdit,
  isLocked,
  currentUserId,
  isGestorOrAdmin,
  profiles,
  onUpdateItem,
  onDeleteItem,
  onUpdateAssignees,
  onReorderItems,
}: ChecklistDetailDialogProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [items]
  );

  const completedCount = items.filter((i) => i.status === "concluido" || i.concluido).length;
  const notDoneCount = items.filter((i) => i.status === "nao_realizado").length;
  const pendingCount = items.length - completedCount - notDoneCount;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const allProcessed = totalCount > 0 && !allCompleted && (completedCount + notDoneCount === totalCount) && notDoneCount > 0;
  const canModify = canEdit && !isLocked;

  const weekColors: Record<number, { bg: string; icon: string }> = {
    1: { bg: "from-emerald-500/20 to-emerald-500/5", icon: "bg-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
    2: { bg: "from-blue-500/20 to-blue-500/5", icon: "bg-blue-500/30 text-blue-700 dark:text-blue-400" },
    3: { bg: "from-purple-500/20 to-purple-500/5", icon: "bg-purple-500/30 text-purple-700 dark:text-purple-400" },
    4: { bg: "from-orange-500/20 to-orange-500/5", icon: "bg-orange-500/30 text-orange-700 dark:text-orange-400" },
    5: { bg: "from-pink-500/20 to-pink-500/5", icon: "bg-pink-500/30 text-pink-700 dark:text-pink-400" },
  };

  const weekColor = weekColors[semana] || weekColors[1];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderItems || !mes || !ano) return;
    const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedItems.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      await onReorderItems(active.id as string, newIndex, semana, mes, ano);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className={cn(
          "px-6 py-4 bg-gradient-to-r rounded-t-lg",
          allCompleted ? "from-primary/20 to-primary/10" 
            : allProcessed ? "from-amber-500/20 to-amber-500/10"
            : weekColor.bg
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md",
                  allCompleted ? "bg-primary/20" 
                    : allProcessed ? "bg-amber-500/20"
                    : weekColor.icon
                )}>
                  {allCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary animate-check-bounce" />
                  ) : allProcessed ? (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-check-bounce" />
                  ) : (
                    <Calendar className="h-5 w-5" />
                  )}
                </div>
                <span>{allCompleted ? "Semana Completa ✓" : allProcessed ? "Semana Finalizada ⚠" : `${semana}ª Semana`}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Status badges */}
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  {pendingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      {completedCount} concluída{completedCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {notDoneCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                      {notDoneCount} não realizada{notDoneCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <CircularProgress value={progress} size={44} strokeWidth={3.5} completedCount={completedCount} notDoneCount={notDoneCount} totalCount={totalCount} />
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Table header - desktop only */}
        {sortedItems.length > 0 && (
        <div className="hidden md:flex items-center gap-3 px-6 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {canModify && <span className="w-5 shrink-0" />}
          <span className="w-5 shrink-0">Status</span>
          <span className="flex-1">Tarefa</span>
          <span className="w-24 text-center">Responsáveis</span>
          <span className="w-10 text-center">Link</span>
          {canModify && <span className="w-16 text-center">Ações</span>}
        </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[60vh] overflow-auto">
          <div className="space-y-1 px-6 py-3">
            {sortedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-muted/50 rounded-full mb-2">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhum item cadastrado nesta semana
                </p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {sortedItems.map((item, index) => {
                    const itemAssignees = item.assignees || [];
                    const isAssignedToMe = currentUserId && itemAssignees.includes(currentUserId);
                    const canCompleteItem = isGestorOrAdmin || isAssignedToMe || itemAssignees.length === 0;

                    return (
                      <SortableChecklistItem
                        key={item.id}
                        item={item}
                        index={index}
                        canModify={canModify}
                        canCompleteItem={canCompleteItem}
                        isLocked={isLocked}
                        canEdit={canEdit}
                        profiles={profiles}
                        onUpdateItem={onUpdateItem}
                        onDeleteItem={onDeleteItem}
                        onUpdateAssignees={onUpdateAssignees}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </ScrollArea>

        {isLocked && !canEdit && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Mês bloqueado para edição
            </p>
          </div>
        )}
        
        {canModify && sortedItems.length > 1 && (
          <div className="px-6 py-2 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground text-center">
              Arraste os itens para reorganizar a ordem
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
