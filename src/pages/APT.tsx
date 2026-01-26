import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import AppLayout from "@/components/layout/AppLayout";
import APTFilters from "@/components/apt/APTFilters";
import NovaDemandaDialog from "@/components/apt/NovaDemandaDialog";
import EditarDemandaIrmaDialog from "@/components/apt/EditarDemandaIrmaDialog";
import ExcluirDemandaIrmaDialog from "@/components/apt/ExcluirDemandaIrmaDialog";
import ExcluirDemandasEmMassaDialog from "@/components/apt/ExcluirDemandasEmMassaDialog";
import AtualizarStatusEmMassaDialog from "@/components/apt/AtualizarStatusEmMassaDialog";
import ExportDemandasButton from "@/components/apt/ExportDemandasButton";
import RolloverDemandasDialog from "@/components/apt/RolloverDemandasDialog";
import MonthSettingsControl, { PastMonthWarningBanner } from "@/components/apt/MonthSettingsControl";
import DemandaCard from "@/components/apt/DemandaCard";
import DemandaTableRow from "@/components/apt/DemandaTableRow";
import DemandaSortHeader from "@/components/apt/DemandaSortHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Trash2, Check, ThumbsUp, Copy } from "lucide-react";
import DuplicarDemandasEmMassaDialog from "@/components/apt/DuplicarDemandasEmMassaDialog";

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

export default function APT() {
  const { user, isGestorOrAdmin } = useAuth();
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

  // Determine the currently viewed month/year from filters
  const viewedMes = filters.meses.length === 1 ? parseInt(filters.meses[0]) : null;
  const viewedAno = filters.anos.length === 1 ? parseInt(filters.anos[0]) : null;

  // Check if currently viewing a single past month
  const isViewingPastMonth = viewedMes !== null && viewedAno !== null && isPastMonth(viewedMes, viewedAno);
  const currentMonthSetting = viewedMes !== null && viewedAno !== null 
    ? getMonthSetting(viewedMes, viewedAno) 
    : undefined;
  const isCurrentMonthStatusActive = currentMonthSetting?.status_ativo === true;

  // Determine if status updates are allowed for the current view
  const canUpdateStatus = viewedMes !== null && viewedAno !== null 
    ? isStatusUpdateAllowed(viewedMes, viewedAno)
    : true; // Allow if viewing multiple months

  // Dialog states
  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [deletingDemanda, setDeletingDemanda] = useState<{
    id: string;
    numero: number;
    grupo_id: string | null;
  } | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState<"responsavel" | "gestor" | null>(null);
  const [showBulkDuplicateDialog, setShowBulkDuplicateDialog] = useState(false);

  // Calculate sibling count and list for editing/deleting
  const editingSiblingCount = editingDemanda
    ? getSiblingCount(editingDemanda.grupo_id)
    : 1;
  const deletingSiblingCount = deletingDemanda
    ? getSiblingCount(deletingDemanda.grupo_id)
    : 1;
  
  // Get siblings list for delete preview
  const deletingSiblings = deletingDemanda?.grupo_id
    ? demandas
        .filter((d) => d.grupo_id === deletingDemanda.grupo_id)
        .map((d) => ({
          id: d.id,
          numero: d.numero,
          descricao: d.descricao,
          semana_limite: d.semana_limite,
        }))
    : [];

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
      setSelectedIds(new Set(demandas.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const allSelected = demandas.length > 0 && selectedIds.size === demandas.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < demandas.length;

  const handleBulkOperationComplete = () => {
    setSelectedIds(new Set());
    fetchDemandas();
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isGestorOrAdmin ? "APT Geral" : "Minhas Demandas"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhamento de Performance de Tarefas
            </p>
            
            {/* Status badges - mobile visible */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {pendingCount > 0 && (
                <Badge 
                  variant="outline" 
                  className="gap-1.5 bg-warning/10 text-warning border-warning/30"
                >
                  <AlertCircle className="h-3 w-3" />
                  {pendingCount} pendentes
                </Badge>
              )}
              {pendingApprovalCount > 0 && (
                <Badge 
                  variant="outline"
                  className="gap-1.5 bg-primary/10 text-primary border-primary/30"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {pendingApprovalCount} aguardando
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export button */}
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

            {isGestorOrAdmin && (
              <>
                <RolloverDemandasDialog onRolloverComplete={fetchDemandas} />
                <NovaDemandaDialog
                  profiles={profiles}
                  setores={setores}
                  onDemandaCriada={fetchDemandas}
                />
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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar (desktop) */}
          <aside className="hidden lg:block w-72 shrink-0">
            <Card className="sticky top-20 shadow-sm">
              <CardContent className="p-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
                  Filtros
                </h2>
                <APTFilters
                  profiles={profiles}
                  setores={setores}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={clearFilters}
                  showResponsavelFilter={isGestorOrAdmin}
                />
              </CardContent>
            </Card>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile filters only (sort header moved below for all devices) */}
            <div className="mb-4 lg:hidden">
              <APTFilters
                profiles={profiles}
                setores={setores}
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
                showResponsavelFilter={isGestorOrAdmin}
              />
            </div>

            {/* Sort header - shown for all devices when there are demandas */}
            {!isLoading && demandas.length > 0 && (
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
            ) : demandas.length === 0 ? (
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
                {demandas.map((demanda, index) => {
                  const profile = getProfileById(demanda.responsavel_id);
                  const setor = getSetorById(demanda.setor_id);
                  
                  // Check if this specific demand is in a past month
                  const demandaIsPastMonth = isPastMonth(demanda.mes, demanda.ano);
                  const demandaStatusAllowed = isStatusUpdateAllowed(demanda.mes, demanda.ano);
                  const demandaEditAllowed = isEditAllowed(demanda.mes, demanda.ano, isGestorOrAdmin);
                  
                  // Status permissions: only the responsible user can edit "Feito"
                  const canEditResponsavel = demandaStatusAllowed && user?.id === demanda.responsavel_id;
                  const canEditGestor = demandaStatusAllowed && isGestorOrAdmin;
                  
                  // Edit/delete permissions: past months only allow gestor/admin
                  const canEditDemanda = demandaEditAllowed;

                  return (
                    <DemandaCard
                      key={demanda.id}
                      numero={index + 1}
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
                        setDeletingDemanda({
                          id: demanda.id,
                          numero: demanda.numero,
                          grupo_id: demanda.grupo_id,
                        })
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
                  <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-muted rounded-lg">
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
                        <TableHead className="text-center w-20 text-primary-foreground font-semibold">
                          Feito?
                        </TableHead>
                        {isGestorOrAdmin && (
                          <TableHead className="text-center w-20 text-primary-foreground font-semibold">
                            Aprovado?
                          </TableHead>
                        )}
                        <TableHead className="text-center w-16 text-primary-foreground font-semibold">Rep.</TableHead>
                        <TableHead className="text-center w-20 text-primary-foreground font-semibold">
                          Semana
                        </TableHead>
                        {isGestorOrAdmin && (
                          <TableHead className="text-center w-24 text-primary-foreground font-semibold">
                            Ações
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandas.map((demanda, index) => {
                        const profile = getProfileById(demanda.responsavel_id);
                        const setor = getSetorById(demanda.setor_id);
                        
                        // Check if this specific demand is in a past month
                        const demandaStatusAllowed = isStatusUpdateAllowed(demanda.mes, demanda.ano);
                        const demandaEditAllowed = isEditAllowed(demanda.mes, demanda.ano, isGestorOrAdmin);
                        
                        // Status permissions: only the responsible user can edit "Feito"
                        const canEditResponsavel = demandaStatusAllowed && user?.id === demanda.responsavel_id;
                        const canEditGestor = demandaStatusAllowed && isGestorOrAdmin;
                        
                        // Edit/delete permissions: past months only allow gestor/admin
                        const canEditDemanda = demandaEditAllowed;

                        return (
                          <DemandaTableRow
                            key={demanda.id}
                            id={demanda.id}
                            numero={index + 1}
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
                            isAlternateRow={index % 2 === 1}
                            isSelected={selectedIds.has(demanda.id)}
                            showCheckbox={true}
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
                              setDeletingDemanda({
                                id: demanda.id,
                                numero: demanda.numero,
                                grupo_id: demanda.grupo_id,
                              })
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
          </div>
        </div>
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
        siblings={deletingSiblings}
        onDemandaExcluida={fetchDemandas}
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
