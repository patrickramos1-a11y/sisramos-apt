import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Trash2, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  tipo: string;
  mensagem: string;
  responsavel_id: string;
  gestor_id: string;
  gestor_nome: string;
  semana: number;
  mes: number;
  ano: number;
  created_at: string;
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  isRead: (id: string) => boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onDismissSelected: (ids: string[]) => void;
  onClose: () => void;
}

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function NotificationList({
  notifications,
  isLoading,
  isRead,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onDismissAll,
  onDismissSelected,
  onClose,
}: NotificationListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleDismissSelected = () => {
    onDismissSelected(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const unreadCount = notifications.filter((n) => !isRead(n.id)).length;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Carregando notificações...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Notificações</h3>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <>
              {!selectionMode && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs gap-1"
                  onClick={onMarkAllAsRead}
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-3 w-3" />
                  Lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setSelectionMode(!selectionMode)}
              >
                {selectionMode ? "Cancelar" : "Selecionar"}
              </Button>
              {!selectionMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={onDismissAll}
                >
                  Limpar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Selection actions */}
      {selectionMode && notifications.length > 0 && (
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === notifications.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selecionada(s)
            </span>
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={handleDismissSelected}
            >
              <Trash2 className="h-3 w-3" />
              Excluir
            </Button>
          )}
        </div>
      )}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      ) : (
        <ScrollArea className="h-[350px]">
          <div className="divide-y pr-3">
            {notifications.map((notification) => {
              const read = isRead(notification.id);
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                    read 
                      ? "bg-muted/30 opacity-60" 
                      : "hover:bg-muted/50 bg-background"
                  )}
                  onClick={() => !selectionMode && onMarkAsRead(notification.id)}
                >
                  {selectionMode && (
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={() => toggleSelection(notification.id)}
                      className="mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Indicador de não lida */}
                  {!selectionMode && !read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  {!selectionMode && read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      read ? "text-muted-foreground" : "text-foreground font-medium"
                    )}>
                      {notification.mensagem}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Semana {notification.semana} • {MESES[notification.mes]}/{notification.ano}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  
                  {!selectionMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(notification.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
