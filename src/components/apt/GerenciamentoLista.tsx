import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2, ClipboardList, Users, ChevronRight, 
  MoreVertical, Pencil, Trash2, ChevronDown, X, Search,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import StatusBolinha from "@/components/apt/StatusBolinha";
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
  cor?: string;
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

interface GerenciamentoListaProps {
  profiles: Profile[];
  setores: Setor[];
  onDemandaChange: () => void;
}

// Multi-select dropdown component
function MultiSelectDropdown({
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
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || selected[0];
    }
    return `${selected.length} selecionados`;
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            size="sm"
            className={cn(
              "w-full justify-between font-normal h-9",
              selected.length > 0 && "text-foreground"
            )}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full min-w-[180px] p-0 bg-popover border shadow-lg z-50" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleOption(option.value);
                }}
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  className="pointer-events-none h-4 w-4"
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
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

const repeticaoOptions = [
  { value: "1", label: "1X" },
  { value: "2", label: "2X" },
  { value: "3", label: "3X" },
  { value: "4", label: "4X" },
  { value: "5", label: "5X" },
];

export default function GerenciamentoLista({
  profiles,
  setores,
  onDemandaChange,
}: GerenciamentoListaProps) {
  const { user, isGestorOrAdmin, role } = useAuth();
  const isColaborador = role === "colaborador";
  
  const [allDemandas, setAllDemandas] = useState<Demanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState<ConsolidatedDemand | null>(null);

  // Fixed filters - always visible
  const [filters, setFilters] = useState({
    responsaveis: [] as string[],
    setores: [] as string[],
    repeticoes: [] as string[],
    busca: "",
    meses: [String(new Date().getMonth() + 1)],
  });

  // Sorting
  const [sortColumn, setSortColumn] = useState<"descricao" | "responsavel" | "setor" | "repeticao" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumn(null); setSortDirection("asc"); }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

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

  // Fetch all demands
  const fetchAllDemandas = useCallback(async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("demandas")
      .select("*")
      .eq("ativa", true)
      .order("numero", { ascending: true });

    // Apply month filter
    if (filters.meses.length > 0) {
      query = query.in("mes", filters.meses.map(m => parseInt(m)));
    }

    // For colaboradores, only show their own demands
    if (isColaborador && user?.id) {
      query = query.eq("responsavel_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching demands:", error);
      setAllDemandas([]);
    } else {
      setAllDemandas(data || []);
    }
    
    setIsLoading(false);
  }, [filters.meses, isColaborador, user?.id]);

  useEffect(() => {
    fetchAllDemandas();
  }, [fetchAllDemandas]);

  // Apply client-side filters
  const filteredDemandas = useMemo(() => {
    let result = allDemandas;

    // Filter by responsavel
    if (filters.responsaveis.length > 0) {
      result = result.filter(d => filters.responsaveis.includes(d.responsavel_id));
    }

    // Filter by setor
    if (filters.setores.length > 0) {
      result = result.filter(d => d.setor_id && filters.setores.includes(d.setor_id));
    }

    // Filter by search term
    if (filters.busca.trim()) {
      const searchLower = filters.busca.toLowerCase();
      result = result.filter(d => d.descricao.toLowerCase().includes(searchLower));
    }

    return result;
  }, [allDemandas, filters]);

  // Consolidate demands
  // Groups by grupo_id when available, otherwise by descricao+responsavel+mes+ano
  const consolidatedDemands = useMemo(() => {
    const groupMap = new Map<string, ConsolidatedDemand>();
    
    filteredDemandas.forEach((d) => {
      // Use grupo_id if available, otherwise create a composite key
      // This handles cases where rollover didn't preserve grupo_id
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
    
    let result = Array.from(groupMap.values());

    // Filter by repetitions
    if (filters.repeticoes.length > 0) {
      const repNums = filters.repeticoes.map(r => parseInt(r));
      result = result.filter(d => repNums.includes(d.siblings.length));
    }

    return result;
  }, [filteredDemandas, filters.repeticoes]);

  const getProfileById = useCallback((userId: string) => {
    return profiles.find((p) => p.user_id === userId);
  }, [profiles]);

  const getSetorById = useCallback((setorId: string | null) => {
    if (!setorId) return null;
    return setores.find((s) => s.id === setorId);
  }, [setores]);

  // Apply sorting
  const sortedDemands = useMemo(() => {
    if (!sortColumn) return consolidatedDemands;
    const sorted = [...consolidatedDemands].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "descricao":
          cmp = a.descricao.localeCompare(b.descricao, "pt-BR");
          break;
        case "responsavel": {
          const na = getProfileById(a.responsavel_id)?.nome || "";
          const nb = getProfileById(b.responsavel_id)?.nome || "";
          cmp = na.localeCompare(nb, "pt-BR");
          break;
        }
        case "setor": {
          const sa = getSetorById(a.setor_id)?.nome || "";
          const sb = getSetorById(b.setor_id)?.nome || "";
          cmp = sa.localeCompare(sb, "pt-BR");
          break;
        }
        case "repeticao":
          cmp = a.siblings.length - b.siblings.length;
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [consolidatedDemands, sortColumn, sortDirection, getProfileById, getSetorById]);

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

  // Helper: route delete action based on role
  const handleDeleteClick = (demanda: { id: string; numero: number; grupo_id: string | null; descricao: string; responsavel_id: string; mes: number; ano: number; semanas_repeticao: number }) => {
    if (isGestorOrAdmin) {
      setDeletingDemanda(demanda);
    } else {
      setSolicitandoExclusao(demanda);
    }
  };

  const clearFilters = () => {
    setFilters({
      responsaveis: [],
      setores: [],
      repeticoes: [],
      busca: "",
      meses: [String(new Date().getMonth() + 1)],
    });
  };

  const hasActiveFilters = 
    filters.responsaveis.length > 0 ||
    filters.setores.length > 0 ||
    filters.repeticoes.length > 0 ||
    filters.busca.trim() !== "";

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

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  // Consolidated row component
  const ConsolidatedDemandRow = ({ demand }: { demand: ConsolidatedDemand }) => {
    const profile = getProfileById(demand.responsavel_id);
    const setor = getSetorById(demand.setor_id);
    const firstSibling = demand.siblings[0];
    const showActions = true; // All users can now see actions
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
              className="h-6 w-6 border"
              style={{ 
                borderColor: profile?.cor || "#6B7280",
                backgroundColor: `${profile?.cor || "#6B7280"}20`
              }}
            >
              <AvatarFallback 
                className="text-[10px] font-medium"
                style={{ color: profile?.cor || "#6B7280" }}
              >
                {getInitials(profile?.nome || "?")}
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
        {showActions && (
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
    <div className="space-y-4">
      {/* Fixed Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-[300px] space-y-1">
            <Label className="text-xs font-medium">Buscar demanda</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={filters.busca}
                onChange={(e) => setFilters(prev => ({ ...prev, busca: e.target.value }))}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Responsavel filter */}
          <div className="w-[180px]">
            <MultiSelectDropdown
              label="Responsável"
              options={responsavelOptions}
              selected={filters.responsaveis}
              onChange={(v) => setFilters(prev => ({ ...prev, responsaveis: v }))}
              placeholder="Todos"
            />
          </div>

          {/* Setor filter */}
          <div className="w-[180px]">
            <MultiSelectDropdown
              label="Setor"
              options={setorOptions}
              selected={filters.setores}
              onChange={(v) => setFilters(prev => ({ ...prev, setores: v }))}
              placeholder="Todos"
            />
          </div>

          {/* Repetições filter */}
          <div className="w-[140px]">
            <MultiSelectDropdown
              label="Repetições"
              options={repeticaoOptions}
              selected={filters.repeticoes}
              onChange={(v) => setFilters(prev => ({ ...prev, repeticoes: v }))}
              placeholder="Todas"
            />
          </div>

          {/* Mês filter */}
          <div className="w-[160px]">
            <MultiSelectDropdown
              label="Mês"
              options={meses}
              selected={filters.meses}
              onChange={(v) => setFilters(prev => ({ ...prev, meses: v }))}
              placeholder="Todos"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {/* Demands Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Demandas Consolidadas
          <Badge variant="outline" className="ml-2 font-normal">
            {consolidatedDemands.length} únicas
          </Badge>
        </h2>
        
        <Card>
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("descricao")}>
                    <div className="flex items-center gap-1">
                      Descrição
                      {sortColumn === "descricao" ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("responsavel")}>
                    <div className="flex items-center gap-1">
                      Responsável
                      {sortColumn === "responsavel" ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("setor")}>
                    <div className="flex items-center gap-1">
                      Setor
                      {sortColumn === "setor" ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-24 cursor-pointer select-none" onClick={() => handleSort("repeticao")}>
                    <div className="flex items-center justify-center gap-1">
                      Repetição
                      {sortColumn === "repeticao" ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDemands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma demanda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDemands.map((demand) => (
                    <ConsolidatedDemandRow key={demand.grupo_id || demand.siblings[0].id} demand={demand} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* Demand Detail Dialog */}
      <Dialog open={selectedDemand !== null} onOpenChange={() => setSelectedDemand(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Demanda</DialogTitle>
          </DialogHeader>
          {selectedDemand && (
            <div className="space-y-4">
              <p className="text-sm">{selectedDemand.descricao}</p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Responsável: </span>
                  {getProfileById(selectedDemand.responsavel_id)?.nome || "Desconhecido"}
                </div>
                <div>
                  <span className="text-muted-foreground">Setor: </span>
                  {getSetorById(selectedDemand.setor_id)?.nome || "-"}
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead>Feito</TableHead>
                    {isGestorOrAdmin && <TableHead>Aprovado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDemand.siblings.map((sibling) => (
                    <TableRow key={sibling.id}>
                      <TableCell>#{sibling.numero}</TableCell>
                      <TableCell>{sibling.semana_limite.join(", ")}ª</TableCell>
                      <TableCell>
                        <StatusBolinha
                          status={sibling.status_responsavel}
                          disabled={true}
                        />
                      </TableCell>
                      {isGestorOrAdmin && (
                        <TableCell>
                          <StatusBolinha
                            status={sibling.status_gestor}
                            disabled={true}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingDemanda && (
        <EditarDemandaIrmaDialog
          open={!!editingDemanda}
          onOpenChange={(open) => !open && setEditingDemanda(null)}
          demanda={editingDemanda}
          profiles={profiles}
          setores={setores}
          siblingCount={editingSiblingCount}
          onDemandaEditada={handleDemandaChange}
        />
      )}

      {/* Delete Dialog */}
      {deletingDemanda && (
        <ExcluirDemandaIrmaDialog
          open={!!deletingDemanda}
          onOpenChange={(open) => !open && setDeletingDemanda(null)}
          demandaId={deletingDemanda.id}
          demandaNumero={deletingDemanda.numero}
          grupoId={deletingDemanda.grupo_id}
          siblingCount={deletingSiblingCount}
          siblings={deletingSiblings}
          onDemandaExcluida={handleDemandaChange}
        />
      )}

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
