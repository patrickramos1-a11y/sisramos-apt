import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
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
  onAddItem: (texto: string) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<{ texto: string; concluido: boolean }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export default function ChecklistCard({
  semana,
  items,
  canEdit,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: ChecklistCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    await onAddItem(newItemText.trim());
    setNewItemText("");
    setIsAdding(false);
  };

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

  return (
    <Card className="h-full flex flex-col min-h-[280px]">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold">
            {semana}ª Semana
          </CardTitle>
          {totalCount > 0 && (
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        {/* Items list */}
        <div className="flex-1 space-y-2 mb-4">
          {items.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">
              Nenhum item cadastrado
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-lg border border-transparent transition-colors",
                  item.concluido ? "bg-muted/50" : "hover:bg-muted/30 hover:border-border"
                )}
              >
                <Checkbox
                  checked={item.concluido}
                  onCheckedChange={(checked) =>
                    onUpdateItem(item.id, { concluido: !!checked })
                  }
                  className="mt-0.5 shrink-0"
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
                        className="h-8 px-2"
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-4 w-4 text-primary mr-1" />
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 text-muted-foreground mr-1" />
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
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
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
            ))
          )}
        </div>

        {/* Add new item */}
        {canEdit && (
          <>
            {isAdding ? (
              <div className="space-y-2 border-t pt-4">
                <Textarea
                  placeholder="Digite o item do checklist..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddItem();
                    }
                    if (e.key === "Escape") {
                      setIsAdding(false);
                      setNewItemText("");
                    }
                  }}
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      setIsAdding(false);
                      setNewItemText("");
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 mt-auto"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar item
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
