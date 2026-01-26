import { useAuth } from "@/contexts/AuthContext";
import { useChecklist } from "@/hooks/useChecklist";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistCard from "@/components/checklist/ChecklistCard";
import { Loader2 } from "lucide-react";

const SEMANAS = [1, 2, 3, 4, 5];

export default function Checklist() {
  const { isGestorOrAdmin } = useAuth();
  const { isLoading, getItemsByWeek, addItem, updateItem, deleteItem } = useChecklist();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist Semanal</h1>
          <p className="text-muted-foreground">
            Acompanhe as tarefas de cada semana do mês
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SEMANAS.map((semana) => (
              <ChecklistCard
                key={semana}
                semana={semana}
                items={getItemsByWeek(semana)}
                canEdit={isGestorOrAdmin}
                onAddItem={(texto) => addItem(semana, texto)}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
