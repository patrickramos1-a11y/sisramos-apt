import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Trash2, Check, X, Calendar, CheckCircle2, Circle, XCircle } from "lucide-react";
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
  assignees?: string[];
}

interface ChecklistCardProps {
  semana: number;
  items: ChecklistItem[];
  canEdit: boolean;
  isLocked: boolean;
  currentUserId?: string;
  isGestorOrAdmin: boolean;
  profiles: Profile[];
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean; status: ChecklistStatus }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateAssignees: (itemId: string, userIds: string[]) => Promise<void>;
}

export default function ChecklistCard({
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
}: ChecklistCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditingText(item.texto);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    await onUpdateItem(editingId, { texto: editingText.trim() });
    setEditingId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const completedCount = items.filter((i) => i.status === "concluido" || i.concluido).length;
  const notDoneCount = items.filter((i) => i.status === "nao_realizado").length;
  const processedCount = completedCount + notDoneCount;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const canModify = canEdit && !isLocked;
  
  // Cycle through statuses
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
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "nao_realizado":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Different colors for each week
  const weekColors: Record<number, { bg: string; icon: string; badge: string }> = {
    1: { bg: "from-emerald-500/20 to-emerald-500/5", icon: "bg-emerald-500/30 text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
    2: { bg: "from-blue-500/20 to-blue-500/5", icon: "bg-blue-500/30 text-blue-700 dark:text-blue-400", badge: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
    3: { bg: "from-purple-500/20 to-purple-500/5", icon: "bg-purple-500/30 text-purple-700 dark:text-purple-400", badge: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
    4: { bg: "from-orange-500/20 to-orange-500/5", icon: "bg-orange-500/30 text-orange-700 dark:text-orange-400", badge: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
    5: { bg: "from-pink-500/20 to-pink-500/5", icon: "bg-pink-500/30 text-pink-700 dark:text-pink-400", badge: "bg-pink-500/20 text-pink-700 dark:text-pink-400" },
  };

  const weekColor = weekColors[semana] || weekColors[1];

  return (
    <Card className={cn(
      "w-full min-w-[280px] max-w-md h-full flex flex-col overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md",
      allCompleted && "ring-2 ring-primary/30 bg-primary/5"
    )}>
      {/* Header with gradient based on week */}
      <CardHeader className="p-0">
        <div className={cn(
          "px-4 py-3 bg-gradient-to-r",
          allCompleted 
            ? "from-primary/20 to-primary/10" 
            : weekColor.bg
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                allCompleted ? "bg-primary/20" : weekColor.icon
              )}>
                {allCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
              </div>
              <h3 className="font-semibold text-sm sm:text-base">
                {semana}ª Semana
              </h3>
            </div>
            {totalCount > 0 && (
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                allCompleted 
                  ? "bg-primary/20 text-primary" 
                  : weekColor.badge
              )}>
                {completedCount}/{totalCount}
              </span>
            )}
          </div>
          
          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-3">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-3">
        {/* Items list */}
        <div className="flex-1 space-y-1.5 mb-4 min-h-[120px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 bg-muted/50 rounded-full mb-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Nenhum item cadastrado
              </p>
            </div>
          ) : (
            items.map((item) => {
              const itemAssignees = item.assignees || [];
              const isAssignedToMe = currentUserId && itemAssignees.includes(currentUserId);
              const canCompleteItem = isGestorOrAdmin || isAssignedToMe || itemAssignees.length === 0;
              const assignedProfiles = profiles.filter((p) => itemAssignees.includes(p.user_id));
              
              const getInitials = (nome: string) => {
                const parts = nome.split(" ").filter(Boolean);
                if (parts.length === 0) return "?";
                if (parts.length === 1) return parts[0][0].toUpperCase();
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              };
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-start gap-2 p-2.5 rounded-lg border transition-all duration-150",
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
                    className="mt-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canCompleteItem || (isLocked && !canEdit)}
                  >
                    {getStatusIcon(item.status)}
                  </button>
                  {editingId === item.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="min-h-[60px] text-sm resize-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit();
                          }
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
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
                            "block text-xs sm:text-sm leading-relaxed break-words",
                            (item.status === "concluido" || item.concluido) && "line-through text-muted-foreground",
                            item.status === "nao_realizado" && "text-destructive"
                          )}
                        >
                          {item.texto}
                        </span>
                        {/* Assigned users display OR assignment popover */}
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
                                  className="h-5 w-5 border-2 border-background"
                                  style={{ backgroundColor: profile.cor || '#6B7280' }}
                                  title={profile.nome}
                                >
                                  <AvatarFallback 
                                    className="text-[8px] font-medium text-white bg-transparent"
                                    style={{ backgroundColor: profile.cor || '#6B7280' }}
                                  >
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
                            className="h-6 w-6"
                            onClick={() => handleStartEdit(item)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => onDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
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

        {isLocked && !canEdit && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Mês bloqueado para edição
          </p>
        )}
      </CardContent>
    </Card>
  );
}
