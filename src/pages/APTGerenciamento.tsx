import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Building2, ClipboardList, Users, ChevronRight, Calendar } from "lucide-react";
import StatusBolinha from "@/components/apt/StatusBolinha";
import { cn } from "@/lib/utils";

interface ConsolidatedDemand {
  grupo_id: string | null;
  descricao: string;
  responsavel_id: string;
  setor_id: string | null;
  siblings: Array<{
    id: string;
    semana_limite: number[];
    status_responsavel: "pendente" | "executado" | "nao_realizado";
    status_gestor: "pendente" | "executado" | "nao_realizado";
  }>;
}

export default function APTGerenciamento() {
  const { isGestorOrAdmin } = useAuth();
  const {
    demandas,
    profiles,
    setores,
    isLoading,
    getProfileById,
    getSetorById,
  } = useDemandas();

  const [selectedDemand, setSelectedDemand] = useState<ConsolidatedDemand | null>(null);
  const [selectedSetor, setSelectedSetor] = useState<string | null>(null);

  // Consolidate demands - group by grupo_id or individual id
  const consolidatedDemands = useMemo(() => {
    const groupMap = new Map<string, ConsolidatedDemand>();
    
    demandas.forEach((d) => {
      const key = d.grupo_id || d.id;
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.siblings.push({
          id: d.id,
          semana_limite: d.semana_limite,
          status_responsavel: d.status_responsavel,
          status_gestor: d.status_gestor,
        });
      } else {
        groupMap.set(key, {
          grupo_id: d.grupo_id,
          descricao: d.descricao,
          responsavel_id: d.responsavel_id,
          setor_id: d.setor_id,
          siblings: [{
            id: d.id,
            semana_limite: d.semana_limite,
            status_responsavel: d.status_responsavel,
            status_gestor: d.status_gestor,
          }],
        });
      }
    });
    
    return Array.from(groupMap.values());
  }, [demandas]);

  // Stats by sector
  const sectorStats = useMemo(() => {
    const stats = new Map<string, { count: number; completed: number; pending: number }>();
    
    demandas.forEach((d) => {
      const setorId = d.setor_id || "sem-setor";
      const current = stats.get(setorId) || { count: 0, completed: 0, pending: 0 };
      current.count++;
      if (d.status_gestor === "executado") {
        current.completed++;
      } else {
        current.pending++;
      }
      stats.set(setorId, current);
    });
    
    return stats;
  }, [demandas]);

  // Demands filtered by selected sector
  const sectorDemands = useMemo(() => {
    if (!selectedSetor) return [];
    const setorId = selectedSetor === "sem-setor" ? null : selectedSetor;
    return demandas.filter((d) => d.setor_id === setorId);
  }, [demandas, selectedSetor]);

  if (!isGestorOrAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Acesso restrito a gestores e administradores.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de APT</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada de demandas e acompanhamento por setor
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Sector Cards */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Demandas por Setor
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Existing sectors */}
                {setores.map((setor) => {
                  const stats = sectorStats.get(setor.id) || { count: 0, completed: 0, pending: 0 };
                  const completionRate = stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0;
                  
                  return (
                    <Card 
                      key={setor.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                      onClick={() => setSelectedSetor(setor.id)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: setor.cor || "#E5E7EB" }}
                          />
                          {setor.nome}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-2xl font-bold">{stats.count}</p>
                            <p className="text-xs text-muted-foreground">demandas</p>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={completionRate === 100 ? "default" : "secondary"}>
                              {completionRate}% concluído
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {stats.pending} pendentes
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* "Sem Setor" card if there are demands without sector */}
                {sectorStats.has("sem-setor") && (
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-dashed"
                    onClick={() => setSelectedSetor("sem-setor")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-muted" />
                        Sem Setor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-2xl font-bold">
                            {sectorStats.get("sem-setor")?.count || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">demandas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            {/* Consolidated Demands */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Demandas Consolidadas
                <Badge variant="outline" className="ml-2">
                  {consolidatedDemands.length} únicas
                </Badge>
              </h2>
              
              <Card>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="text-center">Repetições</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consolidatedDemands.map((demand, idx) => {
                        const profile = getProfileById(demand.responsavel_id);
                        const setor = getSetorById(demand.setor_id);
                        
                        return (
                          <TableRow 
                            key={demand.grupo_id || idx}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedDemand(demand)}
                          >
                            <TableCell className="max-w-[300px]">
                              <p className="truncate">{demand.descricao}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {profile?.nome || "Desconhecido"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {setor ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: setor.cor || "#E5E7EB" }}
                                  />
                                  {setor.nome}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {demand.siblings.length}X
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </section>
          </>
        )}

        {/* Demand Siblings Dialog */}
        <Dialog open={!!selectedDemand} onOpenChange={() => setSelectedDemand(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Demanda</DialogTitle>
            </DialogHeader>
            {selectedDemand && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                  <p className="font-medium">{selectedDemand.descricao}</p>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Responsável</p>
                    <p className="font-medium">
                      {getProfileById(selectedDemand.responsavel_id)?.nome || "Desconhecido"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Setor</p>
                    <p className="font-medium">
                      {getSetorById(selectedDemand.setor_id)?.nome || "Sem setor"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Demandas Irmãs ({selectedDemand.siblings.length})
                  </p>
                  <div className="space-y-2">
                    {selectedDemand.siblings.map((sibling) => (
                      <div 
                        key={sibling.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {sibling.semana_limite.length > 1 
                              ? `Semanas ${sibling.semana_limite.join(", ")}`
                              : `Semana ${sibling.semana_limite[0]}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Feito:</span>
                            <StatusBolinha status={sibling.status_responsavel} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Aprovado:</span>
                            <StatusBolinha status={sibling.status_gestor} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Sector Details Dialog */}
        <Dialog open={!!selectedSetor} onOpenChange={() => setSelectedSetor(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedSetor && selectedSetor !== "sem-setor" ? (
                  <>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getSetorById(selectedSetor)?.cor || "#E5E7EB" }}
                    />
                    {getSetorById(selectedSetor)?.nome}
                  </>
                ) : (
                  "Sem Setor"
                )}
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectorDemands.map((d) => {
                    const profile = getProfileById(d.responsavel_id);
                    
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[250px]">
                          <p className="truncate">{d.descricao}</p>
                        </TableCell>
                        <TableCell>{profile?.nome || "Desconhecido"}</TableCell>
                        <TableCell>
                          {d.semana_limite.join(", ")}ª
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <StatusBolinha status={d.status_responsavel} />
                            <StatusBolinha status={d.status_gestor} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
