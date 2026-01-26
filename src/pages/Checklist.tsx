import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChecklist } from "@/hooks/useChecklist";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistCard from "@/components/checklist/ChecklistCard";
import ChecklistFilters, { ChecklistMultiFilters } from "@/components/checklist/ChecklistFilters";
import NovoItemChecklistDialog from "@/components/checklist/NovoItemChecklistDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEMANAS = [1, 2, 3, 4, 5];

export default function Checklist() {
  const { isGestorOrAdmin } = useAuth();
  const now = new Date();

  // Filters state - using multi-select arrays
  const [filters, setFilters] = useState<ChecklistMultiFilters>({
    meses: [String(now.getMonth() + 1)],
    anos: [String(now.getFullYear())],
    semanas: [],
    searchTerm: "",
  });

  // Convert string arrays to number arrays for the hook.
  // IMPORTANT: memoize to avoid recreating arrays on every render,
  // which would cause useChecklist() dependencies to change and refetch in a loop.
  const mesesNum = useMemo(() => filters.meses.map((m) => parseInt(m, 10)), [filters.meses]);
  const anosNum = useMemo(() => filters.anos.map((a) => parseInt(a, 10)), [filters.anos]);
  const semanasNum = useMemo(() => filters.semanas.map((s) => parseInt(s, 10)), [filters.semanas]);

  const { isLoading, getItemsByWeek, addItem, updateItem, deleteItem, rolloverToNextMonth, items } = useChecklist({
    meses: mesesNum,
    anos: anosNum,
    semanas: semanasNum,
    searchTerm: filters.searchTerm,
  });

  const { getMonthSetting, toggleMonthStatus } = useMonthSettings();

  // For rollover, we need to select a specific month/year
  const [rolloverMes, setRolloverMes] = useState(now.getMonth() + 1);
  const [rolloverAno, setRolloverAno] = useState(now.getFullYear());

  // Determine if viewing is for a single month (for lock status)
  const isSingleMonthView = filters.meses.length === 1 && filters.anos.length === 1;
  const viewedMes = isSingleMonthView ? parseInt(filters.meses[0]) : null;
  const viewedAno = isSingleMonthView ? parseInt(filters.anos[0]) : null;
  
  const monthSettings = viewedMes && viewedAno ? getMonthSetting(viewedMes, viewedAno) : null;

  // Determine if this is a past month (locked by default)
  const isCurrentMonth = viewedMes === now.getMonth() + 1 && viewedAno === now.getFullYear();
  const isPastMonth = viewedMes && viewedAno && (viewedAno < now.getFullYear() || (viewedAno === now.getFullYear() && viewedMes < now.getMonth() + 1));
  
  // Check if editing is locked
  const isLocked = isSingleMonthView && isPastMonth && !monthSettings?.status_ativo;

  // Which weeks to show based on filter
  const semanasToShow = semanasNum.length > 0 ? semanasNum : SEMANAS;

  // Calculate next month label for rollover
  const nextMonthLabel = useMemo(() => {
    let nextMes = rolloverMes + 1;
    let nextAno = rolloverAno;
    if (nextMes > 12) {
      nextMes = 1;
      nextAno = rolloverAno + 1;
    }
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${monthNames[nextMes - 1]}/${nextAno}`;
  }, [rolloverMes, rolloverAno]);

  // Items count for rollover from selected month
  const rolloverItemsCount = items.filter((i) => i.mes === rolloverMes && i.ano === rolloverAno).length;

  const handleToggleLock = () => {
    if (viewedMes && viewedAno) {
      toggleMonthStatus(viewedMes, viewedAno);
    }
  };

  // Handler for adding item from the global dialog
  const handleAddItemFromDialog = async (texto: string, semana: number, mes: number, ano: number) => {
    await addItem(semana, texto, mes, ano);
  };

  const handleClearFilters = () => {
    setFilters({
      meses: [String(now.getMonth() + 1)],
      anos: [String(now.getFullYear())],
      semanas: [],
      searchTerm: "",
    });
  };

  const currentYear = new Date().getFullYear();
  const anosOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const mesesOptions = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  // Group items by month/year for display when viewing multiple periods
  const groupedItems = useMemo(() => {
    const groups: { mes: number; ano: number; items: typeof items }[] = [];
    const seen = new Set<string>();
    
    items.forEach((item) => {
      const key = `${item.ano}-${item.mes}`;
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({
          mes: item.mes,
          ano: item.ano,
          items: items.filter((i) => i.mes === item.mes && i.ano === item.ano),
        });
      }
    });
    
    // Sort by year desc, then month desc
    groups.sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
    
    return groups;
  }, [items]);

  const isMultiPeriodView = !isSingleMonthView || groupedItems.length > 1;

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
              {/* Toggle lock for past months (only when viewing single month) */}
              {isSingleMonthView && isPastMonth && (
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

              {/* Add new item button */}
              <NovoItemChecklistDialog
                onAddItem={handleAddItemFromDialog}
                defaultMes={viewedMes ?? now.getMonth() + 1}
                defaultAno={viewedAno ?? now.getFullYear()}
                defaultSemana={1}
              />

              {/* Rollover button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copiar para próximo mês</span>
                    <span className="sm:hidden">Copiar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Copiar checklist para o próximo mês</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>Selecione o mês de origem para copiar os itens:</p>
                      <div className="flex gap-2">
                        <Select 
                          value={String(rolloverAno)} 
                          onValueChange={(v) => setRolloverAno(Number(v))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {anosOptions.map((a) => (
                              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={String(rolloverMes)} 
                          onValueChange={(v) => setRolloverMes(Number(v))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {mesesOptions.map((m) => (
                              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p>
                        Isso irá copiar {rolloverItemsCount > 0 ? `todos os ${rolloverItemsCount} itens` : "os itens"} do checklist 
                        de <strong>{mesesOptions.find(m => m.value === rolloverMes)?.label}/{rolloverAno}</strong> para{" "}
                        <strong>{nextMonthLabel}</strong>. Os itens serão copiados com status "não concluído".
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => rolloverToNextMonth(rolloverMes, rolloverAno)}
                      disabled={rolloverItemsCount === 0}
                    >
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

        {/* Lock indicator for past months (only when viewing single month) */}
        {isSingleMonthView && isPastMonth && (
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
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isMultiPeriodView ? (
          // Multi-period view: group by month/year
          <div className="space-y-8">
            {groupedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum item encontrado para os filtros selecionados.
              </div>
            ) : (
              groupedItems.map((group) => {
                const monthName = mesesOptions.find(m => m.value === group.mes)?.label || group.mes;
                const groupIsPast = group.ano < now.getFullYear() || (group.ano === now.getFullYear() && group.mes < now.getMonth() + 1);
                const groupSettings = getMonthSetting(group.mes, group.ano);
                const groupIsLocked = groupIsPast && !groupSettings?.status_ativo;

                return (
                  <div key={`${group.ano}-${group.mes}`} className="space-y-4">
                    <h2 className="text-lg font-semibold border-b pb-2">
                      {monthName} / {group.ano}
                      {groupIsLocked && (
                        <Lock className="inline-block ml-2 h-4 w-4 text-amber-600" />
                      )}
                    </h2>
                    <div className={`grid gap-4 ${
                      semanasToShow.length === 1 
                        ? "grid-cols-1 max-w-md mx-auto" 
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                    }`}>
                      {semanasToShow.map((sem) => (
                        <ChecklistCard
                          key={`${group.ano}-${group.mes}-${sem}`}
                          semana={sem}
                          items={getItemsByWeek(sem, group.mes, group.ano)}
                          canEdit={isGestorOrAdmin}
                          isLocked={groupIsLocked}
                          onUpdateItem={updateItem}
                          onDeleteItem={deleteItem}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // Single period view
          <div className={`grid gap-4 ${
            semanasToShow.length === 1 
              ? "grid-cols-1 max-w-md mx-auto" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          }`}>
            {semanasToShow.map((sem) => (
              <ChecklistCard
                key={sem}
                semana={sem}
                items={getItemsByWeek(sem, viewedMes ?? undefined, viewedAno ?? undefined)}
                canEdit={isGestorOrAdmin}
                isLocked={isLocked}
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
