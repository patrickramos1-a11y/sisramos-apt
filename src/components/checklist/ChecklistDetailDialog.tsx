import { useState, useMemo } from "react";
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
  arrayMove,
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SortableChecklistItem from "./SortableChecklistItem";
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort items by ordem
  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [items]
  );

  const completedCount = items.filter((i) => i.status === "concluido" || i.concluido).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

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
    
    if (!over || active.id === over.id || !onReorderItems || !mes || !ano) {
      return;
    }

    const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedItems.findIndex((item) => item.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      await onReorderItems(active.id as string, newIndex, semana, mes, ano);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className={cn(
          "px-6 py-4 bg-gradient-to-r rounded-t-lg",
          allCompleted 
            ? "from-primary/20 to-primary/10" 
            : weekColor.bg
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                allCompleted ? "bg-primary/20" : weekColor.icon
              )}>
                {allCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Calendar className="h-5 w-5" />
                )}
              </div>
              <span>{semana}ª Semana</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({completedCount}/{totalCount} concluídas)
              </span>
            </DialogTitle>
          </DialogHeader>
          <Progress value={progress} className="h-2 mt-3" />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[60vh] overflow-auto">
          <div className="space-y-2 px-6 py-4">
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedItems.map((item) => {
                    const itemAssignees = item.assignees || [];
                    const isAssignedToMe = currentUserId && itemAssignees.includes(currentUserId);
                    const canCompleteItem = isGestorOrAdmin || isAssignedToMe || itemAssignees.length === 0;

                    return (
                      <SortableChecklistItem
                        key={item.id}
                        item={item}
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
