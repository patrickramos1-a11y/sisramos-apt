import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Check, X, CheckCircle2, Link as LinkIcon, ExternalLink, Circle, XCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAssignmentPopover from "./UserAssignmentPopover";
import type { ChecklistStatus } from "@/hooks/useChecklist";
import type { Prioridade } from "@/hooks/useChecklistV2";

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
  tipo_item?: string;
  prioridade?: Prioridade | null;
}

interface SortableChecklistItemProps {
  item: ChecklistItem;
  canModify: boolean;
  canCompleteItem: boolean;
  isLocked: boolean;
  canEdit: boolean;
  profiles: Profile[];
  index: number;
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean; link: string | null; status: ChecklistStatus; prioridade: Prioridade | null }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateAssignees: (itemId: string, userIds: string[]) => Promise<void>;
}

export default function SortableChecklistItem({
  item,
  canModify,
  canCompleteItem,
  isLocked,
  canEdit,
  profiles,
  index,
  onUpdateItem,
  onDeleteItem,
  onUpdateAssignees,
}: SortableChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [editingLink, setEditingLink] = useState("");
  const [editingPrioridade, setEditingPrioridade] = useState<Prioridade | null>(null);
  const [justChanged, setJustChanged] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canModify });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingText(item.texto);
    setEditingLink(item.link || "");
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) return;
    await onUpdateItem(item.id, { 
      texto: editingText.trim(),
      link: editingLink.trim() || null,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingText("");
    setEditingLink("");
  };


  const handleStatusClick = useCallback(async () => {
    const currentStatus: ChecklistStatus = item.status || "pendente";
    let newStatus: ChecklistStatus;
    if (currentStatus === "pendente") newStatus = "concluido";
    else if (currentStatus === "concluido") newStatus = "nao_realizado";
    else newStatus = "pendente";
    setJustChanged(true);
    await onUpdateItem(item.id, { status: newStatus, concluido: newStatus === "concluido" });
    setTimeout(() => setJustChanged(false), 600);
  }, [item.id, item.status, onUpdateItem]);

  const getStatusIcon = (status: ChecklistStatus | undefined) => {
    const effectiveStatus = status || "pendente";
    switch (effectiveStatus) {
      case "concluido":
        return <CheckCircle2 className={cn("h-5 w-5 text-primary", justChanged && "animate-check-bounce")} />;
      case "nao_realizado":
        return <XCircle className={cn("h-5 w-5 text-destructive", justChanged && "animate-check-bounce")} />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getInitials = (nome: string) => {
    const parts = nome.split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const itemAssignees = item.assignees || [];
  const assignedProfiles = profiles.filter((p) => itemAssignees.includes(p.user_id));
  const isCompleted = item.status === "concluido" || item.concluido;
  const isNotDone = item.status === "nao_realizado";
  const isZebra = index % 2 === 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
        isZebra ? "bg-muted/20" : "bg-card",
        isCompleted && "bg-primary/5 border-primary/20",
        isNotDone && "bg-destructive/5 border-destructive/20",
        !isCompleted && !isNotDone && "border-transparent hover:bg-muted/30 hover:border-border",
        isDragging && "shadow-xl z-50 border-primary/50 opacity-80 scale-[1.02]",
        justChanged && "animate-highlight-flash"
      )}
    >
      {/* Drag handle */}
      {canModify && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing focus:outline-none text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* Status button */}
      <button
        type="button"
        onClick={handleStatusClick}
        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-110"
        disabled={!canCompleteItem || (isLocked && !canEdit)}
        title={
          isCompleted ? "Concluído (clique para marcar como não realizado)"
          : isNotDone ? "Não realizado (clique para marcar como pendente)"
          : "Pendente (clique para marcar como concluído)"
        }
      >
        {getStatusIcon(item.status)}
      </button>
      
      {isEditing ? (
        <div className="flex-1 space-y-2">
          <Textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            autoFocus
            placeholder="Descrição da tarefa"
          />
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              value={editingLink}
              onChange={(e) => setEditingLink(e.target.value)}
              placeholder="https://link-de-referencia.com"
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSaveEdit}>
              <Check className="h-3.5 w-3.5 text-primary mr-1" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleCancelEdit}>
              <X className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Task text - flex-1 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm leading-relaxed break-words transition-all duration-200",
                  isCompleted && "line-through text-muted-foreground animate-strike-through",
                  isNotDone && "text-destructive"
                )}
              >
                {item.texto}
              </span>
              {item.tipo_item === "avulso_semana" && (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Avulso
                </span>
              )}
              {item.prioridade && item.prioridade !== "media" && (
                <span className={cn(
                  "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                  item.prioridade === "alta" && "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
                  item.prioridade === "baixa" && "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
                )}>
                  {item.prioridade === "alta" ? "Alta" : "Baixa"}
                </span>
              )}
              {item.prioridade === "media" && (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
                  Média
                </span>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div className="shrink-0 flex items-center">
            {canModify ? (
              <UserAssignmentPopover
                profiles={profiles}
                assignedUserIds={itemAssignees}
                onAssignmentChange={(userIds) => onUpdateAssignees(item.id, userIds)}
                disabled={isLocked && !canEdit}
                compact={false}
              />
            ) : assignedProfiles.length > 0 ? (
              <TooltipProvider>
                <div className="flex items-center -space-x-1">
                  {assignedProfiles.slice(0, 3).map((profile) => (
                    <Tooltip key={profile.user_id}>
                      <TooltipTrigger asChild>
                        <Avatar
                          className="h-6 w-6 border-2 border-background cursor-default"
                          style={profile.cor ? { backgroundColor: profile.cor } : undefined}
                        >
                          <AvatarFallback
                            className="text-[9px] font-medium text-white bg-transparent"
                            style={!profile.cor ? undefined : { backgroundColor: 'transparent' }}
                          >
                            {getInitials(profile.nome)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs font-medium">{profile.nome}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {assignedProfiles.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium border-2 border-background">
                      +{assignedProfiles.length - 3}
                    </div>
                  )}
                </div>
              </TooltipProvider>
            ) : null}
          </div>

          {/* Link */}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Link</span>
            </a>
          )}
          
          {/* Actions */}
          {canModify && (
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleStartEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
