import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMomentoAPT } from "@/hooks/useMomentoAPT";
import AppLayout from "@/components/layout/AppLayout";
import APTHorizontalFilters from "@/components/apt/APTHorizontalFilters";
import APTFilters from "@/components/apt/APTFilters";
import NovaDemandaDialog from "@/components/apt/NovaDemandaDialog";
import EditarDemandaIrmaDialog from "@/components/apt/EditarDemandaIrmaDialog";
import ExcluirDemandaIrmaDialog from "@/components/apt/ExcluirDemandaIrmaDialog";
import SolicitarExclusaoDialog from "@/components/apt/SolicitarExclusaoDialog";
import SolicitacoesExclusaoLista from "@/components/apt/SolicitacoesExclusaoLista";
import ExcluirDemandasEmMassaDialog from "@/components/apt/ExcluirDemandasEmMassaDialog";
import AtualizarStatusEmMassaDialog from "@/components/apt/AtualizarStatusEmMassaDialog";
import ExportDemandasButton from "@/components/apt/ExportDemandasButton";
import RolloverDemandasDialog from "@/components/apt/RolloverDemandasDialog";
import MonthSettingsControl, { PastMonthWarningBanner } from "@/components/apt/MonthSettingsControl";
import DemandaCard from "@/components/apt/DemandaCard";
import DemandaTableRow from "@/components/apt/DemandaTableRow";
import DemandaSortHeader from "@/components/apt/DemandaSortHeader";
// Gerenciamento agora é uma página independente
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// Navegação do APT é controlada exclusivamente via parâmetros de URL (menu do header)
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, Trash2, Check, ThumbsUp, Copy, Filter, ChevronDown, ClipboardList, BarChart3, Lock, Unlock, Eye, EyeOff, Settings2 } from "lucide-react";
import DuplicarDemandasEmMassaDialog from "@/components/apt/DuplicarDemandasEmMassaDialog";
import TopSetoresBar from "@/components/apt/TopSetoresBar";
import { useSolicitacoesExclusao } from "@/hooks/useSolicitacoesExclusao";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  status_responsavel: "pendente" | "executado" | "nao_realizado";
  status_gestor: "pendente" | "executado" | "nao_realizado";
  semanas_repeticao: number;
  semana_limite: number[];
  mes: number;
  ano: number;
  prioritaria: boolean;
  muito_urgente?: boolean;
  grupo_id: string | null;
}

const rowLimitOptions = [50, 100, 500, 1000, 2000];

export default function APT() {
  const [searchParams] = useSearchParams();
  const { user, isGestorOrAdmin, role } = useAuth();
  const isAdmin = role === "admin";
  const isColaborador = role === "colaborador";
  const isMobile = useIsMobile();
  const {
    demandas,
    profiles,
    setores,
    isLoading,
    filters,
    setFilters,
    clearFilters,
    sortConfig,
    toggleSort,
    resetSort,
    fetchDemandas,
    updateStatusResponsavel,
    updateStatusGestor,
    getProfileById,
    getSetorById,
    getSiblingCount,
    pendingCount,
    pendingApprovalCount,
  } = useDemandas();

  const {
    isPastMonth,
    getMonthSetting,
    isStatusUpdateAllowed,
    isEditAllowed,
    toggleMonthStatus,
  } = useMonthSettings();

  const { isAPTBloqueado, toggleBloqueio } = useMomentoAPT();
  const { pendingDemandaIds, pendingExclusaoCount, getSolicitacaoByDemandaId, refetchSolicitacoes } = useSolicitacoesExclusao();

  // Get tab/subtab from URL params (defaults to execucao/painel)
  // Obs: não escrevemos de volta na URL aqui para evitar loops e travamentos.
  const urlTab = searchParams.get("tab") || "execucao";
  const urlSubTab = searchParams.get("subtab") || "painel";

  // Determine the currently viewed month/year from filters
  const viewedMes = filters.meses.length === 1 ? parseInt(filters.meses[0]) : null;
  const viewedAno = filters.anos.length === 1 ? parseInt(filters.anos[0]) : null;

  // Check if currently viewing a single past month
  const isViewingPastMonth = viewedMes !== null && viewedAno !== null && isPastMonth(viewedMes, viewedAno);
  const currentMonthSetting = viewedMes !== null && viewedAno !== null 
    ? getMonthSetting(viewedMes, viewedAno) 
    : undefined;
  const isCurrentMonthStatusActive = currentMonthSetting?.status_ativo === true;

  // Momento APT bloqueado
  const isMomentoAPTBloqueado = viewedMes !== null && viewedAno !== null
    ? isAPTBloqueado(viewedMes, viewedAno)
    : false;

  // Determine if status updates are allowed for the current view
  // For collaborators, also check if Momento APT is bloqueado
  const canUpdateStatus = viewedMes !== null && viewedAno !== null 
    ? isStatusUpdateAllowed(viewedMes, viewedAno) && (!isColaborador || !isMomentoAPTBloqueado)
    : !isColaborador || !isMomentoAPTBloqueado;

  // Dialog states
  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [deletingDemanda, setDeletingDemanda] = useState<{
    id: string;
    numero: number;
    grupo_id: string | null;
  } | null>(null);
  const [solicitandoExclusao, setSolicitandoExclusao] = useState<{
    id: string;
    numero: number;
    grupo_id: string | null;
    descricao: string;
    responsavel_id: string;
    mes: number;
    ano: number;
    semanas_repeticao: number;
  } | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState<"responsavel" | "gestor" | null>(null);
  const [showBulkDuplicateDialog, setShowBulkDuplicateDialog] = useState(false);
  
  // Column visibility state (for admin/gestor)
  const [hideResponsavelColumn, setHideResponsavelColumn] = useState(false);
  const [rowLimit, setRowLimit] = useState(50);
  
  // Top Setores card filter (client-side only, doesn't affect DB query)
  const [activeTopSetor, setActiveTopSetor] = useState<string | null>(null);
  
  const handleTopSetorClick = (setorId: string | null) => {
    setActiveTopSetor(setorId);
  };

  // Apply the top setor card filter client-side
  const displayedDemandas = activeTopSetor
    ? demandas.filter((d) => d.setor_id === activeTopSetor)
    : demandas;

  const visibleDemandas = useMemo(
    () => displayedDemandas.slice(0, rowLimit),
    [displayedDemandas, rowLimit],
  );
  
  // Filters active count for badge
  const hasActiveFilters =
    filters.responsaveis.length > 0 ||
    filters.setores.length > 0 ||
    filters.meses.length > 0 ||
    filters.anos.length > 0 ||
    filters.semanas.length > 0 ||
    filters.statusResponsavel.length > 0 ||
    filters.statusGestor.length > 0 ||
    filters.repeticoes.length > 0 ||
    filters.busca !== "" ||
    filters.urgente ||
    filters.prioridade;

  // Calculate sibling count for editing/deleting using the enhanced getSiblingCount
  const editingSiblingCount = editingDemanda
    ? getSiblingCount(editingDemanda)
    : 1;
  
  // For deleting, find the full demanda to pass heuristic data
  const deletingFullDemanda = deletingDemanda
    ? demandas.find(d => d.id === deletingDemanda.id)
    : null;
  const deletingSiblingCount = deletingFullDemanda
    ? getSiblingCount(deletingFullDemanda)
    : 1;

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(visibleDemandas.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const visibleSelectedCount = visibleDemandas.filter((d) => selectedIds.has(d.id)).length;
  const allSelected = visibleDemandas.length > 0 && visibleSelectedCount === visibleDemandas.length;
  const someSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleDemandas.length;

  const handleBulkOperationComplete = () => {
    setSelectedIds(new Set());
    fetchDemandas();
    refetchSolicitacoes();
  };

  // Helper: route delete action based on role
  const handleDeleteClick = (demanda: { id: string; numero: number; grupo_id: string | null; descricao: string; responsavel_id: string; mes: number; ano: number; semanas_repeticao: number }) => {
    if (isGestorOrAdmin) {
      setDeletingDemanda(demanda);
    } else {
      setSolicitandoExclusao(demanda);
    }
  };

  return (
    <AppLayout>
      <div className="p-2 md:p-4 lg:p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-3 md:mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight">
              APT
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Acompanhamento de Performance de Tarefas
            </p>
          </div>
        </div>

        {/* Content (navegação via menu / URL) */}
        {urlTab === "execucao" && (
          <div className="mt-0">
            {/* Status badges and actions */}
            <div className="mb-3 md:mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-xl font-bold text-warning">{pendingCount}</span>
                    <span className="text-xs font-medium text-warning/80 uppercase tracking-wide">Pendentes</span>
                  </div>
                )}
                {pendingApprovalCount > 0 && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-xl font-bold text-primary">{pendingApprovalCount}</span>
                    <span className="text-xs font-medium text-primary/80 uppercase tracking-wide">Aguardando</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Export button - icon only on mobile */}
                <ExportDemandasButton
                  demandas={demandas}
                  profiles={profiles}
                  setores={setores}
                  getProfileById={getProfileById}
                  getSetorById={getSetorById}
                  activeFilters={{
                    mes: filters.meses.length === 1 ? filters.meses[0] : undefined,
                    ano: filters.anos.length === 1 ? filters.anos[0] : undefined,
                  }}
                />

                {/* Nova Demanda - visible for all users */}
                <NovaDemandaDialog
                  profiles={profiles}
                  setores={setores}
                  onDemandaCriada={fetchDemandas}
                />

                {isGestorOrAdmin && (
                  <>

                    {/* More actions - grouped in dropdown on mobile */}
                    <div className="hidden sm:flex items-center gap-2">
                      {/* Column visibility settings */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Settings2 className="h-4 w-4" />
                            <span className="hidden md:inline">Colunas</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Visibilidade</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setHideResponsavelColumn(!hideResponsavelColumn)}
                            className="gap-2"
                          >
                            {hideResponsavelColumn ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            {hideResponsavelColumn ? "Mostrar" : "Ocultar"} coluna "Feito"
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Momento APT Lock Button */}
                      {viewedMes !== null && viewedAno !== null && (
                        <Button
                          variant={isMomentoAPTBloqueado ? "destructive" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={() => toggleBloqueio(viewedMes, viewedAno)}
                        >
                          {isMomentoAPTBloqueado ? (
                            <>
                              <Lock className="h-4 w-4" />
                              <span className="hidden md:inline">Momento APT Ativo</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4" />
                              <span className="hidden md:inline">Iniciar Momento APT</span>
                            </>
                          )}
                        </Button>
                      )}
                      <RolloverDemandasDialog onRolloverComplete={fetchDemandas} />
                    </div>

                    {/* Mobile: grouped actions */}
                    <div className="sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 h-9 min-w-[44px]">
                            <Settings2 className="h-4 w-4" />
                            <span className="text-xs">Mais</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setHideResponsavelColumn(!hideResponsavelColumn)}
                            className="gap-2"
                          >
                            {hideResponsavelColumn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {hideResponsavelColumn ? "Mostrar" : "Ocultar"} col. "Feito"
                          </DropdownMenuItem>
                          {viewedMes !== null && viewedAno !== null && (
                            <DropdownMenuItem
                              onClick={() => toggleBloqueio(viewedMes, viewedAno)}
                              className="gap-2"
                            >
                              {isMomentoAPTBloqueado ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              {isMomentoAPTBloqueado ? "APT Ativo" : "Iniciar APT"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Past month controls - shown when viewing a single past month */}
            {isViewingPastMonth && viewedMes !== null && viewedAno !== null && (
              <div className="mb-4 space-y-2">
                <MonthSettingsControl
                  mes={viewedMes}
                  ano={viewedAno}
                  isPastMonth={isViewingPastMonth}
                  isStatusActive={isCurrentMonthStatusActive}
                  onToggle={() => toggleMonthStatus(viewedMes, viewedAno)}
                  isGestorOrAdmin={isGestorOrAdmin}
                />
                <PastMonthWarningBanner
                  isPastMonth={isViewingPastMonth}
                  isStatusActive={isCurrentMonthStatusActive}
                  isCollaborator={!isGestorOrAdmin}
                />
              </div>
            )}

            {/* Momento APT warning for collaborators */}
            {isMomentoAPTBloqueado && isColaborador && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                <Lock className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Momento APT em andamento - Alterações de status estão bloqueadas
                </span>
              </div>
            )}

            {/* Horizontal Filters - Always visible on desktop */}
            <div className="hidden lg:block">
              <APTHorizontalFilters
                profiles={profiles}
                setores={setores}
                filters={filters}
                onFiltersChange={(f) => { setFilters(f); setActiveTopSetor(null); }}
                onClearFilters={() => { clearFilters(); setActiveTopSetor(null); }}
                showResponsavelFilter={isGestorOrAdmin}
              />
            </div>

            {/* Mobile filters */}
            <div className="mb-4 lg:hidden">
              <APTFilters
                profiles={profiles}
                setores={setores}
                filters={filters}
                onFiltersChange={(f) => { setFilters(f); setActiveTopSetor(null); }}
                onClearFilters={() => { clearFilters(); setActiveTopSetor(null); }}
                showResponsavelFilter={isGestorOrAdmin}
              />
            </div>


            {/* Top 10 Setores by demand count - only for gestor/admin */}
            {!isLoading && demandas.length > 0 && isGestorOrAdmin && (
              <TopSetoresBar demandas={demandas} setores={setores} activeSetorId={activeTopSetor} onSetorClick={handleTopSetorClick} />
            )}

            <div className="flex flex-col lg:flex-row gap-6">

              {/* Main content */}
              <div className="flex-1 min-w-0">

                {/* Sort header - shown for all devices when there are demandas */}
                {!isLoading && displayedDemandas.length > 0 && (
                  <DemandaSortHeader
                    sortConfig={sortConfig}
                    onSortChange={toggleSort}
                    onResetSort={resetSort}
                  />
                )}

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : displayedDemandas.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Nenhuma demanda encontrada
                      </p>
                    </CardContent>
                  </Card>
                ) : isMobile ? (
                  /* Mobile: Cards */
                  <div className="space-y-3">
                    {visibleDemandas.map((demanda) => {
                      const profile = getProfileById(demanda.responsavel_id);
                      const setor = getSetorById(demanda.setor_id);
                      
                      // Check if this specific demand is in a past month
                      const demandaIsPastMonth = isPastMonth(demanda.mes, demanda.ano);
                      const demandaStatusAllowed = isStatusUpdateAllowed(demanda.mes, demanda.ano);
                      const demandaEditAllowed = isEditAllowed(demanda.mes, demanda.ano, isGestorOrAdmin);
                      
                      // Status permissions for "Feito" column:
                      // - Admin: can mark any demand as done
                      // - Gestor/Colaborador: can only mark their own demands
                      // Block if Momento APT is active for collaborators
                      const momentoAPTBlocking = isColaborador && isMomentoAPTBloqueado;
                      const canEditResponsavel = demandaStatusAllowed && 
                        (isAdmin || user?.id === demanda.responsavel_id) && 
                        !momentoAPTBlocking;
                      const canEditGestor = demandaStatusAllowed && isGestorOrAdmin;
                      
                      // Edit/delete permissions: collaborators can now edit/delete too
                      const canEditDemanda = true;

                      return (
                      <DemandaCard
                          key={demanda.id}
                          numero={demanda.numero}
                          setor={setor?.nome || "Sem setor"}
                          setorCor={setor?.cor || "#E5E7EB"}
                          responsavel={profile?.nome || "Desconhecido"}
                          descricao={demanda.descricao}
                          statusResponsavel={demanda.status_responsavel}
                          statusGestor={demanda.status_gestor}
                          semanasRepeticao={demanda.semanas_repeticao}
                          semanaLimite={demanda.semana_limite}
                          prioritaria={demanda.prioritaria}
                          muitoUrgente={demanda.muito_urgente}
                          canEditResponsavel={canEditResponsavel}
                          canEditGestor={canEditGestor}
                          canEditDemanda={canEditDemanda}
                          showGestorStatus={isGestorOrAdmin}
                          pendingExclusao={pendingDemandaIds.has(demanda.id)}
                          onStatusResponsavelChange={() =>
                            updateStatusResponsavel(
                              demanda.id,
                              demanda.status_responsavel
                            )
                          }
                          onStatusGestorChange={() =>
                            updateStatusGestor(demanda.id, demanda.status_gestor)
                          }
                          onEdit={() => setEditingDemanda(demanda as Demanda)}
                          onDelete={() =>
                            handleDeleteClick(demanda)
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* Desktop: Table */
                  <>

                    {/* Bulk action controls */}
                    {selectedIds.size > 0 && (
                      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-2 p-2 bg-muted rounded-lg">
                        <span className="text-sm font-medium">
                          {selectedIds.size} selecionada(s)
                        </span>
                        
                        {/* Marcar como feito em massa - disponível para todos */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setShowBulkStatusDialog("responsavel")}
                        >
                          <Check className="h-4 w-4" />
                          Marcar como Feito
                        </Button>

                        {/* Aprovar em massa - apenas gestor/admin */}
                        {isGestorOrAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setShowBulkStatusDialog("gestor")}
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Aprovar
                          </Button>
                        )}

                        {/* Excluir em massa - apenas gestor/admin */}
                        {isGestorOrAdmin && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => setShowBulkDeleteDialog(true)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        )}

                        {/* Duplicar em massa - apenas gestor/admin */}
                        {isGestorOrAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setShowBulkDuplicateDialog(true)}
                          >
                            <Copy className="h-4 w-4" />
                            Duplicar
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedIds(new Set())}
                        >
                          Limpar seleção
                        </Button>
                      </div>
                    )}

                    <Card className="shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-primary">
                          <TableRow className="hover:bg-primary border-0">
                            <TableHead className="w-10 text-primary-foreground font-semibold">
                              <Checkbox
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) {
                                    (el as any).indeterminate = someSelected;
                                  }
                                }}
                                onCheckedChange={toggleSelectAll}
                                className="border-primary-foreground/50 data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                              />
                            </TableHead>
                            <TableHead className="text-center w-16 text-primary-foreground font-semibold">Nº</TableHead>
                            <TableHead className="w-28 text-primary-foreground font-semibold">Setor</TableHead>
                            <TableHead className="w-36 text-primary-foreground font-semibold">Responsável</TableHead>
                            <TableHead className="text-primary-foreground font-semibold">Descrição</TableHead>
                            {!hideResponsavelColumn && (
                              <TableHead className="text-center w-20 text-primary-foreground font-semibold">
                                Feito?
                              </TableHead>
                            )}
                            {isGestorOrAdmin && (
                              <TableHead className="text-center w-20 text-primary-foreground font-semibold">
                                Aprovado?
                              </TableHead>
                            )}
                            <TableHead className="text-center w-16 text-primary-foreground font-semibold">Rep.</TableHead>
                            <TableHead className="text-center w-20 text-primary-foreground font-semibold">
                              Semana
                            </TableHead>
                            <TableHead className="text-center w-24 text-primary-foreground font-semibold">
                                Ações
                              </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleDemandas.map((demanda, index) => {
                            const profile = getProfileById(demanda.responsavel_id);
                            const setor = getSetorById(demanda.setor_id);
                            
                            // Check if this specific demand is in a past month
                            const demandaStatusAllowed = isStatusUpdateAllowed(demanda.mes, demanda.ano);
                            const demandaEditAllowed = isEditAllowed(demanda.mes, demanda.ano, isGestorOrAdmin);
                            
                            // Status permissions for "Feito" column:
                            // - Admin: can mark any demand as done
                            // - Gestor/Colaborador: can only mark their own demands
                            // Block if Momento APT is active for collaborators
                            const momentoAPTBlocking = isColaborador && isMomentoAPTBloqueado;
                            const isAdmin = role === "admin";
                            const canEditResponsavel = demandaStatusAllowed && 
                              (isAdmin || user?.id === demanda.responsavel_id) && 
                              !momentoAPTBlocking;
                            const canEditGestor = demandaStatusAllowed && isGestorOrAdmin;
                            
                            // Edit/delete permissions: collaborators can now edit/delete too
                            const canEditDemanda = true;

                            return (
                          <DemandaTableRow
                                key={demanda.id}
                                id={demanda.id}
                                numero={demanda.numero}
                                setor={setor?.nome || "Sem setor"}
                                setorCor={setor?.cor || "#E5E7EB"}
                                responsavel={profile?.nome || "Desconhecido"}
                                descricao={demanda.descricao}
                                statusResponsavel={demanda.status_responsavel}
                                statusGestor={demanda.status_gestor}
                                semanasRepeticao={demanda.semanas_repeticao}
                                semanaLimite={demanda.semana_limite}
                                prioritaria={demanda.prioritaria}
                                muitoUrgente={demanda.muito_urgente}
                                canEditResponsavel={canEditResponsavel}
                                canEditGestor={canEditGestor}
                                canEditDemanda={canEditDemanda}
                                showGestorColumn={isGestorOrAdmin}
                                showResponsavelColumn={!hideResponsavelColumn}
                                isAlternateRow={index % 2 === 1}
                                isSelected={selectedIds.has(demanda.id)}
                                showCheckbox={true}
                                pendingExclusao={pendingDemandaIds.has(demanda.id)}
                                onStatusResponsavelChange={() =>
                                  updateStatusResponsavel(
                                    demanda.id,
                                    demanda.status_responsavel
                                  )
                                }
                                onStatusGestorChange={() =>
                                  updateStatusGestor(
                                    demanda.id,
                                    demanda.status_gestor
                                  )
                                }
                                onEdit={() =>
                                  setEditingDemanda(demanda as Demanda)
                                }
                                onDelete={() =>
                                  handleDeleteClick(demanda)
                                }
                                onSelectChange={(checked) =>
                                  toggleSelection(demanda.id, checked)
                                }
                              />
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Card>

                  </>
                )}

                {!isLoading && displayedDemandas.length > 0 && (
                  <div className="mt-3 flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando <span className="font-medium text-foreground">{visibleDemandas.length}</span> de{" "}
                      <span className="font-medium text-foreground">{displayedDemandas.length}</span> demandas
                    </p>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-sm text-muted-foreground">Exibir</span>
                      <Select value={String(rowLimit)} onValueChange={(value) => setRowLimit(Number(value))}>
                        <SelectTrigger className="h-9 w-[120px]">
                          <SelectValue placeholder="50" />
                        </SelectTrigger>
                        <SelectContent>
                          {rowLimitOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">linhas</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gerenciamento agora está em /gerenciamento */}
      </div>

      {/* Dialogs */}
      <EditarDemandaIrmaDialog
        open={!!editingDemanda}
        onOpenChange={(open) => !open && setEditingDemanda(null)}
        demanda={editingDemanda}
        profiles={profiles}
        setores={setores}
        siblingCount={editingSiblingCount}
        onDemandaEditada={fetchDemandas}
      />

      <ExcluirDemandaIrmaDialog
        open={!!deletingDemanda}
        onOpenChange={(open) => !open && setDeletingDemanda(null)}
        demandaId={deletingDemanda?.id || null}
        demandaNumero={deletingDemanda?.numero || null}
        grupoId={deletingDemanda?.grupo_id || null}
        siblingCount={deletingSiblingCount}
        onDemandaExcluida={fetchDemandas}
        demandaDescricao={deletingFullDemanda?.descricao}
        demandaResponsavelId={deletingFullDemanda?.responsavel_id}
        demandaMes={deletingFullDemanda?.mes}
        demandaAno={deletingFullDemanda?.ano}
        demandaSemanasRepeticao={deletingFullDemanda?.semanas_repeticao}
      />

      <SolicitarExclusaoDialog
        open={!!solicitandoExclusao}
        onOpenChange={(open) => !open && setSolicitandoExclusao(null)}
        demandaId={solicitandoExclusao?.id || null}
        demandaNumero={solicitandoExclusao?.numero || null}
        grupoId={solicitandoExclusao?.grupo_id || null}
        siblingCount={
          solicitandoExclusao
            ? (() => {
                const d = demandas.find((x) => x.id === solicitandoExclusao.id);
                return d ? getSiblingCount(d) : 1;
              })()
            : 1
        }
        demandaDescricao={solicitandoExclusao?.descricao}
        demandaResponsavelId={solicitandoExclusao?.responsavel_id}
        demandaMes={solicitandoExclusao?.mes}
        demandaAno={solicitandoExclusao?.ano}
        demandaSemanasRepeticao={solicitandoExclusao?.semanas_repeticao}
        onSolicitacaoEnviada={() => { fetchDemandas(); refetchSolicitacoes(); }}
      />

      <ExcluirDemandasEmMassaDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        demandaIds={Array.from(selectedIds)}
        allDemandas={demandas}
        onDemandasExcluidas={handleBulkOperationComplete}
      />

      <AtualizarStatusEmMassaDialog
        open={showBulkStatusDialog !== null}
        onOpenChange={(open) => !open && setShowBulkStatusDialog(null)}
        demandaIds={Array.from(selectedIds)}
        type={showBulkStatusDialog || "responsavel"}
        onStatusAtualizado={handleBulkOperationComplete}
      />

      <DuplicarDemandasEmMassaDialog
        open={showBulkDuplicateDialog}
        onOpenChange={setShowBulkDuplicateDialog}
        selectedIds={selectedIds}
        onComplete={handleBulkOperationComplete}
      />
    </AppLayout>
  );
}
