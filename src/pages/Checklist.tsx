import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChecklist } from "@/hooks/useChecklist";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistCard from "@/components/checklist/ChecklistCard";
import ChecklistFilters from "@/components/checklist/ChecklistFilters";
import { Loader2, Info, Copy, Lock, Unlock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SEMANAS = [1, 2, 3, 4, 5];

export default function Checklist() {
  const { isGestorOrAdmin } = useAuth();
  const now = new Date();

  // Filters state
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [semana, setSemana] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { isLoading, getItemsByWeek, addItem, updateItem, deleteItem, rolloverToNextMonth, items } = useChecklist({
    mes,
    ano,
    semana,
    searchTerm,
  });

  const { getMonthSetting, toggleMonthStatus } = useMonthSettings();
  const monthSettings = getMonthSetting(mes, ano);

  // Determine if this is a past month (locked by default)
  const isCurrentMonth = mes === now.getMonth() + 1 && ano === now.getFullYear();
  const isPastMonth = ano < now.getFullYear() || (ano === now.getFullYear() && mes < now.getMonth() + 1);
  
  // Check if editing is locked
  const isLocked = isPastMonth && !monthSettings?.status_ativo;

  // Which weeks to show based on filter
  const semanasToShow = semana ? [semana] : SEMANAS;

  // Calculate next month label
  const nextMonth = useMemo(() => {
    let nextMes = mes + 1;
    let nextAno = ano;
    if (nextMes > 12) {
      nextMes = 1;
      nextAno = ano + 1;
    }
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${monthNames[nextMes - 1]}/${nextAno}`;
  }, [mes, ano]);

  const handleToggleLock = () => {
    toggleMonthStatus(mes, ano);
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Checklist Semanal</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Acompanhe as tarefas de cada semana do mês
            </p>
          </div>

          {isGestorOrAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle lock for past months */}
              {isPastMonth && (
                <Button
                  variant={isLocked ? "outline" : "secondary"}
                  size="sm"
                  onClick={handleToggleLock}
                  className="gap-2"
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-4 w-4" />
                      <span className="hidden sm:inline">Desbloquear Mês</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span className="hidden sm:inline">Bloquear Mês</span>
                    </>
                  )}
                </Button>
              )}

              {/* Rollover button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copiar para {nextMonth}</span>
                    <span className="sm:hidden">Copiar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Copiar checklist para o próximo mês?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá copiar todos os {items.length} itens do checklist atual para{" "}
                      <strong>{nextMonth}</strong>. Os itens serão copiados com status "não concluído".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={rolloverToNextMonth}>
                      Confirmar cópia
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Observation alert */}
        <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Observação:</strong> Esta área contém o checklist padrão a ser cumprido antes de iniciar um momento APT. 
            O admin ou gestor deve entregar ou receber estes itens dos colaboradores.
          </AlertDescription>
        </Alert>

        {/* Lock indicator for past months */}
        {isPastMonth && (
          <Alert variant={isLocked ? "default" : "destructive"} className={isLocked ? "bg-amber-500/10 border-amber-500/30" : ""}>
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                  Este mês está <strong>bloqueado</strong> para edição. Apenas a visualização e marcação de itens estão disponíveis.
                </AlertDescription>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Este mês está <strong>desbloqueado</strong> temporariamente para edição.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Filters */}
        <ChecklistFilters
          mes={mes}
          ano={ano}
          semana={semana}
          searchTerm={searchTerm}
          onMesChange={setMes}
          onAnoChange={setAno}
          onSemanaChange={setSemana}
          onSearchChange={setSearchTerm}
        />

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className={`grid gap-4 ${
            semanasToShow.length === 1 
              ? "grid-cols-1 max-w-md mx-auto" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          }`}>
            {semanasToShow.map((sem) => (
              <ChecklistCard
                key={sem}
                semana={sem}
                items={getItemsByWeek(sem)}
                canEdit={isGestorOrAdmin}
                isLocked={isLocked}
                onAddItem={(texto) => addItem(sem, texto)}
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
