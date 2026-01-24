import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useIsMobile } from "@/hooks/use-mobile";
import AppLayout from "@/components/layout/AppLayout";
import APTFilters from "@/components/apt/APTFilters";
import NovaDemandaDialog from "@/components/apt/NovaDemandaDialog";
import EditarDemandaIrmaDialog from "@/components/apt/EditarDemandaIrmaDialog";
import ExcluirDemandaIrmaDialog from "@/components/apt/ExcluirDemandaIrmaDialog";
import ExcluirDemandasEmMassaDialog from "@/components/apt/ExcluirDemandasEmMassaDialog";
import AtualizarStatusEmMassaDialog from "@/components/apt/AtualizarStatusEmMassaDialog";
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
import { Loader2, AlertCircle, CheckCircle2, Trash2, Check, ThumbsUp } from "lucide-react";

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
    fetchDemandas,
    updateStatusResponsavel,
    updateStatusGestor,
    getProfileById,
    getSetorById,
    getSiblingCount,
    sortConfig,
    toggleSort,
    resetSort,
    pendingCount,
    pendingApprovalCount,
  } = useDemandas();

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

  // Calculate sibling count for editing/deleting
  const editingSiblingCount = editingDemanda
    ? getSiblingCount(editingDemanda.grupo_id)
    : 1;
  const deletingSiblingCount = deletingDemanda
    ? getSiblingCount(deletingDemanda.grupo_id)
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
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isGestorOrAdmin ? "APT Geral" : "Minhas Demandas"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhamento de Performance de Tarefas
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status badges */}
            <div className="hidden sm:flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {pendingCount} pendentes
                </Badge>
              )}
              {isGestorOrAdmin && pendingApprovalCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {pendingApprovalCount} aguardando aprovação
                </Badge>
              )}
            </div>

            {isGestorOrAdmin && (
              <NovaDemandaDialog
                profiles={profiles}
                setores={setores}
                onDemandaCriada={fetchDemandas}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar (desktop) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4">Filtros</h2>
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
            {/* Mobile filters */}
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
                  const canEditResponsavel =
                    user?.id === demanda.responsavel_id || isGestorOrAdmin;
                  const canEditGestor = isGestorOrAdmin;

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
                      canEditResponsavel={canEditResponsavel}
                      canEditGestor={canEditGestor}
                      canEditDemanda={isGestorOrAdmin}
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
                {/* Sort controls */}
                <DemandaSortHeader
                  sortConfig={sortConfig}
                  onSortChange={toggleSort}
                  onResetSort={resetSort}
                />

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

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Limpar seleção
                    </Button>
                  </div>
                )}

                <Card>
                  <Table>
                    <TableHeader className="bg-[hsl(var(--apt-header))]">
                      <TableRow className="hover:bg-[hsl(var(--apt-header))]">
                        <TableHead className="w-10 text-primary-foreground">
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => {
                              if (el) {
                                (el as any).indeterminate = someSelected;
                              }
                            }}
                            onCheckedChange={toggleSelectAll}
                            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-primary"
                          />
                        </TableHead>
                        <TableHead className="text-center w-16 text-primary-foreground">Nº</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Setor</TableHead>
                        <TableHead className="w-32 text-primary-foreground">Responsável</TableHead>
                        <TableHead className="text-primary-foreground">Descrição</TableHead>
                        <TableHead className="text-center w-20 text-primary-foreground">
                          Feito?
                        </TableHead>
                        {isGestorOrAdmin && (
                          <TableHead className="text-center w-20 text-primary-foreground">
                            Aprovado?
                          </TableHead>
                        )}
                        <TableHead className="text-center w-12 text-primary-foreground">Repetição</TableHead>
                        <TableHead className="text-center w-20 text-primary-foreground">
                          Semana
                        </TableHead>
                        {isGestorOrAdmin && (
                          <TableHead className="text-center w-20 text-primary-foreground">
                            Ações
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandas.map((demanda, index) => {
                        const profile = getProfileById(demanda.responsavel_id);
                        const setor = getSetorById(demanda.setor_id);
                        const canEditResponsavel =
                          user?.id === demanda.responsavel_id || isGestorOrAdmin;
                        const canEditGestor = isGestorOrAdmin;

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
                            canEditResponsavel={canEditResponsavel}
                            canEditGestor={canEditGestor}
                            canEditDemanda={isGestorOrAdmin}
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
    </AppLayout>
  );
}
