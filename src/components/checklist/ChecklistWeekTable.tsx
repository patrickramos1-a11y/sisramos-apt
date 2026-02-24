import { useState, useMemo, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, CheckCircle2, AlertCircle, Search, ChevronUp, Plus, ListTree, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import CircularProgress from "./CircularProgress";
import SortableChecklistItem from "./SortableChecklistItem";
import type { ChecklistInstance, ChecklistStatus } from "@/hooks/useChecklistV2";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cor?: string | null;
}

interface ChecklistWeekTableProps {
  semana: number;
  items: ChecklistInstance[];
  canModify: boolean;
  isLocked: boolean;
  currentUserId?: string;
  isGestorOrAdmin: boolean;
  profiles: Profile[];
  onUpdateStatus: (id: string, status: ChecklistStatus) => Promise<void>;
  onUpdateInstance: (id: string, updates: { descricao_override?: string; link_override?: string | null }) => Promise<void>;
  onDeleteInstance: (id: string) => Promise<void>;
  onUpdateAssignees: (instanceId: string, userIds: string[]) => Promise<void>;
  onReorder: (instanceId: string, newIndex: number, semana: number) => Promise<void>;
  onClose: () => void;
  onAddSubItem?: (parentId: string, descricao: string, semana: number) => Promise<void>;
  onAddQuickAvulso?: (descricao: string, semana: number) => Promise<void>;
}

export default function ChecklistWeekTable({
  semana,
  items,
  canModify,
  isLocked,
  currentUserId,
  isGestorOrAdmin,
  profiles,
  onUpdateStatus,
  onUpdateInstance,
  onDeleteInstance,
  onUpdateAssignees,
  onReorder,
  onClose,
  onAddSubItem,
  onAddQuickAvulso,
}: ChecklistWeekTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Stats
  const completedCount = items.filter((i) => i.status === "concluido").length;
  const notDoneCount = items.filter((i) => i.status === "nao_realizado").length;
  const pendingCount = items.filter((i) => i.status === "pendente").length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const allProcessed = totalCount > 0 && !allCompleted && (completedCount + notDoneCount === totalCount) && notDoneCount > 0;

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = items;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((i) => i.descricao.toLowerCase().includes(term));
    }
    if (filterStatus !== "all") {
      result = result.filter((i) => i.status === filterStatus);
    }
    if (filterTipo !== "all") {
      result = result.filter((i) => i.tipo_item === filterTipo);
    }
    return result;
  }, [items, searchTerm, filterStatus, filterTipo]);

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
    if (!over || active.id === over.id) return;
    const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
    const newIndex = filteredItems.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      await onReorder(active.id as string, newIndex, semana);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Adapter functions for SortableChecklistItem compatibility
  const handleUpdateItem = useCallback(async (id: string, updates: Partial<{ texto: string; concluido: boolean; link: string | null; status: ChecklistStatus }>) => {
    if (updates.status !== undefined) {
      await onUpdateStatus(id, updates.status);
    }
    if (updates.texto !== undefined || updates.link !== undefined) {
      const instanceUpdates: any = {};
      if (updates.texto !== undefined) instanceUpdates.descricao_override = updates.texto;
      if (updates.link !== undefined) instanceUpdates.link_override = updates.link;
      await onUpdateInstance(id, instanceUpdates);
    }
  }, [onUpdateStatus, onUpdateInstance]);

  // Adapt instances to ChecklistItem interface for SortableChecklistItem
  const adaptedItems = useMemo(() => {
    return filteredItems.map((inst) => ({
      id: inst.id,
      texto: inst.descricao,
      concluido: inst.status === "concluido",
      status: inst.status as ChecklistStatus,
      link: inst.link,
      assignees: inst.assignees,
      tipo_item: inst.tipo_item,
      is_group: inst.is_group,
      parent_id: inst.parent_id,
      children: inst.children,
    }));
  }, [filteredItems]);

  // Separate into recorrente and avulso
  const recorrenteItems = useMemo(() => adaptedItems.filter((i) => i.tipo_item !== "avulso_semana"), [adaptedItems]);
  const avulsoItems = useMemo(() => adaptedItems.filter((i) => i.tipo_item === "avulso_semana"), [adaptedItems]);

  const showRecorrente = filterTipo === "all" || filterTipo === "recorrente";
  const showAvulso = filterTipo === "all" || filterTipo === "avulso_semana";

  // Helper to render a section of items
  const renderItemSection = (sectionItems: typeof adaptedItems, allAdapted: typeof adaptedItems) => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sectionItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {sectionItems.map((item) => {
          const globalIndex = allAdapted.findIndex((a) => a.id === item.id);
          const itemAssignees = item.assignees || [];
          const isAssignedToMe = currentUserId && itemAssignees.includes(currentUserId);
          const canCompleteItem = isGestorOrAdmin || isAssignedToMe || itemAssignees.length === 0;

          return (
            <div key={item.id}>
              <div className="flex items-center gap-1">
                {item.is_group && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => toggleGroup(item.id)}>
                    <ChevronUp className={cn("h-3.5 w-3.5 transition-transform", !expandedGroups.has(item.id) && "rotate-180")} />
                  </Button>
                )}
                <div className="flex-1">
                  <SortableChecklistItem
                    item={item}
                    index={globalIndex}
                    canModify={canModify}
                    canCompleteItem={canCompleteItem && !item.is_group}
                    isLocked={isLocked}
                    canEdit={isGestorOrAdmin}
                    profiles={profiles}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={onDeleteInstance}
                    onUpdateAssignees={onUpdateAssignees}
                  />
                </div>
                {canModify && onAddSubItem && !item.parent_id && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const willExpand = !expandedGroups.has(item.id);
                            if (willExpand) {
                              setExpandedGroups((prev) => new Set(prev).add(item.id));
                            } else {
                              toggleGroup(item.id);
                            }
                          }}
                        >
                          <ListTree className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">{item.is_group ? "Gerenciar subtarefas" : "Adicionar subtarefa"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {expandedGroups.has(item.id) && (
                <div className="ml-8 border-l-2 border-muted pl-3 space-y-0.5 mt-1 mb-2">
                  {item.is_group && item.children && item.children.map((child, childIdx) => {
                    const childAssignees = child.assignees || [];
                    const childIsAssigned = currentUserId && childAssignees.includes(currentUserId);
                    const childCanComplete = isGestorOrAdmin || childIsAssigned || childAssignees.length === 0;
                    return (
                      <SortableChecklistItem
                        key={child.id}
                        item={{
                          id: child.id,
                          texto: child.descricao,
                          concluido: child.status === "concluido",
                          status: child.status,
                          link: child.link,
                          assignees: child.assignees,
                        }}
                        index={childIdx}
                        canModify={canModify}
                        canCompleteItem={childCanComplete}
                        isLocked={isLocked}
                        canEdit={isGestorOrAdmin}
                        profiles={profiles}
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={onDeleteInstance}
                        onUpdateAssignees={onUpdateAssignees}
                      />
                    );
                  })}
                  {!item.is_group && !item.children?.length && (
                    <p className="text-xs text-muted-foreground py-2">Nenhuma subtarefa ainda. Adicione abaixo:</p>
                  )}
                  {canModify && onAddSubItem && (
                    <AddSubItemInline parentId={item.id} semana={semana} onAdd={onAddSubItem} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </SortableContext>
    </DndContext>
  );

  return (
    <div className="border rounded-lg bg-card shadow-sm animate-fade-in mt-4">
      {/* Header */}
      <div className={cn(
        "px-4 py-3 bg-gradient-to-r rounded-t-lg flex items-center justify-between gap-3",
        allCompleted ? "from-primary/20 to-primary/10"
          : allProcessed ? "from-amber-500/20 to-amber-500/10"
          : weekColor.bg
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            allCompleted ? "bg-primary/20" : allProcessed ? "bg-amber-500/20" : weekColor.icon
          )}>
            {allCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : allProcessed ? (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
          </div>
          <h3 className="font-semibold text-sm">
            {allCompleted ? "Semana Completa ✓" : allProcessed ? "Semana Finalizada ⚠" : `${semana}ª Semana`}
          </h3>
          <div className="hidden sm:flex items-center gap-2 text-xs ml-2">
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
        </div>
        <div className="flex items-center gap-2">
          <CircularProgress value={progress} size={36} strokeWidth={3} completedCount={completedCount} notDoneCount={notDoneCount} totalCount={totalCount} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="px-4 py-2 border-b bg-muted/20 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="nao_realizado">Não realizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="recorrente">Recorrente</SelectItem>
            <SelectItem value="avulso_semana">Avulso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table header - desktop only */}
      {adaptedItems.length > 0 && (
        <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {canModify && <span className="w-5 shrink-0" />}
          <span className="w-5 shrink-0">Status</span>
          <span className="flex-1">Tarefa</span>
          <span className="w-24 text-center">Responsáveis</span>
          <span className="w-10 text-center">Link</span>
          {canModify && <span className="w-20 text-center">Ações</span>}
        </div>
      )}

      {/* Items */}
      <div className="max-h-[50vh] overflow-y-auto">
        <div className="space-y-0.5 p-3">
          {adaptedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterStatus !== "all" || filterTipo !== "all"
                  ? "Nenhum item encontrado com os filtros atuais"
                  : "Nenhum item nesta semana"}
              </p>
            </div>
          ) : (
            <>
              {/* Recorrente section */}
              {showRecorrente && recorrenteItems.length > 0 && (
                <div>
                  {showAvulso && avulsoItems.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recorrentes</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  {renderItemSection(recorrenteItems, adaptedItems)}
                </div>
              )}

              {/* Avulso section */}
              {showAvulso && (
                <div className={cn(showRecorrente && recorrenteItems.length > 0 && "mt-4")}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Avulso</span>
                    <div className="flex-1 h-px bg-amber-500/20" />
                  </div>
                  {avulsoItems.length > 0 && renderItemSection(avulsoItems, adaptedItems)}
                  {avulsoItems.length === 0 && !searchTerm && filterStatus === "all" && (
                    <p className="text-xs text-muted-foreground py-2 pl-5">Nenhum item avulso nesta semana</p>
                  )}
                  {canModify && onAddQuickAvulso && (
                    <AddAvulsoInline semana={semana} onAdd={onAddQuickAvulso} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {canModify && adaptedItems.length > 1 && (
        <div className="px-4 py-2 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Arraste os itens para reorganizar a ordem
          </p>
        </div>
      )}
    </div>
  );
}

// Inline sub-item add
function AddSubItemInline({ parentId, semana, onAdd }: { parentId: string; semana: number; onAdd: (parentId: string, descricao: string, semana: number) => Promise<void> }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setAdding(true);
    await onAdd(parentId, text.trim(), semana);
    setText("");
    setAdding(false);
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Adicionar sub-item..."
        className="h-7 text-xs flex-1"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAdd} disabled={!text.trim() || adding}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// Inline avulso add
function AddAvulsoInline({ semana, onAdd }: { semana: number; onAdd: (descricao: string, semana: number) => Promise<void> }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setAdding(true);
    await onAdd(text.trim(), semana);
    setText("");
    setAdding(false);
  };

  return (
    <div className="flex items-center gap-2 py-1 mt-1">
      <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Adicionar item avulso..."
        className="h-7 text-xs flex-1"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAdd} disabled={!text.trim() || adding}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
