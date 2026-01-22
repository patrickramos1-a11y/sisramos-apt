import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useIsMobile } from "@/hooks/use-mobile";
import AppLayout from "@/components/layout/AppLayout";
import APTFilters from "@/components/apt/APTFilters";
import NovaDemandaDialog from "@/components/apt/NovaDemandaDialog";
import DemandaCard from "@/components/apt/DemandaCard";
import DemandaTableRow from "@/components/apt/DemandaTableRow";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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
    pendingCount,
    pendingApprovalCount,
  } = useDemandas();

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
                {demandas.map((demanda) => {
                  const profile = getProfileById(demanda.responsavel_id);
                  const setor = getSetorById(demanda.setor_id);
                  const canEditResponsavel =
                    user?.id === demanda.responsavel_id || isGestorOrAdmin;
                  const canEditGestor = isGestorOrAdmin;

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
                      canEditResponsavel={canEditResponsavel}
                      canEditGestor={canEditGestor}
                      onStatusResponsavelChange={() =>
                        updateStatusResponsavel(
                          demanda.id,
                          demanda.status_responsavel
                        )
                      }
                      onStatusGestorChange={() =>
                        updateStatusGestor(demanda.id, demanda.status_gestor)
                      }
                    />
                  );
                })}
              </div>
            ) : (
              /* Desktop: Table */
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-16">Nº</TableHead>
                      <TableHead className="w-24">Setor</TableHead>
                      <TableHead className="w-32">Responsável</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center w-20">Feito?</TableHead>
                      <TableHead className="text-center w-20">
                        Aprovado?
                      </TableHead>
                      <TableHead className="text-center w-12">X</TableHead>
                      <TableHead className="text-center w-16">Semana</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandas.map((demanda) => {
                      const profile = getProfileById(demanda.responsavel_id);
                      const setor = getSetorById(demanda.setor_id);
                      const canEditResponsavel =
                        user?.id === demanda.responsavel_id || isGestorOrAdmin;
                      const canEditGestor = isGestorOrAdmin;

                      return (
                        <DemandaTableRow
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
                          canEditResponsavel={canEditResponsavel}
                          canEditGestor={canEditGestor}
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
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
