import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2, Check, X, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

interface ChecklistCardProps {
  semana: number;
  items: ChecklistItem[];
  canEdit: boolean;
  isLocked: boolean;
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export default function ChecklistCard({
  semana,
  items,
  canEdit,
  isLocked,
  onUpdateItem,
  onDeleteItem,
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

  const completedCount = items.filter((i) => i.concluido).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const canModify = canEdit && !isLocked;

  return (
    <Card className={cn(
      "h-full flex flex-col overflow-hidden transition-all duration-200",
      allCompleted && "ring-2 ring-primary/30 bg-primary/5"
    )}>
      {/* Header with gradient */}
      <CardHeader className="p-0">
        <div className={cn(
          "px-4 py-3 bg-gradient-to-r",
          allCompleted 
            ? "from-primary/20 to-primary/10" 
            : "from-muted to-muted/50"
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                allCompleted ? "bg-primary/20" : "bg-background/80"
              )}>
                {allCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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
                  : "bg-background/80 text-muted-foreground"
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
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-150",
                  item.concluido 
                    ? "bg-muted/30 border-muted" 
                    : "border-transparent hover:bg-muted/20 hover:border-border"
                )}
              >
                <Checkbox
                  checked={item.concluido}
                  onCheckedChange={(checked) =>
                    onUpdateItem(item.id, { concluido: !!checked })
                  }
                  className="mt-0.5 shrink-0"
                  disabled={isLocked && !canEdit}
                />
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
                    <span
                      className={cn(
                        "flex-1 text-xs sm:text-sm leading-relaxed break-words",
                        item.concluido && "line-through text-muted-foreground"
                      )}
                    >
                      {item.texto}
                    </span>
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
            ))
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
