import { useAuth } from "@/contexts/AuthContext";
import { useChecklist } from "@/hooks/useChecklist";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistCard from "@/components/checklist/ChecklistCard";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SEMANAS = [1, 2, 3, 4, 5];

export default function Checklist() {
  const { isGestorOrAdmin } = useAuth();
  const { isLoading, getItemsByWeek, addItem, updateItem, deleteItem } = useChecklist();

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Checklist Semanal</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe as tarefas de cada semana do mês
          </p>
        </div>

        <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Observação:</strong> Esta área contém o checklist padrão a ser cumprido antes de iniciar um momento APT. 
            O admin ou gestor deve entregar ou receber estes itens dos colaboradores.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
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
