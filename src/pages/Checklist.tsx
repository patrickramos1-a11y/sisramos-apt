import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChecklist } from "@/hooks/useChecklist";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import ChecklistSummaryCard from "@/components/checklist/ChecklistSummaryCard";
import ChecklistDetailDialog from "@/components/checklist/ChecklistDetailDialog";
import NovoItemChecklistDialog from "@/components/checklist/NovoItemChecklistDialog";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Loader2, Info, Copy, Lock, Unlock, Filter, X } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

interface ChecklistMultiFilters {
  meses: string[];
  anos: string[];
  semanas: string[];
  searchTerm: string;
}

const SEMANAS = [1, 2, 3, 4, 5];

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const SEMANAS_OPTIONS = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

export default function Checklist() {
  const { isGestorOrAdmin, user } = useAuth();
  const now = new Date();

  // Profiles for user assignment
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*");
      setProfiles((data as Profile[]) || []);
    };
    fetchProfiles();
  }, []);

  // Filters state
  const [filters, setFilters] = useState<ChecklistMultiFilters>({
    meses: [String(now.getMonth() + 1)],
    anos: [String(now.getFullYear())],
    semanas: [],
    searchTerm: "",
  });

  // Convert string arrays to number arrays
  const mesesNum = useMemo(() => filters.meses.map((m) => parseInt(m, 10)), [filters.meses]);
  const anosNum = useMemo(() => filters.anos.map((a) => parseInt(a, 10)), [filters.anos]);
  const semanasNum = useMemo(() => filters.semanas.map((s) => parseInt(s, 10)), [filters.semanas]);

  const { isLoading, getItemsByWeek, addItem, updateItem, deleteItem, rolloverToNextMonth, updateAssignees, items } = useChecklist({
    meses: mesesNum,
    anos: anosNum,
    semanas: semanasNum,
    searchTerm: filters.searchTerm,
  });

  const { getMonthSetting, toggleMonthStatus } = useMonthSettings();

  // For rollover
  const [rolloverMes, setRolloverMes] = useState(now.getMonth() + 1);
  const [rolloverAno, setRolloverAno] = useState(now.getFullYear());

  // Single month view detection
  const isSingleMonthView = filters.meses.length === 1 && filters.anos.length === 1;
  const viewedMes = isSingleMonthView ? parseInt(filters.meses[0]) : null;
  const viewedAno = isSingleMonthView ? parseInt(filters.anos[0]) : null;
  
  const monthSettings = viewedMes && viewedAno ? getMonthSetting(viewedMes, viewedAno) : null;
  const isCurrentMonth = viewedMes === now.getMonth() + 1 && viewedAno === now.getFullYear();
  const isPastMonth = viewedMes && viewedAno && (viewedAno < now.getFullYear() || (viewedAno === now.getFullYear() && viewedMes < now.getMonth() + 1));
  const isLocked = isSingleMonthView && isPastMonth && !monthSettings?.status_ativo;

  // Which weeks to show
  const semanasToShow = semanasNum.length > 0 ? semanasNum : SEMANAS;

  // Calculate next month label
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

  const rolloverItemsCount = items.filter((i) => i.mes === rolloverMes && i.ano === rolloverAno).length;

  const handleToggleLock = () => {
    if (viewedMes && viewedAno) {
      toggleMonthStatus(viewedMes, viewedAno);
    }
  };

  const handleAddItemFromDialog = async (texto: string, semana: number, mes: number, ano: number, assignees?: string[]) => {
    await addItem(semana, texto, mes, ano, assignees);
  };

  const handleClearFilters = () => {
    setFilters({
      meses: [String(now.getMonth() + 1)],
      anos: [String(now.getFullYear())],
      semanas: [],
      searchTerm: "",
    });
  };

  const hasActiveFilters =
    filters.semanas.length > 0 ||
    filters.searchTerm.trim() !== "" ||
    filters.meses.length !== 1 ||
    filters.anos.length !== 1 ||
    (filters.meses.length === 1 && filters.meses[0] !== String(now.getMonth() + 1)) ||
    (filters.anos.length === 1 && filters.anos[0] !== String(now.getFullYear()));

  // Items for selected week dialog
  const selectedWeekItems = selectedWeek 
    ? getItemsByWeek(selectedWeek, viewedMes ?? undefined, viewedAno ?? undefined)
    : [];

  // Stats per week
  const weekStats = useMemo(() => {
    const stats: Record<number, { total: number; completed: number }> = {};
    semanasToShow.forEach((sem) => {
      const weekItems = getItemsByWeek(sem, viewedMes ?? undefined, viewedAno ?? undefined);
      stats[sem] = {
        total: weekItems.length,
        completed: weekItems.filter((i) => i.concluido).length,
      };
    });
    return stats;
  }, [semanasToShow, items, viewedMes, viewedAno, getItemsByWeek]);

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

  const anosOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Filter content for Sheet
  const filterContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Ano</label>
        <MultiSelectDropdown
          options={ANOS}
          selected={filters.anos}
          onChange={(value) => setFilters({ ...filters, anos: value })}
          placeholder="Selecionar ano"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Mês</label>
        <MultiSelectDropdown
          options={MESES}
          selected={filters.meses}
          onChange={(value) => setFilters({ ...filters, meses: value })}
          placeholder="Selecionar mês"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Semana</label>
        <MultiSelectDropdown
          options={SEMANAS_OPTIONS}
          selected={filters.semanas}
          onChange={(value) => setFilters({ ...filters, semanas: value })}
          placeholder="Todas as semanas"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Buscar</label>
        <Input
          placeholder="Buscar tarefas..."
          value={filters.searchTerm}
          onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
        />
      </div>
      
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleClearFilters}
        disabled={!hasActiveFilters}
      >
        <X className="mr-2 h-4 w-4" />
        Limpar Filtros
      </Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Checklist Semanal</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Acompanhe as tarefas de cada semana do mês
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      !
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 flex flex-col">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 mt-6 -mx-6 px-6">
                  <div className="pb-6">
                    {filterContent}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Toggle lock for past months */}
            {isGestorOrAdmin && isSingleMonthView && isPastMonth && (
              <Button
                variant={isLocked ? "outline" : "secondary"}
                size="sm"
                onClick={handleToggleLock}
                className="gap-2"
              >
                {isLocked ? (
                  <>
                    <Lock className="h-4 w-4" />
                    <span className="hidden sm:inline">Desbloquear</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span className="hidden sm:inline">Bloquear</span>
                  </>
                )}
              </Button>
            )}

            {isGestorOrAdmin && (
              <>
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
                      <span className="hidden sm:inline">Copiar mês</span>
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
              </>
            )}
          </div>
        </div>

        {/* Observation alert */}
        <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Observação:</strong> Esta área contém o checklist padrão a ser cumprido antes de iniciar um momento APT.
          </AlertDescription>
        </Alert>

        {/* Lock indicator */}
        {isSingleMonthView && isPastMonth && (
          <Alert variant={isLocked ? "default" : "destructive"} className={isLocked ? "bg-amber-500/10 border-amber-500/30" : ""}>
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                  Este mês está <strong>bloqueado</strong> para edição.
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

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {semanasToShow.map((sem) => (
              <ChecklistSummaryCard
                key={sem}
                semana={sem}
                totalItems={weekStats[sem]?.total || 0}
                completedItems={weekStats[sem]?.completed || 0}
                onClick={() => setSelectedWeek(sem)}
              />
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <ChecklistDetailDialog
          open={selectedWeek !== null}
          onOpenChange={(open) => !open && setSelectedWeek(null)}
          semana={selectedWeek || 1}
          items={selectedWeekItems}
          canEdit={isGestorOrAdmin}
          isLocked={isLocked ?? false}
          currentUserId={user?.id}
          isGestorOrAdmin={isGestorOrAdmin}
          profiles={profiles}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onUpdateAssignees={updateAssignees}
        />
      </div>
    </AppLayout>
  );
}
