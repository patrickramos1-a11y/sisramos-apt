import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Check, X, Calendar, CheckCircle2, Link as LinkIcon, ExternalLink, Circle, XCircle } from "lucide-react";
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

interface ChecklistDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semana: number;
  items: ChecklistItem[];
  canEdit: boolean;
  isLocked: boolean;
  currentUserId?: string;
  isGestorOrAdmin: boolean;
  profiles: Profile[];
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean; link: string | null; status: ChecklistStatus }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateAssignees: (itemId: string, userIds: string[]) => Promise<void>;
}

export default function ChecklistDetailDialog({
  open,
  onOpenChange,
  semana,
  items,
  canEdit,
  isLocked,
  currentUserId,
  isGestorOrAdmin,
  profiles,
  onUpdateItem,
  onDeleteItem,
  onUpdateAssignees,
}: ChecklistDetailDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingLink, setEditingLink] = useState("");

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditingText(item.texto);
    setEditingLink(item.link || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    await onUpdateItem(editingId, { 
      texto: editingText.trim(),
      link: editingLink.trim() || null,
    });
    setEditingId(null);
    setEditingText("");
    setEditingLink("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
    setEditingLink("");
  };

  const completedCount = items.filter((i) => i.status === "concluido" || i.concluido).length;
  const notDoneCount = items.filter((i) => i.status === "nao_realizado").length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const canModify = canEdit && !isLocked;
  
  // Cycle through statuses: pendente -> concluido -> nao_realizado -> pendente
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

  const weekColors: Record<number, { bg: string; icon: string }> = {
    1: { bg: "from-emerald-500/20 to-emerald-500/5", icon: "bg-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
    2: { bg: "from-blue-500/20 to-blue-500/5", icon: "bg-blue-500/30 text-blue-700 dark:text-blue-400" },
    3: { bg: "from-purple-500/20 to-purple-500/5", icon: "bg-purple-500/30 text-purple-700 dark:text-purple-400" },
    4: { bg: "from-orange-500/20 to-orange-500/5", icon: "bg-orange-500/30 text-orange-700 dark:text-orange-400" },
    5: { bg: "from-pink-500/20 to-pink-500/5", icon: "bg-pink-500/30 text-pink-700 dark:text-pink-400" },
  };

  const weekColor = weekColors[semana] || weekColors[1];

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
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-muted/50 rounded-full mb-2">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhum item cadastrado nesta semana
                </p>
              </div>
            ) : (
              items.map((item) => {
                const itemAssignees = item.assignees || [];
                const isAssignedToMe = currentUserId && itemAssignees.includes(currentUserId);
                const canCompleteItem = isGestorOrAdmin || isAssignedToMe || itemAssignees.length === 0;
                const assignedProfiles = profiles.filter((p) => itemAssignees.includes(p.user_id));

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-lg border transition-all duration-150",
                      item.status === "concluido" || item.concluido
                        ? "bg-muted/30 border-muted" 
                        : item.status === "nao_realizado"
                        ? "bg-destructive/10 border-destructive/30"
                        : "border-transparent hover:bg-muted/20 hover:border-border"
                    )}
                  >
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
                    
                    {editingId === item.id ? (
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
                              {new URL(item.link).hostname}
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
                              onClick={() => handleStartEdit(item)}
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
              })
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
      </DialogContent>
    </Dialog>
  );
}
