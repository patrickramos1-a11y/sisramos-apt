import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChecklistV2, type TipoItem } from "@/hooks/useChecklistV2";
import { useChecklistTimer } from "@/hooks/useChecklistTimer";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistSummaryCard from "@/components/checklist/ChecklistSummaryCard";
import ChecklistWeekTable from "@/components/checklist/ChecklistWeekTable";
import NovoItemChecklistDialog from "@/components/checklist/NovoItemChecklistDialog";
import { Loader2, Info, Copy, Lock, Unlock, Filter, X, ChevronLeft, ChevronRight, CalendarDays, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cor?: string | null;
}

const SEMANAS = [1, 2, 3, 4, 5];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const SEMANAS_OPTIONS = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

export default function Checklist() {
  const { isGestorOrAdmin, user } = useAuth();
  const now = new Date();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [currentMes, setCurrentMes] = useState(now.getMonth() + 1);
  const [currentAno, setCurrentAno] = useState(now.getFullYear());
  const [weekFilter, setWeekFilter] = useState<string[]>([]);
  const [infoDismissed, setInfoDismissed] = useState(() => {
    return localStorage.getItem("checklist-info-dismissed") === "true";
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*");
      setProfiles((data as Profile[]) || []);
    };
    fetchProfiles();
  }, []);

  const {
    instances,
    isLoading,
    getInstancesByWeek,
    getWeekStats,
    updateInstanceStatus,
    updateInstance,
    deleteInstance,
    addItem,
    reorderItem,
    updateAssignees,
    rolloverToNextMonth,
    addSubItem,
    addQuickAvulso,
    deleteAllWeekInstances,
    deleteAllMonthInstances,
    refetch,
  } = useChecklistV2({ mes: currentMes, ano: currentAno });

  const { getMonthSetting, toggleMonthStatus } = useMonthSettings();

  const isCurrentMonth = currentMes === now.getMonth() + 1 && currentAno === now.getFullYear();
  const isPastMonth = currentAno < now.getFullYear() || (currentAno === now.getFullYear() && currentMes < now.getMonth() + 1);
  const monthSettings = getMonthSetting(currentMes, currentAno);
  const isLocked = isPastMonth && !monthSettings?.status_ativo;

  // Month navigation
  const goToPrevMonth = () => {
    setSelectedWeek(null);
    if (currentMes === 1) { setCurrentMes(12); setCurrentAno(currentAno - 1); }
    else setCurrentMes(currentMes - 1);
  };

  const goToNextMonth = () => {
    setSelectedWeek(null);
    if (currentMes === 12) { setCurrentMes(1); setCurrentAno(currentAno + 1); }
    else setCurrentMes(currentMes + 1);
  };

  const goToToday = () => {
    setSelectedWeek(null);
    setCurrentMes(now.getMonth() + 1);
    setCurrentAno(now.getFullYear());
  };

  const handleToggleLock = () => {
    toggleMonthStatus(currentMes, currentAno);
  };

  const handleAddItem = async (params: {
    descricao: string;
    tipo_item: TipoItem;
    semanas: number[];
    meses: number[];
    anos: number[];
    link?: string;
    assignees?: string[];
  }) => {
    await addItem(params);
  };

  const handleDismissInfo = () => {
    setInfoDismissed(true);
    localStorage.setItem("checklist-info-dismissed", "true");
  };

  // Week filter
  const semanasToShow = weekFilter.length > 0
    ? weekFilter.map((s) => parseInt(s))
    : SEMANAS;

  // Week stats
  const weekStats = useMemo(() => {
    const stats: Record<number, { total: number; completed: number; notDone: number }> = {};
    semanasToShow.forEach((sem) => {
      stats[sem] = getWeekStats(sem);
    });
    return stats;
  }, [semanasToShow, getWeekStats, instances]);

  // Rollover
  const rolloverItemsCount = instances.filter((i) => i.tipo_item === "recorrente" && !i.parent_id).length;
  const nextMonthLabel = useMemo(() => {
    let nm = currentMes;
    let na = currentAno;
    if (nm === 12) { nm = 1; na++; } else nm++;
    return `${MONTH_SHORT[nm - 1]}/${na}`;
  }, [currentMes, currentAno]);

  // Selected week items
  const selectedWeekItems = selectedWeek ? getInstancesByWeek(selectedWeek) : [];

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-3">
        {/* Compact Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-tight">Checklist</h1>

            {/* Info popover */}
            {!infoDismissed && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Como funciona</p>
                    <p className="text-xs text-muted-foreground">
                      Esta área contém o checklist padrão a ser cumprido antes de iniciar um momento APT.
                      Itens recorrentes aparecem em todas as semanas. Itens avulsos existem apenas na semana selecionada.
                    </p>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={handleDismissInfo}>
                      Não mostrar novamente
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            </div>

            {/* Month navigation - always visible */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[32px]" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium px-1.5 sm:px-2 min-w-[100px] sm:min-w-[120px] text-center">
                {MONTH_NAMES[currentMes - 1]} {currentAno}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[32px]" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!isCurrentMonth && (
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={goToToday}>
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hoje</span>
              </Button>
            )}
          </div>

          {/* Second row: week filter + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Week filter */}
            <div className="w-[130px]">
              <MultiSelectDropdown
                options={SEMANAS_OPTIONS}
                selected={weekFilter}
                onChange={setWeekFilter}
                placeholder="Semanas"
              />
            </div>

            {/* Lock toggle */}
            {isGestorOrAdmin && isPastMonth && (
              <Button
                variant={isLocked ? "outline" : "secondary"}
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={handleToggleLock}
              >
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isLocked ? "Desbloquear" : "Bloquear"}</span>
              </Button>
            )}

            {isGestorOrAdmin && (
              <>
                <NovoItemChecklistDialog
                  onAddItem={handleAddItem}
                  defaultMes={currentMes}
                  defaultAno={currentAno}
                  defaultSemana={selectedWeek || 1}
                />

                {/* Rollover */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copiar mês</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Copiar checklist para {nextMonthLabel}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Serão copiados apenas os <strong>{rolloverItemsCount} itens recorrentes</strong> de {MONTH_NAMES[currentMes - 1]}/{currentAno} para {nextMonthLabel}. Itens avulsos não serão copiados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => rolloverToNextMonth(currentMes, currentAno)}
                        disabled={rolloverItemsCount === 0}
                      >
                        Confirmar cópia
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete all month */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Apagar mês</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar todos os itens de {MONTH_NAMES[currentMes - 1]}/{currentAno}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação removerá <strong>todos os itens de todas as semanas</strong> deste mês permanentemente. Isso não pode ser desfeito.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          deleteAllMonthInstances();
                          setSelectedWeek(null);
                        }}
                        disabled={instances.length === 0}
                      >
                        Apagar tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Lock indicator (compact) */}
        {isPastMonth && (
          <Alert variant={isLocked ? "default" : "destructive"} className={isLocked ? "bg-amber-500/10 border-amber-500/30 py-2" : "py-2"}>
            {isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                  Mês <strong>bloqueado</strong> para edição.
                </AlertDescription>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  Mês <strong>desbloqueado</strong> temporariamente.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {semanasToShow.map((sem) => (
                <ChecklistSummaryCard
                  key={sem}
                  semana={sem}
                  totalItems={weekStats[sem]?.total || 0}
                  completedItems={weekStats[sem]?.completed || 0}
                  notDoneItems={weekStats[sem]?.notDone || 0}
                  onClick={() => setSelectedWeek(selectedWeek === sem ? null : sem)}
                  isSelected={selectedWeek === sem}
                />
              ))}
            </div>

            {/* Inline Week Table (expansion below cards) */}
            {selectedWeek && (
              <ChecklistWeekTable
                semana={selectedWeek}
                items={selectedWeekItems}
                canModify={isGestorOrAdmin && !isLocked}
                isLocked={isLocked ?? false}
                currentUserId={user?.id}
                isGestorOrAdmin={isGestorOrAdmin}
                profiles={profiles}
                onUpdateStatus={updateInstanceStatus}
                onUpdateInstance={updateInstance}
                onDeleteInstance={deleteInstance}
                onUpdateAssignees={updateAssignees}
                onReorder={reorderItem}
                onClose={() => setSelectedWeek(null)}
                onAddSubItem={addSubItem}
                onAddQuickAvulso={addQuickAvulso}
                onDeleteAllWeek={async (semana) => {
                  await deleteAllWeekInstances(semana);
                  setSelectedWeek(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
