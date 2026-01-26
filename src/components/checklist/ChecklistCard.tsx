import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {semana}ª Semana
          </CardTitle>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Items list */}
        <div className="flex-1 space-y-2 mb-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item cadastrado
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md transition-colors",
                  item.concluido && "bg-muted/50"
                )}
              >
                <Checkbox
                  checked={item.concluido}
                  onCheckedChange={(checked) =>
                    onUpdateItem(item.id, { concluido: !!checked })
                  }
                  className="mt-0.5"
                />
                {editingId === item.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={handleSaveEdit}
                    >
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      className={cn(
                        "flex-1 text-sm leading-relaxed",
                        item.concluido && "line-through text-muted-foreground"
                      )}
                    >
                      {item.texto}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Novo item..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem();
                    if (e.key === "Escape") {
                      setIsAdding(false);
                      setNewItemText("");
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  onClick={handleAddItem}
                >
                  <Check className="h-4 w-4 text-primary" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    setIsAdding(false);
                    setNewItemText("");
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
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
