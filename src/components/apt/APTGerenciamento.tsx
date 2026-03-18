import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, Building2, ClipboardList, Users, ChevronRight, Calendar, 
  MoreVertical, Pencil, Trash2, Filter, ChevronDown, X, Star
} from "lucide-react";
import StatusBolinha from "@/components/apt/StatusBolinha";
import NovaDemandaDialog from "@/components/apt/NovaDemandaDialog";
import EditarDemandaIrmaDialog from "@/components/apt/EditarDemandaIrmaDialog";
import ExcluirDemandaIrmaDialog from "@/components/apt/ExcluirDemandaIrmaDialog";
import SolicitarExclusaoDialog from "@/components/apt/SolicitarExclusaoDialog";
import { useSolicitacoesExclusao } from "@/hooks/useSolicitacoesExclusao";
import { cn } from "@/lib/utils";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  cor?: string | null;
}

interface Setor {
  id: string;
  nome: string;
  cor: string;
}

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
  ativa: boolean;
}

interface ConsolidatedDemand {
  grupo_id: string | null;
  descricao: string;
  responsavel_id: string;
  setor_id: string | null;
  prioritaria: boolean;
  muito_urgente: boolean;
  mes: number;
  ano: number;
  siblings: Array<{
    id: string;
    numero: number;
    semana_limite: number[];
    status_responsavel: "pendente" | "executado" | "nao_realizado";
    status_gestor: "pendente" | "executado" | "nao_realizado";
    mes: number;
    ano: number;
    prioritaria: boolean;
    muito_urgente: boolean;
  }>;
}

interface GerenciamentoFilters {
  setores: string[];
  responsaveis: string[];
  prioridade: boolean; // Filter for starred sectors
  meses: string[];
  semanas: string[];
}

interface APTGerenciamentoProps {
  profiles: Profile[];
  setores: Setor[];
  onDemandaChange: () => void;
}

const meses = [
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

const semanaOptions = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

// Helper wrapper for MultiSelectDropdown with label
function LabeledMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Selecionar...",
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <MultiSelectDropdown
        options={options}
        selected={selected}
        onChange={onChange}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </div>
  );
}

export default function APTGerenciamento({
  profiles,
  setores,
  onDemandaChange,
}: APTGerenciamentoProps) {
  const { user, isGestorOrAdmin } = useAuth();
  
  // Fetch ALL demands from DB (not filtered by useDemandas hook)
  const [allDemandas, setAllDemandas] = useState<Demanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Starred/priority sectors (local state)
  const [starredSectors, setStarredSectors] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("apt-starred-sectors");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [selectedDemand, setSelectedDemand] = useState<ConsolidatedDemand | null>(null);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);

  // Filters
  const [filters, setFilters] = useState<GerenciamentoFilters>({
    setores: [],
    responsaveis: [],
    prioridade: false, // Only show starred sectors
    meses: [String(new Date().getMonth() + 1)],
    semanas: [],
  });

  // Edit/Delete states
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

  const { pendingDemandaIds, refetchSolicitacoes } = useSolicitacoesExclusao();

  // Save starred sectors to localStorage
  useEffect(() => {
    localStorage.setItem("apt-starred-sectors", JSON.stringify([...starredSectors]));
  }, [starredSectors]);

  const toggleSectorStar = (setorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredSectors(prev => {
      const next = new Set(prev);
      if (next.has(setorId)) {
        next.delete(setorId);
      } else {
        next.add(setorId);
      }
      return next;
    });
  };

  // Fetch all demands (with only month/year filter for relevance)
  const fetchAllDemandas = useCallback(async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("demandas")
      .select("*")
      .eq("ativa", true)
      .order("numero", { ascending: true });

    // Colaboradores só veem suas próprias demandas
    if (!isGestorOrAdmin && user) {
      query = query.eq("responsavel_id", user.id);
    }

    // Apply filters
    if (filters.meses.length > 0) {
      query = query.in("mes", filters.meses.map(m => parseInt(m)));
    }
    if (filters.setores.length > 0) {
      query = query.in("setor_id", filters.setores);
    }
    if (filters.responsaveis.length > 0) {
      query = query.in("responsavel_id", filters.responsaveis);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching all demands:", error);
      setAllDemandas([]);
    } else {
      let filteredData = data || [];
      
      // Client-side filter for semanas
      if (filters.semanas.length > 0) {
        const semanaNumbers = filters.semanas.map(s => parseInt(s));
        filteredData = filteredData.filter(d =>
          d.semana_limite.some((sl: number) => semanaNumbers.includes(sl))
        );
      }
      
      setAllDemandas(filteredData);
    }
    
    setIsLoading(false);
  }, [filters.meses, filters.setores, filters.responsaveis, filters.semanas, isGestorOrAdmin, user]);

  useEffect(() => {
    fetchAllDemandas();
  }, [fetchAllDemandas]);

  // Consolidate demands
  // Groups by grupo_id when available; otherwise by descricao+responsavel+mes+ano.
  // This handles rollover-created demandas where grupo_id wasn't preserved.
  const consolidatedDemands = useMemo(() => {
    const groupMap = new Map<string, ConsolidatedDemand>();
    
    allDemandas.forEach((d) => {
      const key = d.grupo_id
        ? d.grupo_id
        : `${d.descricao.toLowerCase().trim()}|${d.responsavel_id}|${d.mes}|${d.ano}`;
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.siblings.push({
          id: d.id,
          numero: d.numero,
          semana_limite: d.semana_limite,
          status_responsavel: d.status_responsavel,
          status_gestor: d.status_gestor,
          mes: d.mes,
          ano: d.ano,
          prioritaria: d.prioritaria,
          muito_urgente: d.muito_urgente || false,
        });
      } else {
        groupMap.set(key, {
          grupo_id: d.grupo_id,
          descricao: d.descricao,
          responsavel_id: d.responsavel_id,
          setor_id: d.setor_id,
          prioritaria: d.prioritaria,
          muito_urgente: d.muito_urgente || false,
          mes: d.mes,
          ano: d.ano,
          siblings: [{
            id: d.id,
            numero: d.numero,
            semana_limite: d.semana_limite,
            status_responsavel: d.status_responsavel,
            status_gestor: d.status_gestor,
            mes: d.mes,
            ano: d.ano,
            prioritaria: d.prioritaria,
            muito_urgente: d.muito_urgente || false,
          }],
        });
      }
    });
    
    return Array.from(groupMap.values());
  }, [allDemandas]);

  // Stats by sector
  const sectorStats = useMemo(() => {
    const stats = new Map<string, { 
      count: number; 
      completed: number; 
      pending: number;
      responsaveis: Set<string>;
    }>();
    
    allDemandas.forEach((d) => {
      const setorId = d.setor_id || "sem-setor";
      const current = stats.get(setorId) || { 
        count: 0, 
        completed: 0, 
        pending: 0,
        responsaveis: new Set<string>()
      };
      current.count++;
      if (d.status_gestor === "executado") {
        current.completed++;
      } else {
        current.pending++;
      }
      current.responsaveis.add(d.responsavel_id);
      stats.set(setorId, current);
    });
    
    return stats;
  }, [allDemandas]);

  // Demands for selected sector (consolidated view)
  const sectorConsolidatedDemands = useMemo(() => {
    if (!selectedSetor) return [];
    const setorId = selectedSetor.id === "sem-setor" ? null : selectedSetor.id;
    
    const sectorDemandas = allDemandas.filter((d) => 
      selectedSetor.id === "sem-setor" ? d.setor_id === null : d.setor_id === setorId
    );
    
    // Consolidate
    const groupMap = new Map<string, ConsolidatedDemand>();
    
    sectorDemandas.forEach((d) => {
      const key = d.grupo_id
        ? d.grupo_id
        : `${d.descricao.toLowerCase().trim()}|${d.responsavel_id}|${d.mes}|${d.ano}`;
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.siblings.push({
          id: d.id,
          numero: d.numero,
          semana_limite: d.semana_limite,
          status_responsavel: d.status_responsavel,
          status_gestor: d.status_gestor,
          mes: d.mes,
          ano: d.ano,
          prioritaria: d.prioritaria,
          muito_urgente: d.muito_urgente || false,
        });
      } else {
        groupMap.set(key, {
          grupo_id: d.grupo_id,
          descricao: d.descricao,
          responsavel_id: d.responsavel_id,
          setor_id: d.setor_id,
          prioritaria: d.prioritaria,
          muito_urgente: d.muito_urgente || false,
          mes: d.mes,
          ano: d.ano,
          siblings: [{
            id: d.id,
            numero: d.numero,
            semana_limite: d.semana_limite,
            status_responsavel: d.status_responsavel,
            status_gestor: d.status_gestor,
            mes: d.mes,
            ano: d.ano,
            prioritaria: d.prioritaria,
            muito_urgente: d.muito_urgente || false,
          }],
        });
      }
    });
    
    return Array.from(groupMap.values());
  }, [allDemandas, selectedSetor]);

  // Filtered sectors based on priority filter
  const filteredSetores = useMemo(() => {
    if (!filters.prioridade) return setores;
    return setores.filter(s => starredSectors.has(s.id));
  }, [setores, filters.prioridade, starredSectors]);

  const getProfileById = useCallback((userId: string) => {
    return profiles.find((p) => p.user_id === userId);
  }, [profiles]);

  const getSetorById = useCallback((setorId: string | null) => {
    if (!setorId) return null;
    return setores.find((s) => s.id === setorId);
  }, [setores]);

  const getDemandaById = useCallback((id: string) => {
    return allDemandas.find((d) => d.id === id);
  }, [allDemandas]);

  const getSiblingCount = useCallback((grupoId: string | null) => {
    if (!grupoId) return 1;
    return allDemandas.filter((d) => d.grupo_id === grupoId).length;
  }, [allDemandas]);

  const handleDemandaChange = () => {
    fetchAllDemandas();
    onDemandaChange();
    refetchSolicitacoes();
  };

  const handleDeleteClick = (demanda: { id: string; numero: number; grupo_id: string | null; descricao: string; responsavel_id: string; mes: number; ano: number; semanas_repeticao: number }) => {
    if (isGestorOrAdmin) {
      setDeletingDemanda(demanda);
    } else {
      setSolicitandoExclusao(demanda);
    }
  };

  const clearFilters = () => {
    setFilters({
      setores: [],
      responsaveis: [],
      prioridade: false,
      meses: [],
      semanas: [],
    });
  };

  const hasActiveFilters = 
    filters.setores.length > 0 ||
    filters.responsaveis.length > 0 ||
    filters.prioridade ||
    filters.meses.length > 0 ||
    filters.semanas.length > 0;

  const responsavelOptions = profiles.map((p) => ({
    value: p.user_id,
    label: p.nome,
  }));

  const setorOptions = setores.map((s) => ({
    value: s.id,
    label: s.nome,
  }));

  // Get siblings for delete dialog
  const deletingSiblings = deletingDemanda?.grupo_id
    ? allDemandas
        .filter((d) => d.grupo_id === deletingDemanda.grupo_id)
        .map((d) => ({
          id: d.id,
          numero: d.numero,
          descricao: d.descricao,
          semana_limite: d.semana_limite,
        }))
    : [];

  const editingSiblingCount = editingDemanda
    ? getSiblingCount(editingDemanda.grupo_id)
    : 1;

  const deletingSiblingCount = deletingDemanda
    ? getSiblingCount(deletingDemanda.grupo_id)
    : 1;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  // Demand row component for consolidated view
  const ConsolidatedDemandRow = ({ demand, showActions = true }: { demand: ConsolidatedDemand; showActions?: boolean }) => {
    const profile = getProfileById(demand.responsavel_id);
    const setor = getSetorById(demand.setor_id);
    const firstSibling = demand.siblings[0];
    
    // Colaboradores não podem editar/excluir
    const canShowActions = true; // All users can now see actions
    const hasPendingExclusao = demand.siblings.some(s => pendingDemandaIds.has(s.id));
    
    return (
      <TableRow 
        className={cn(
          "cursor-pointer hover:bg-muted/50",
          demand.muito_urgente && "bg-[hsl(var(--apt-muito-urgente))]/30",
          demand.prioritaria && !demand.muito_urgente && "bg-[hsl(var(--apt-priority))]/30"
        )}
        onClick={() => setSelectedDemand(demand)}
      >
        <TableCell className="max-w-[300px]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="whitespace-normal break-words">{demand.descricao}</p>
            {hasPendingExclusao && (
              <span className="inline-flex items-center rounded-full bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                Aguardando exclusão
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar 
              className="h-6 w-6 border border-background"
              style={{ backgroundColor: profile?.cor || '#6B7280' }}
            >
              <AvatarFallback 
                className="text-[10px] text-white bg-transparent"
                style={{ backgroundColor: profile?.cor || '#6B7280' }}
              >
                {profile ? getInitials(profile.nome) : "?"}
              </AvatarFallback>
            </Avatar>
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
        {canShowActions && (
          <TableCell>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const demanda = getDemandaById(firstSibling.id);
                      if (demanda) setEditingDemanda(demanda);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const fullDemanda = getDemandaById(firstSibling.id);
                      if (fullDemanda) {
                        handleDeleteClick(fullDemanda);
                      }
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </TableCell>
        )}
        {!canShowActions && showActions && (
          <TableCell>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </TableCell>
        )}
      </TableRow>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-3">
        {/* Desktop: horizontal + always visible */}
        <Card className="hidden lg:block p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-[200px]">
              <LabeledMultiSelect
                label="Setores"
                options={setorOptions}
                selected={filters.setores}
                onChange={(v) => setFilters((prev) => ({ ...prev, setores: v }))}
                placeholder="Todos"
              />
            </div>

            <div className="w-[200px]">
              <LabeledMultiSelect
                label="Responsáveis"
                options={responsavelOptions}
                selected={filters.responsaveis}
                onChange={(v) => setFilters((prev) => ({ ...prev, responsaveis: v }))}
                placeholder="Todos"
              />
            </div>

            <div className="w-[180px]">
              <LabeledMultiSelect
                label="Meses"
                options={meses}
                selected={filters.meses}
                onChange={(v) => setFilters((prev) => ({ ...prev, meses: v }))}
                placeholder="Todos"
              />
            </div>

            <div className="w-[180px]">
              <LabeledMultiSelect
                label="Semanas"
                options={semanaOptions}
                selected={filters.semanas}
                onChange={(v) => setFilters((prev) => ({ ...prev, semanas: v }))}
                placeholder="Todas"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Prioridade (cards com estrela)</Label>
              <div className="flex items-center gap-2 h-8">
                <Checkbox
                  id="prioridade"
                  checked={filters.prioridade}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({ ...prev, prioridade: checked as boolean }))
                  }
                />
                <Label
                  htmlFor="prioridade"
                  className="text-xs cursor-pointer flex items-center gap-1"
                >
                  <Star className="h-3 w-3 text-destructive fill-destructive" />
                  Apenas prioritários
                </Label>
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-destructive hover:text-destructive"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </Card>

        {/* Mobile: drawer */}
        <div className="flex flex-wrap items-end gap-3 lg:hidden">
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
            <SheetContent side="left" className="w-72 flex flex-col">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
                <div className="space-y-4 pb-6">
                  <LabeledMultiSelect
                    label="Setores"
                    options={setorOptions}
                    selected={filters.setores}
                    onChange={(v) => setFilters((prev) => ({ ...prev, setores: v }))}
                    placeholder="Todos"
                  />

                  <LabeledMultiSelect
                    label="Responsáveis"
                    options={responsavelOptions}
                    selected={filters.responsaveis}
                    onChange={(v) => setFilters((prev) => ({ ...prev, responsaveis: v }))}
                    placeholder="Todos"
                  />

                  <LabeledMultiSelect
                    label="Meses"
                    options={meses}
                    selected={filters.meses}
                    onChange={(v) => setFilters((prev) => ({ ...prev, meses: v }))}
                    placeholder="Todos"
                  />

                  <LabeledMultiSelect
                    label="Semanas"
                    options={semanaOptions}
                    selected={filters.semanas}
                    onChange={(v) => setFilters((prev) => ({ ...prev, semanas: v }))}
                    placeholder="Todas"
                  />

                  <div className="space-y-2">
                    <Label className="text-xs">Prioridade (cards com estrela)</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="prioridade"
                        checked={filters.prioridade}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({ ...prev, prioridade: checked as boolean }))
                        }
                      />
                      <Label
                        htmlFor="prioridade"
                        className="text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Star className="h-3 w-3 text-destructive fill-destructive" />
                        Apenas prioritários
                      </Label>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
 
          {/* Active filter badges (mobile) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1">
              {filters.meses.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.meses.length} mês(es)
                </Badge>
              )}
              {filters.setores.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.setores.length} setor(es)
                </Badge>
              )}
              {filters.responsaveis.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.responsaveis.length} resp.
                </Badge>
              )}
              {filters.prioridade && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Star className="h-3 w-3 fill-destructive text-destructive" />
                  Prioritários
                </Badge>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Sector Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Demandas por Setor
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSetores.map((setor) => {
            const stats = sectorStats.get(setor.id) || { 
              count: 0, 
              completed: 0, 
              pending: 0,
              responsaveis: new Set<string>()
            };
            const completionRate = stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0;
            const isStarred = starredSectors.has(setor.id);
            
            // Get responsible users for this sector
            const responsaveisArray = Array.from(stats.responsaveis);
            
            return (
              <Card 
                key={setor.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] relative",
                  isStarred && "ring-2 ring-destructive shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                )}
                onClick={() => setSelectedSetor(setor)}
              >
                {/* Star toggle button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 z-10"
                  onClick={(e) => toggleSectorStar(setor.id, e)}
                >
                  <Star 
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isStarred ? "fill-destructive text-destructive" : "text-muted-foreground"
                    )} 
                  />
                </Button>
                
                <CardHeader className="pb-2 pr-10">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: setor.cor || "#E5E7EB" }}
                    />
                    <span className="truncate">{setor.nome}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
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
                  
                  {/* Responsáveis avatars */}
                  {responsaveisArray.length > 0 && (
                    <div className="flex items-center gap-1 pt-2 border-t">
                      <TooltipProvider>
                        <div className="flex -space-x-2">
                          {responsaveisArray.slice(0, 4).map((userId) => {
                            const profile = getProfileById(userId);
                            if (!profile) return null;
                            return (
                              <Tooltip key={userId}>
                                <TooltipTrigger asChild>
                                  <Avatar 
                                    className="h-6 w-6 border-2 border-background"
                                    style={{ backgroundColor: profile.cor || '#6B7280' }}
                                  >
                                    <AvatarFallback 
                                      className="text-[10px] text-white bg-transparent"
                                      style={{ backgroundColor: profile.cor || '#6B7280' }}
                                    >
                                      {getInitials(profile.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{profile.nome}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                          {responsaveisArray.length > 4 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-background">
                                  <AvatarFallback className="text-[10px] bg-muted">
                                    +{responsaveisArray.length - 4}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {responsaveisArray.slice(4).map(id => getProfileById(id)?.nome).join(", ")}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                      <span className="text-xs text-muted-foreground ml-1">
                        {responsaveisArray.length} {responsaveisArray.length === 1 ? "responsável" : "responsáveis"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {/* "Sem Setor" card */}
          {sectorStats.has("sem-setor") && !filters.prioridade && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-dashed"
              onClick={() => setSelectedSetor({ id: "sem-setor", nome: "Sem Setor", cor: "#E5E7EB" } as Setor)}
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


      {/* Demand Siblings Dialog */}
      <Dialog open={!!selectedDemand} onOpenChange={() => setSelectedDemand(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDemand?.setor_id && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSetorById(selectedDemand.setor_id)?.cor || "#E5E7EB" }}
                />
              )}
              {getSetorById(selectedDemand?.setor_id || null)?.nome || "Sem Setor"}
            </DialogTitle>
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
                  Demandas ({selectedDemand.siblings.length})
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
                            : `${sibling.semana_limite[0]}ª Semana`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Feito:</span>
                          <StatusBolinha status={sibling.status_responsavel} />
                        </div>
                        {isGestorOrAdmin && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Aprovado:</span>
                            <StatusBolinha status={sibling.status_gestor} />
                          </div>
                        )}
                        {true && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  const demanda = getDemandaById(sibling.id);
                                  if (demanda) {
                                    setSelectedDemand(null);
                                    setEditingDemanda(demanda);
                                  }
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedDemand(null);
                      const fullDemanda = getDemandaById(sibling.id);
                      if (fullDemanda) {
                        handleDeleteClick(fullDemanda);
                      }
                    }}
                    className="text-destructive"
                  >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col min-h-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedSetor?.cor || "#E5E7EB" }}
                />
                {selectedSetor?.nome || "Sem Setor"}
              </div>
              {true && (
                <NovaDemandaDialog
                  profiles={profiles}
                  setores={setores}
                  onDemandaCriada={handleDemandaChange}
                  lockedSetorId={selectedSetor?.id !== "sem-setor" ? selectedSetor?.id : undefined}
                />
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-center">Repetições</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorConsolidatedDemands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma demanda neste setor
                    </TableCell>
                  </TableRow>
                ) : (
                  sectorConsolidatedDemands.map((demand, idx) => (
                    <ConsolidatedDemandRow key={demand.grupo_id || idx} demand={demand} />
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditarDemandaIrmaDialog
        open={!!editingDemanda}
        onOpenChange={(open) => !open && setEditingDemanda(null)}
        demanda={editingDemanda}
        profiles={profiles}
        setores={setores}
        siblingCount={editingSiblingCount}
        onDemandaEditada={handleDemandaChange}
      />

      {/* Delete Dialog */}
      <ExcluirDemandaIrmaDialog
        open={!!deletingDemanda}
        onOpenChange={(open) => !open && setDeletingDemanda(null)}
        demandaId={deletingDemanda?.id || null}
        demandaNumero={deletingDemanda?.numero || null}
        grupoId={deletingDemanda?.grupo_id || null}
        siblingCount={deletingSiblingCount}
        siblings={deletingSiblings}
        onDemandaExcluida={handleDemandaChange}
      />

      {/* Solicitar Exclusão Dialog (colaborador) */}
      {solicitandoExclusao && (
        <SolicitarExclusaoDialog
          open={!!solicitandoExclusao}
          onOpenChange={(open) => !open && setSolicitandoExclusao(null)}
          demandaId={solicitandoExclusao.id}
          demandaNumero={solicitandoExclusao.numero}
          grupoId={solicitandoExclusao.grupo_id}
          siblingCount={getSiblingCount(solicitandoExclusao.grupo_id)}
          demandaDescricao={solicitandoExclusao.descricao}
          demandaResponsavelId={solicitandoExclusao.responsavel_id}
          demandaMes={solicitandoExclusao.mes}
          demandaAno={solicitandoExclusao.ano}
          demandaSemanasRepeticao={solicitandoExclusao.semanas_repeticao}
          onSolicitacaoEnviada={handleDemandaChange}
        />
      )}
    </div>
  );
}
