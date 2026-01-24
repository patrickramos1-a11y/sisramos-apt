import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

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
                  Limpar tudo
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
        <ScrollArea className="max-h-80">
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                {selectionMode && (
                  <Checkbox
                    checked={selectedIds.has(notification.id)}
                    onCheckedChange={() => toggleSelection(notification.id)}
                    className="mt-0.5"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{notification.mensagem}</p>
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
                    onClick={() => onDismiss(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
