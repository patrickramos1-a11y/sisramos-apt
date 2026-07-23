import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChecklistV2, type TipoItem } from "@/hooks/useChecklistV2";
import { useChecklistTimer } from "@/hooks/useChecklistTimer";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { useAptContext } from "@/hooks/useAptContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistSummaryCard from "@/components/checklist/ChecklistSummaryCard";
import ChecklistTimer from "@/components/checklist/ChecklistTimer";
import ChecklistTimerHistory from "@/components/checklist/ChecklistTimerHistory";
import ChecklistWeekTable from "@/components/checklist/ChecklistWeekTable";
import ChecklistMonthlyAvulsos from "@/components/checklist/ChecklistMonthlyAvulsos";
import NovoItemChecklistDialog from "@/components/checklist/NovoItemChecklistDialog";
import MergeWeeksDialog from "@/components/checklist/MergeWeeksDialog";
import { Loader2, Info, Copy, Lock, Unlock, ChevronLeft, ChevronRight, CalendarDays, Trash2, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isChecklistStatusFinal } from "@/lib/checklist-status";

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

type ChecklistDisplayCard =
  | { type: "single"; semana: number; momentoNumero?: number; isActiveMoment?: boolean }
  | { type: "merged"; semanas: number[]; momentoNumero?: number; isActiveMoment?: boolean };

function getMergeKey(mes: number, ano: number) {
  return `checklist-merged-weeks-${ano}-${mes}`;
}

export default function Checklist() {
  const { isGestorOrAdmin, user } = useAuth();
  const now = new Date();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedMomentWeeks, setSelectedMomentWeeks] = useState<number[]>([]);
  const selectionContextRef = useRef("");
  const [currentMes, setCurrentMes] = useState(now.getMonth() + 1);
  const [currentAno, setCurrentAno] = useState(now.getFullYear());
  const [weekFilter, setWeekFilter] = useState<string[]>([]);
  const [infoDismissed, setInfoDismissed] = useState(() => {
    return localStorage.getItem("checklist-info-dismissed") === "true";
  });

  // Merged weeks state
  const [mergedWeeks, setMergedWeeks] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(getMergeKey(now.getMonth() + 1, now.getFullYear()));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Update mergedWeeks when month changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getMergeKey(currentMes, currentAno));
      setMergedWeeks(stored ? JSON.parse(stored) : []);
    } catch { setMergedWeeks([]); }
  }, [currentMes, currentAno]);

  const handleMerge = useCallback((weeks: number[]) => {
    setMergedWeeks(weeks);
    localStorage.setItem(getMergeKey(currentMes, currentAno), JSON.stringify(weeks));
  }, [currentMes, currentAno]);

  const currentWeek = Math.min(5, Math.ceil(now.getDate() / 7));
  const {
    config: aptMomentosConfig,
    activeMomentWeeks: aptMomentWeeks,
  } = useAptContext({
    mes: currentMes,
    ano: currentAno,
    currentWeek,
  });

  const isUsingAptMoment = Boolean(aptMomentosConfig?.momento_ativo && aptMomentWeeks.length > 0);
  const selectedEffectiveWeeks = isUsingAptMoment && selectedMomentWeeks.length > 0 ? selectedMomentWeeks : aptMomentWeeks;
  const effectiveMergedWeeks = isUsingAptMoment ? selectedEffectiveWeeks : mergedWeeks;

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*");
      setProfiles((data as Profile[]) || []);
    };
    fetchProfiles();
  }, []);

  const {
    instances,
    monthlyAvulsos,
    isLoading,
    getInstancesByWeek,
    getWeekStats,
    updateInstanceStatus,
    updateInstance,
    deleteInstance,
    addItem,
    reorderItem,
    reorderSubItem,
    updateAssignees,
    rolloverToNextMonth,
    addSubItem,
    addQuickAvulso,
    deleteAllWeekInstances,
    deleteAllMonthInstances,
    refetch,
  } = useChecklistV2({ mes: currentMes, ano: currentAno });

  const handleUnmerge = useCallback(async () => {
    if (mergedWeeks.length >= 2) {
      const itemsByWeek: Record<number, ReturnType<typeof getInstancesByWeek>> = {};
      mergedWeeks.forEach((sem) => {
        itemsByWeek[sem] = getInstancesByWeek(sem)
          .filter((i) => !i.parent_id)
          .sort((a, b) => a.ordem - b.ordem);
      });
      const maxLen = Math.max(...Object.values(itemsByWeek).map((arr) => arr.length));
      const interleaved: Array<{ id: string; semana: number }> = [];
      for (let pos = 0; pos < maxLen; pos++) {
        mergedWeeks.forEach((sem) => {
          const item = itemsByWeek[sem]?.[pos];
          if (item) interleaved.push({ id: item.id, semana: item.semana });
        });
      }
      const weekCounters: Record<number, number> = {};
      const updates: Array<{ id: string; ordem: number }> = [];
      interleaved.forEach(({ id, semana }) => {
        if (!weekCounters[semana]) weekCounters[semana] = 0;
        updates.push({ id, ordem: weekCounters[semana]++ });
      });
      await Promise.all(
        updates.map((u) =>
          supabase.from("checklist_instances").update({ ordem_override: u.ordem }).eq("id", u.id)
        )
      );
    }
    setMergedWeeks([]);
    localStorage.removeItem(getMergeKey(currentMes, currentAno));
    setSelectedWeek(null);
    refetch();
  }, [currentMes, currentAno, mergedWeeks, getInstancesByWeek, refetch]);

  const { getMonthSetting, toggleMonthStatus } = useMonthSettings();
  const {
    isRunning: timerIsRunning,
    isPaused: timerIsPaused,
    isActive: timerIsActive,
    activeWeek: timerActiveWeek,
    elapsedSeconds,
    weekDurations,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useChecklistTimer({ mes: currentMes, ano: currentAno });

  const isCurrentMonth = currentMes === now.getMonth() + 1 && currentAno === now.getFullYear();
  const isPastMonth = currentAno < now.getFullYear() || (currentAno === now.getFullYear() && currentMes < now.getMonth() + 1);
  const monthSettings = getMonthSetting(currentMes, currentAno);
  const isLocked = isPastMonth && !monthSettings?.status_ativo;

  // Auto-unmerge: when all items in merged weeks are processed
  useEffect(() => {
    if (isUsingAptMoment) return;
    if (mergedWeeks.length < 2) return;
    const allMergedItems = mergedWeeks.flatMap((sem) => getInstancesByWeek(sem));
    const totalItems = allMergedItems.filter((i) => !i.parent_id).length;
    const processedItems = allMergedItems.filter((i) => !i.parent_id && isChecklistStatusFinal(i.status)).length;
    if (totalItems > 0 && processedItems === totalItems) {
      handleUnmerge();
    }
  }, [isUsingAptMoment, mergedWeeks, instances, getInstancesByWeek, handleUnmerge]);

  const aptMomentWeeksKey = aptMomentWeeks.join(",");

  useEffect(() => {
    const contextKey = `${currentAno}-${currentMes}-${aptMomentosConfig?.momento_ativo ?? "none"}-${aptMomentWeeksKey}`;
    if (selectionContextRef.current === contextKey) return;
    selectionContextRef.current = contextKey;

    if (isUsingAptMoment && aptMomentWeeks.length > 0) {
      setSelectedMomentWeeks(aptMomentWeeks);
      setSelectedWeek(aptMomentWeeks[0]);
      return;
    }

    setSelectedMomentWeeks([]);
    setSelectedWeek(null);
  }, [
    aptMomentWeeks,
    aptMomentWeeksKey,
    aptMomentosConfig?.momento_ativo,
    currentAno,
    currentMes,
    isUsingAptMoment,
  ]);

  // Month navigation
  const goToPrevMonth = () => {
    setSelectedWeek(null);
    setSelectedMomentWeeks([]);
    if (currentMes === 1) { setCurrentMes(12); setCurrentAno(currentAno - 1); }
    else setCurrentMes(currentMes - 1);
  };

  const goToNextMonth = () => {
    setSelectedWeek(null);
    setSelectedMomentWeeks([]);
    if (currentMes === 12) { setCurrentMes(1); setCurrentAno(currentAno + 1); }
    else setCurrentMes(currentMes + 1);
  };

  const goToToday = () => {
    setSelectedWeek(null);
    setSelectedMomentWeeks([]);
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
    prioridade?: string;
  }) => {
    await addItem(params as any);
  };

  const handleDismissInfo = () => {
    setInfoDismissed(true);
    localStorage.setItem("checklist-info-dismissed", "true");
  };

  const aptMomentCards = useMemo<ChecklistDisplayCard[]>(() => {
    if (!aptMomentosConfig) return [];

    return aptMomentosConfig.momentos
      .map((momento) => {
        const semanas = [...new Set(momento.semanas)]
          .filter((week) => week >= 1 && week <= 5)
          .sort((a, b) => a - b);

        if (semanas.length === 0) return null;

        const base = {
          momentoNumero: momento.numero,
          isActiveMoment: momento.numero === aptMomentosConfig.momento_ativo,
        };

        if (semanas.length >= 2) {
          return { ...base, type: "merged" as const, semanas };
        }

        return { ...base, type: "single" as const, semana: semanas[0] };
      })
      .filter(Boolean) as ChecklistDisplayCard[];
  }, [aptMomentosConfig]);

  const checklistMomentOptions = useMemo(() => {
    return aptMomentCards.map((card, index) => {
      const semanas = card.type === "merged" ? card.semanas : [card.semana];
      const label = card.momentoNumero ? `Momento ${card.momentoNumero}` : `Momento ${index + 1}`;
      const description =
        semanas.length > 1
          ? `Semanas ${semanas.map((week) => `${week}ª`).join(" + ")}`
          : `${semanas[0]}ª semana`;

      return {
        id: card.momentoNumero ? `momento-${card.momentoNumero}` : `semanas-${semanas.join("-")}`,
        label,
        description,
        semanas,
        isActive: card.isActiveMoment,
      };
    });
  }, [aptMomentCards]);

  const defaultNovoItemSemanas = useMemo(() => {
    if (isUsingAptMoment && selectedMomentWeeks.length > 0) return selectedMomentWeeks;
    if (selectedWeek) return [selectedWeek];
    if (isUsingAptMoment && aptMomentWeeks.length > 0) return aptMomentWeeks;
    return [1];
  }, [aptMomentWeeks, isUsingAptMoment, selectedMomentWeeks, selectedWeek]);

  // Week filter
  const semanasToShow = weekFilter.length > 0 ? weekFilter.map((s) => parseInt(s)) : SEMANAS;

  // Week stats
  const weekStats = useMemo(() => {
    const stats: Record<number, ReturnType<typeof getWeekStats>> = {};
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

  // Determine what weeks are merged vs individual for display
  const isMergedWeek = (sem: number) => effectiveMergedWeeks.includes(sem);

  // Build display cards: merged weeks become one card, others remain individual
  const displayCards = useMemo(() => {
    if (isUsingAptMoment && weekFilter.length === 0 && aptMomentCards.length > 0) {
      return aptMomentCards;
    }

    const cards: ChecklistDisplayCard[] = [];
    const mergedSet = new Set(effectiveMergedWeeks);
    let mergedCardAdded = false;

    semanasToShow.forEach((sem) => {
      if (mergedSet.has(sem)) {
        if (!mergedCardAdded) {
          // Only add merged card once, with semanas that are in semanasToShow
          const visibleMerged = effectiveMergedWeeks.filter((w) => semanasToShow.includes(w));
          if (visibleMerged.length >= 2) {
            cards.push({ type: "merged", semanas: visibleMerged });
          } else if (visibleMerged.length === 1) {
            cards.push({ type: "single", semana: visibleMerged[0] });
          }
          mergedCardAdded = true;
        }
      } else {
        cards.push({ type: "single", semana: sem });
      }
    });
    return cards;
  }, [aptMomentCards, effectiveMergedWeeks, isUsingAptMoment, semanasToShow, weekFilter.length]);

  // Merged stats
  const getMergedStats = (semanas: number[]) => {
    let total = 0;
    let completed = 0;
    let notDone = 0;
    let notRelevant = 0;
    let couldNot = 0;
    semanas.forEach((sem) => {
      const s = getWeekStats(sem);
      total += s.total;
      completed += s.completed;
      notDone += s.notDone;
      notRelevant += s.notRelevant;
      couldNot += s.couldNot;
    });
    return { total, completed, notDone, notRelevant, couldNot };
  };

  const getMergedDuration = (semanas: number[]) => {
    // For merged weeks, show the max duration (they share the same timer)
    let maxDur = 0;
    semanas.forEach((sem) => {
      if (weekDurations[sem] && weekDurations[sem] > maxDur) maxDur = weekDurations[sem];
    });
    return maxDur || null;
  };

  // Build duplicate map for merged view: descricao → [ids across weeks]
  const { deduplicatedItems, duplicateMap } = useMemo(() => {
    const emptyResult = { deduplicatedItems: [] as ReturnType<typeof getInstancesByWeek>, duplicateMap: new Map<string, { ids: string[]; semanas: number[] }>() };
    if (!selectedWeek || !effectiveMergedWeeks.includes(selectedWeek) || effectiveMergedWeeks.length < 2) {
      return emptyResult;
    }

    // Get items per week sorted by ordem
    const itemsByWeek: Record<number, ReturnType<typeof getInstancesByWeek>> = {};
    effectiveMergedWeeks.forEach((sem) => {
      itemsByWeek[sem] = getInstancesByWeek(sem)
        .filter((i) => !i.parent_id)
        .sort((a, b) => a.ordem - b.ordem);
    });

    // Interleave by position (round-robin)
    const maxLen = Math.max(...Object.values(itemsByWeek).map((arr) => arr.length));
    const interleaved: ReturnType<typeof getInstancesByWeek> = [];
    for (let pos = 0; pos < maxLen; pos++) {
      effectiveMergedWeeks.forEach((sem) => {
        const item = itemsByWeek[sem]?.[pos];
        if (item) interleaved.push(item);
      });
    }

    // Recurring tasks keep the same template identity even after their text changes.
    const dupMap = new Map<string, { ids: string[]; semanas: number[] }>();
    const seen = new Map<string, string>();
    const deduped: typeof interleaved = [];

    interleaved.forEach((item) => {
      const key = item.template_id ? `template:${item.template_id}` : `instance:${item.id}`;
      if (seen.has(key)) {
        // This is a duplicate — add its ID and semana to the existing entry
        const repId = seen.get(key)!;
        const entry = dupMap.get(repId)!;
        entry.ids.push(item.id);
        if (!entry.semanas.includes(item.semana)) entry.semanas.push(item.semana);
      } else {
        // First occurrence — this is the representative
        seen.set(key, item.id);
        dupMap.set(item.id, { ids: [item.id], semanas: [item.semana] });
        deduped.push(item);
      }
    });

    // Also collect sub-items (children) for all items — append children from duplicates
    // Children are already nested inside each instance, no dedup needed for them

    return { deduplicatedItems: deduped, duplicateMap: dupMap };
  }, [selectedWeek, effectiveMergedWeeks, getInstancesByWeek, instances]);

  // Selected week items — support merged with dedup + interleave
  const selectedWeekItems = useMemo(() => {
    if (!selectedWeek) return [];
    if (effectiveMergedWeeks.includes(selectedWeek) && effectiveMergedWeeks.length >= 2) {
      return deduplicatedItems;
    }
    return getInstancesByWeek(selectedWeek);
  }, [selectedWeek, effectiveMergedWeeks, getInstancesByWeek, instances, deduplicatedItems]);

  // Wrapper for status update that propagates to all duplicates
  const handleUpdateStatus = useCallback(async (id: string, status: any) => {
    if (effectiveMergedWeeks.length >= 2 && duplicateMap.has(id)) {
      const entry = duplicateMap.get(id)!;
      for (const dupId of entry.ids) {
        await updateInstanceStatus(dupId, status);
      }
    } else {
      await updateInstanceStatus(id, status);
    }
  }, [effectiveMergedWeeks, duplicateMap, updateInstanceStatus]);

  // For the table, determine the semanas to pass
  const tableWeeks = useMemo(() => {
    if (!selectedWeek) return [];
    if (effectiveMergedWeeks.includes(selectedWeek) && effectiveMergedWeeks.length >= 2) {
      return effectiveMergedWeeks;
    }
    return [selectedWeek];
  }, [selectedWeek, effectiveMergedWeeks]);

  // Timer: when starting for merged weeks, pass mergedWeeks
  const handleStartTimer = (semana: number) => {
    if (effectiveMergedWeeks.length >= 2 && effectiveMergedWeeks.includes(semana)) {
      startTimer(effectiveMergedWeeks[0], effectiveMergedWeeks);
    } else {
      startTimer(semana);
    }
  };

  // Timer: when stopping, pass mergedWeeks so duplicates are created
  const handleStopTimer = () => {
    if (effectiveMergedWeeks.length >= 2 && timerActiveWeek && effectiveMergedWeeks.includes(timerActiveWeek)) {
      stopTimer(effectiveMergedWeeks);
    } else {
      stopTimer();
    }
  };

  return (
    <AppLayout>
      <div className="p-2 md:p-4 lg:p-6 max-w-[1400px] mx-auto space-y-3">
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

          {/* Second row: week filter + actions - wrap on mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Week filter */}
            <div className="w-[120px] sm:w-[130px]">
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
                  defaultSemana={defaultNovoItemSemanas[0] || 1}
                  defaultSemanas={defaultNovoItemSemanas}
                  momentOptions={checklistMomentOptions}
                />

                {/* Desktop: all actions visible */}
                <div className="hidden sm:contents">
                  {!isUsingAptMoment && (
                    <MergeWeeksDialog
                      currentMerged={mergedWeeks}
                      onMerge={handleMerge}
                      onUnmerge={handleUnmerge}
                    />
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                        <Copy className="h-3.5 w-3.5" />
                        Copiar mês
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

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                        Apagar mês
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

                  <ChecklistTimerHistory />
                </div>

                {/* Mobile: grouped actions in dropdown */}
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs min-w-[44px]">
                        <MoreHorizontal className="h-4 w-4" />
                        Mais
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        {!isUsingAptMoment ? (
                          <MergeWeeksDialog
                            currentMerged={mergedWeeks}
                            onMerge={handleMerge}
                            onUnmerge={handleUnmerge}
                          />
                        ) : (
                          <span className="px-2 py-1.5 text-xs text-muted-foreground">
                            Semanas definidas pelo Momento APT
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => rolloverToNextMonth(currentMes, currentAno)}
                        disabled={rolloverItemsCount === 0}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar mês
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          deleteAllMonthInstances();
                          setSelectedWeek(null);
                        }}
                        disabled={instances.length === 0}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Apagar mês
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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

        {isUsingAptMoment && (
          <Alert className="border-primary/25 bg-primary/5 py-2">
            <Info className="h-3.5 w-3.5 text-primary" />
            <AlertDescription className="text-xs text-primary/90">
              Checklist integrado ao Momento APT: o momento ativo abre por padrão, mas os outros momentos do mês continuam disponíveis nos cards abaixo. Ao selecionar semanas aglutinadas, itens repetidos aparecem uma vez e a marcação replica nas semanas correspondentes.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Timer */}
            <ChecklistMonthlyAvulsos
              items={monthlyAvulsos}
              canModify={isGestorOrAdmin && !isLocked}
              currentUserId={user?.id}
              isGestorOrAdmin={isGestorOrAdmin}
              onUpdateStatus={updateInstanceStatus}
              onDelete={deleteInstance}
              onAdd={addQuickAvulso}
            />

            <ChecklistTimer
              isRunning={timerIsRunning}
              isPaused={timerIsPaused}
              isActive={timerIsActive}
              activeWeek={timerActiveWeek}
              elapsedSeconds={elapsedSeconds}
              isGestorOrAdmin={isGestorOrAdmin}
              mergedWeeks={effectiveMergedWeeks}
              onStart={handleStartTimer}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onStop={handleStopTimer}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {displayCards.map((card) => {
                if (card.type === "merged") {
                  const stats = getMergedStats(card.semanas);
                  const dur = getMergedDuration(card.semanas);
                  const isSelected =
                    isUsingAptMoment
                      ? selectedMomentWeeks.length === card.semanas.length &&
                        card.semanas.every((week, index) => selectedMomentWeeks[index] === week)
                      : selectedWeek !== null && card.semanas.includes(selectedWeek);
                  return (
                    <ChecklistSummaryCard
                      key={card.momentoNumero ? `momento-${card.momentoNumero}` : `merged-${card.semanas.join("-")}`}
                      semana={card.semanas[0]}
                      mergedWeeks={card.semanas}
                      momentNumber={card.momentoNumero}
                      totalItems={stats.total}
                      completedItems={stats.completed}
                      notDoneItems={stats.notDone}
                      notRelevantItems={stats.notRelevant}
                      couldNotItems={stats.couldNot}
                      duration={dur}
                      onClick={() => {
                        if (isUsingAptMoment) setSelectedMomentWeeks(card.semanas);
                        setSelectedWeek(card.semanas[0]);
                      }}
                      isSelected={isSelected}
                    />
                  );
                }
                const sem = card.semana;
                return (
                  <ChecklistSummaryCard
                    key={card.momentoNumero ? `momento-${card.momentoNumero}` : sem}
                    semana={sem}
                    momentNumber={card.momentoNumero}
                    totalItems={weekStats[sem]?.total || 0}
                    completedItems={weekStats[sem]?.completed || 0}
                    notDoneItems={weekStats[sem]?.notDone || 0}
                    notRelevantItems={weekStats[sem]?.notRelevant || 0}
                    couldNotItems={weekStats[sem]?.couldNot || 0}
                    duration={weekDurations[sem] || null}
                    onClick={() => {
                      if (isUsingAptMoment) setSelectedMomentWeeks([sem]);
                      setSelectedWeek(sem);
                    }}
                    isSelected={
                      isUsingAptMoment
                        ? selectedMomentWeeks.length === 1 && selectedMomentWeeks[0] === sem
                        : selectedWeek === sem
                    }
                  />
                );
              })}
            </div>

            {/* Inline Week Table (expansion below cards) */}
            {selectedWeek && (
              <ChecklistWeekTable
                semana={selectedWeek}
                semanas={tableWeeks}
                items={selectedWeekItems}
                canModify={isGestorOrAdmin && !isLocked}
                isLocked={isLocked ?? false}
                currentUserId={user?.id}
                isGestorOrAdmin={isGestorOrAdmin}
                profiles={profiles}
                onUpdateStatus={handleUpdateStatus}
                duplicateMap={duplicateMap}
                onUpdateInstance={updateInstance}
                onDeleteInstance={deleteInstance}
                onUpdateAssignees={updateAssignees}
                onReorder={reorderItem}
                onReorderSubItem={reorderSubItem}
                onClose={() => {
                  setSelectedWeek(null);
                  if (isUsingAptMoment) setSelectedMomentWeeks([]);
                }}
                onAddSubItem={addSubItem}
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
