import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Trash2, Check, X, CheckCircle2, Link as LinkIcon, ExternalLink, Circle, XCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAssignmentPopover from "./UserAssignmentPopover";
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
}

interface SortableChecklistItemProps {
  item: ChecklistItem;
  canModify: boolean;
  canCompleteItem: boolean;
  isLocked: boolean;
  canEdit: boolean;
  profiles: Profile[];
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean; link: string | null; status: ChecklistStatus }>) => Promise<void>;
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
  onUpdateItem,
  onDeleteItem,
  onUpdateAssignees,
}: SortableChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [editingLink, setEditingLink] = useState("");

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
    opacity: isDragging ? 0.5 : 1,
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

  const cycleStatus = (currentStatus: ChecklistStatus | undefined): ChecklistStatus => {
    const status = currentStatus || "pendente";
    if (status === "pendente") return "concluido";
    if (status === "concluido") return "nao_realizado";
    return "pendente";
  };

  const getStatusIcon = (status: ChecklistStatus | undefined) => {
    const effectiveStatus = status || "pendente";
    switch (effectiveStatus) {
      case "concluido":
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case "nao_realizado":
        return <XCircle className="h-5 w-5 text-destructive" />;
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

  const getAvatarColor = (nome: string) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
      "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
    ];
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
      hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const itemAssignees = item.assignees || [];
  const assignedProfiles = profiles.filter((p) => itemAssignees.includes(p.user_id));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border transition-all duration-150",
        item.status === "concluido" || item.concluido
          ? "bg-muted/30 border-muted" 
          : item.status === "nao_realizado"
          ? "bg-destructive/10 border-destructive/30"
          : "border-transparent hover:bg-muted/20 hover:border-border",
        isDragging && "shadow-lg z-50"
      )}
    >
      {/* Drag handle */}
      {canModify && (
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing focus:outline-none text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* 3-state status button */}
      <button
        type="button"
        onClick={() => onUpdateItem(item.id, { status: cycleStatus(item.status) })}
        className="mt-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!canCompleteItem || (isLocked && !canEdit)}
        title={
          item.status === "concluido" ? "Concluído (clique para marcar como não realizado)"
          : item.status === "nao_realizado" ? "Não realizado (clique para marcar como pendente)"
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
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleSaveEdit}
            >
              <Check className="h-3.5 w-3.5 text-primary mr-1" />
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleCancelEdit}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                "block text-sm leading-relaxed break-words",
                (item.status === "concluido" || item.concluido) && "line-through text-muted-foreground",
                item.status === "nao_realizado" && "text-destructive"
              )}
            >
              {item.texto}
            </span>
            
            {/* Link display */}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                {(() => {
                  try {
                    return new URL(item.link).hostname;
                  } catch {
                    return item.link;
                  }
                })()}
              </a>
            )}
            
            {/* Assigned users */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {canModify ? (
                <UserAssignmentPopover
                  profiles={profiles}
                  assignedUserIds={itemAssignees}
                  onAssignmentChange={(userIds) => onUpdateAssignees(item.id, userIds)}
                  disabled={isLocked && !canEdit}
                  compact={false}
                />
              ) : assignedProfiles.length > 0 ? (
                <div className="flex items-center -space-x-1">
                  {assignedProfiles.slice(0, 4).map((profile) => (
                    <Avatar
                      key={profile.user_id}
                      className={cn("h-5 w-5 border-2 border-background", getAvatarColor(profile.nome))}
                      title={profile.nome}
                    >
                      <AvatarFallback className="text-[8px] font-medium text-white bg-transparent">
                        {getInitials(profile.nome)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignedProfiles.length > 4 && (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-medium border-2 border-background">
                      +{assignedProfiles.length - 4}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          
          {canModify && (
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleStartEdit}
              >
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
