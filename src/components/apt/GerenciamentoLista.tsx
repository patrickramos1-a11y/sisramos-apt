import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, ChevronRight, MoreVertical, Pencil, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, Flame, Star, Group, ChevronDown, RefreshCw, Repeat,
} from "lucide-react";
import StatusBolinha from "@/components/apt/StatusBolinha";
import EditarDemandaIrmaDialog from "@/components/apt/EditarDemandaIrmaDialog";
import ExcluirDemandaIrmaDialog from "@/components/apt/ExcluirDemandaIrmaDialog";
import SolicitarExclusaoDialog from "@/components/apt/SolicitarExclusaoDialog";
import DuplicarDemandasEmMassaDialog from "@/components/apt/DuplicarDemandasEmMassaDialog";
import TransformarDemandaPersistenteDialog from "@/components/apt/TransformarDemandaPersistenteDialog";
import { useSolicitacoesExclusao } from "@/hooks/useSolicitacoesExclusao";
import { useBulkDemandaActions } from "@/hooks/useBulkDemandaActions";
import { useAptRotinas } from "@/hooks/useAptRotinas";
import { cn } from "@/lib/utils";
import FiltersBar, { ListaFilters, MESES_FULL } from "./gerenciamento/FiltersBar";
import BulkActionsBar from "./gerenciamento/BulkActionsBar";
import { InlinePicker } from "./gerenciamento/InlinePickers";
import { AptTag, uniqueTags } from "@/lib/tags";
import TransformarDemandaPrazoDialog from "@/components/apt/TransformarDemandaPrazoDialog";
import {
  DemandaModoExecucao,
  buildPrazoWeeks,
  clearDemandasPrazoMeta,
  formatPrazoWindow,
  isDemandaPrazo,
  isPrazoColumnMissingError,
  mergeDemandasPrazoMeta,
  saveDemandasPrazoMeta,
} from "@/lib/demandas-prazo";

interface Profile { id: string; user_id: string; nome: string; cor?: string | null; }
interface Setor { id: string; nome: string; cor: string; }
interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  observacoes?: string | null;
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
  modo_execucao?: DemandaModoExecucao | null;
  semana_inicio_prazo?: number | null;
  semana_fim_prazo?: number | null;
  tags?: AptTag[];
}

interface ConsolidatedDemand {
  key: string;
  grupo_id: string | null;
  descricao: string;
  responsavel_id: string;
  setor_id: string | null;
  prioritaria: boolean;
  muito_urgente: boolean;
  modo_execucao?: DemandaModoExecucao | null;
  semana_inicio_prazo?: number | null;
  semana_fim_prazo?: number | null;
  mes: number;
  ano: number;
  siblings: Demanda[];
  tags: AptTag[];
}

type GroupBy = "nenhum" | "responsavel" | "setor" | "setor_responsavel";
type SortCol = "descricao" | "responsavel" | "setor" | "repeticao" | "semana" | null;

interface Props {
  profiles: Profile[];
  setores: Setor[];
  onDemandaChange: () => void;
}

const STORAGE_KEY = "gerenciamento-lista-prefs";
const DESC_MIN = 260;
const DESC_MAX = 900;
const DESC_DEFAULT = 520;

const DEFAULT_FILTERS: ListaFilters = {
  busca: "",
  meses: [String(new Date().getMonth() + 1)],
  semanas: [],
  responsaveis: [],
  setores: [],
  repeticoes: [],
  urgente: false,
  prioridade: false,
  pendenteAprovacao: false,
  todosOsMeses: false,
  tags: [],
};

export default function GerenciamentoLista({ profiles, setores, onDemandaChange }: Props) {
  const { user, isGestorOrAdmin, role } = useAuth();
  const { toast } = useToast();
  const isColaborador = role === "colaborador";

  const prefs = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [filters, setFilters] = useState<ListaFilters>({ ...DEFAULT_FILTERS, ...(prefs?.filters ?? {}) });
  const [groupBy, setGroupBy] = useState<GroupBy>(prefs?.groupBy ?? "nenhum");
  const [descWidth, setDescWidth] = useState<number>(() => {
    const w = Number(prefs?.descWidth);
    return Number.isFinite(w) && w >= DESC_MIN && w <= DESC_MAX ? w : DESC_DEFAULT;
  });
  const [sortColumn, setSortColumn] = useState<SortCol>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDemand, setSelectedDemand] = useState<ConsolidatedDemand | null>(null);
  const [manualOrderIds, setManualOrderIds] = useState<string[]>([]);
  const [hasPendingReorder, setHasPendingReorder] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [frozenVisibleIds, setFrozenVisibleIds] = useState<Set<string> | null>(null);
  const [appliedFilterSignature, setAppliedFilterSignature] = useState("");

  const [allDemandas, setAllDemandas] = useState<Demanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [deletingDemanda, setDeletingDemanda] = useState<{ id: string; numero: number; grupo_id: string | null } | null>(null);
  const [solicitandoExclusao, setSolicitandoExclusao] = useState<{ id: string; numero: number; grupo_id: string | null; descricao: string; responsavel_id: string; mes: number; ano: number; semanas_repeticao: number } | null>(null);
  const [duplicandoIds, setDuplicandoIds] = useState<string[] | null>(null);
  const [showPrazoDialog, setShowPrazoDialog] = useState(false);
  const [isSavingPrazoDialog, setIsSavingPrazoDialog] = useState(false);
  const [transformingPersistenteDemanda, setTransformingPersistenteDemanda] = useState<Demanda | null>(null);
  const [transformingPersistenteMode, setTransformingPersistenteMode] = useState<"single" | "bulk">("single");
  const [isSavingPersistenteDialog, setIsSavingPersistenteDialog] = useState(false);
  const [isBulkTransformingPersistente, setIsBulkTransformingPersistente] = useState(false);

  const { pendingDemandaIds, refetchSolicitacoes } = useSolicitacoesExclusao();
  const {
    modelos: rotinaModelos,
    createModelo: createRotinaModelo,
    gerarOcorrenciasDoPeriodo,
  } = useAptRotinas({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    semanas: [1, 2, 3, 4, 5],
    momento: null,
    enabled: isGestorOrAdmin,
  });

  // persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, groupBy, descWidth }));
    } catch {}
  }, [filters, groupBy, descWidth]);

  // Column resize drag
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = descWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(DESC_MAX, Math.max(DESC_MIN, startW + (ev.clientX - startX)));
      setDescWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const fetchAllDemandas = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from("demandas")
      .select("*, demanda_tags(tag:tags(id,nome,slug,cor))")
      .eq("ativa", true)
      .order("numero", { ascending: true });
    if (!filters.todosOsMeses && filters.meses.length > 0) {
      query = query.in("mes", filters.meses.map((m) => parseInt(m)));
    }
    if (isColaborador && user?.id) query = query.eq("responsavel_id", user.id);
    let { data, error } = (await query) as any;

    if (error && /demanda_tags|tags/i.test(error.message)) {
      let fallbackQuery = supabase.from("demandas").select("*").eq("ativa", true).order("numero", { ascending: true });
      if (!filters.todosOsMeses && filters.meses.length > 0) {
        fallbackQuery = fallbackQuery.in("mes", filters.meses.map((m) => parseInt(m)));
      }
      if (isColaborador && user?.id) fallbackQuery = fallbackQuery.eq("responsavel_id", user.id);
      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }
    if (error) { console.error(error); setAllDemandas([]); }
    else {
      setAllDemandas(
        mergeDemandasPrazoMeta(((data || []) as any[]).map((demanda) => ({
          ...demanda,
          tags: (demanda.demanda_tags || []).map((item: any) => item.tag).filter(Boolean),
        })))
      );
    }
    setIsLoading(false);
  }, [filters.meses, filters.todosOsMeses, isColaborador, user?.id]);

  useEffect(() => { fetchAllDemandas(); }, [fetchAllDemandas]);

  const tagOptions = useMemo(
    () => uniqueTags(allDemandas.flatMap((demanda) => demanda.tags || [])),
    [allDemandas]
  );

  const filteredRotinaModelos = useMemo(() => {
    if (!isGestorOrAdmin) return [];

    return rotinaModelos.filter((modelo) => {
      if (filters.setores.length > 0 && (!modelo.setor_id || !filters.setores.includes(modelo.setor_id))) {
        return false;
      }
      if (
        filters.responsaveis.length > 0 &&
        (!modelo.responsavel_padrao_id || !filters.responsaveis.includes(modelo.responsavel_padrao_id))
      ) {
        return false;
      }
      if (filters.semanas.length > 0) {
        const wanted = filters.semanas.map((semana) => parseInt(semana, 10));
        if (!(modelo.semanas_aplicaveis || []).some((semana) => wanted.includes(semana))) return false;
      }
      if (filters.busca.trim()) {
        const q = filters.busca.toLowerCase();
        if (!`${modelo.nome} ${modelo.descricao}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filters.busca, filters.responsaveis, filters.semanas, filters.setores, isGestorOrAdmin, rotinaModelos]);

  const handleDemandaChange = () => {
    fetchAllDemandas();
    onDemandaChange();
    refetchSolicitacoes();
    setSelectedIds(new Set());
    if (frozenVisibleIds !== null) {
      setHasPendingReorder(true);
    }
  };

  const updateLocalDemandas = useCallback(
    (updater: (prev: Demanda[]) => Demanda[]) => {
      setAllDemandas((prev) => updater(prev));
    },
    []
  );

  const bulk = useBulkDemandaActions(handleDemandaChange);

  const filterSignature = useMemo(() => JSON.stringify(filters), [filters]);

  // Client-side filtering used only when filters are applied/refreshed.
  const freshFilteredDemandas = useMemo(() => {
    let result = allDemandas;
    if (filters.responsaveis.length > 0) result = result.filter((d) => filters.responsaveis.includes(d.responsavel_id));
    if (filters.setores.length > 0) result = result.filter((d) => d.setor_id && filters.setores.includes(d.setor_id));
    if (filters.busca.trim()) {
      const q = filters.busca.toLowerCase();
      result = result.filter((d) => d.descricao.toLowerCase().includes(q));
    }
    if (filters.semanas.length > 0) {
      const wanted = filters.semanas.map((s) => parseInt(s));
      result = result.filter((d) => (d.semana_limite || []).some((s) => wanted.includes(s)));
    }
    if (filters.urgente) result = result.filter((d) => d.muito_urgente);
    if (filters.prioridade) result = result.filter((d) => d.prioritaria);
    if (filters.pendenteAprovacao) result = result.filter((d) => d.status_responsavel === "executado" && d.status_gestor === "pendente");
    if (filters.repeticoes.length > 0) {
      const reps = filters.repeticoes.map((r) => parseInt(r));
      result = result.filter((d) => reps.includes(d.semanas_repeticao));
    }
    if (filters.tags.length > 0) {
      const selected = new Set(filters.tags);
      result = result.filter((d) => (d.tags || []).some((tag) => selected.has(tag.id)));
    }
    return result;
  }, [allDemandas, filters]);

  useEffect(() => {
    if (isLoading) return;
    if (appliedFilterSignature === filterSignature && frozenVisibleIds !== null) return;

    setFrozenVisibleIds(new Set(freshFilteredDemandas.map((demanda) => demanda.id)));
    setAppliedFilterSignature(filterSignature);
    setHasPendingReorder(false);
  }, [appliedFilterSignature, filterSignature, freshFilteredDemandas, frozenVisibleIds, isLoading]);

  const filteredDemandas = useMemo(() => {
    if (!frozenVisibleIds) return freshFilteredDemandas;
    return allDemandas.filter((demanda) => frozenVisibleIds.has(demanda.id));
  }, [allDemandas, freshFilteredDemandas, frozenVisibleIds]);

  // Consolidate
  const consolidated = useMemo(() => {
    const map = new Map<string, ConsolidatedDemand>();
    filteredDemandas.forEach((d) => {
      const key = d.grupo_id ?? `${d.descricao.toLowerCase().trim()}|${d.responsavel_id}|${d.mes}|${d.ano}`;
      if (map.has(key)) {
        map.get(key)!.siblings.push(d);
      } else {
        map.set(key, {
          key,
          grupo_id: d.grupo_id,
          descricao: d.descricao,
          responsavel_id: d.responsavel_id,
          setor_id: d.setor_id,
          prioritaria: d.prioritaria,
          muito_urgente: d.muito_urgente || false,
          modo_execucao: d.modo_execucao || "semanal",
          semana_inicio_prazo: d.semana_inicio_prazo ?? null,
          semana_fim_prazo: d.semana_fim_prazo ?? null,
          mes: d.mes,
          ano: d.ano,
          siblings: [d],
          tags: d.tags || [],
        });
      }
    });
    return Array.from(map.values());
  }, [filteredDemandas]);

  const getProfileById = useCallback((id: string) => profiles.find((p) => p.user_id === id), [profiles]);
  const getSetorById = useCallback((id: string | null) => (id ? setores.find((s) => s.id === id) ?? null : null), [setores]);
  const getVisualOrderId = useCallback((demand: ConsolidatedDemand) => {
    const numeroBase = Math.min(...demand.siblings.map((s) => s.numero));
    return [
      demand.descricao.trim().toLowerCase(),
      demand.responsavel_id,
      demand.setor_id ?? "",
      demand.mes,
      demand.ano,
      numeroBase,
    ].join("|");
  }, []);

  const shouldQueueReorder = (patch: Partial<Demanda>) =>
    "descricao" in patch ||
    "responsavel_id" in patch ||
    "setor_id" in patch ||
    "semana_limite" in patch ||
    "semanas_repeticao" in patch ||
    "prioritaria" in patch ||
    "muito_urgente" in patch ||
    "status_responsavel" in patch ||
    "status_gestor" in patch;

  const sortFn = (a: ConsolidatedDemand, b: ConsolidatedDemand) => {
    let cmp = 0;
    switch (sortColumn) {
      case "descricao": cmp = a.descricao.localeCompare(b.descricao, "pt-BR"); break;
      case "responsavel": cmp = (getProfileById(a.responsavel_id)?.nome || "").localeCompare(getProfileById(b.responsavel_id)?.nome || "", "pt-BR"); break;
      case "setor": cmp = (getSetorById(a.setor_id)?.nome || "").localeCompare(getSetorById(b.setor_id)?.nome || "", "pt-BR"); break;
      case "repeticao": cmp = a.siblings.length - b.siblings.length; break;
      case "semana": {
        const wa = Math.min(...(a.siblings.flatMap((s) => s.semana_limite) || [99]));
        const wb = Math.min(...(b.siblings.flatMap((s) => s.semana_limite) || [99]));
        cmp = wa - wb;
        break;
      }
    }
    return sortDirection === "asc" ? cmp : -cmp;
  };

  const baseSortedFlat = useMemo(() => {
    if (!sortColumn) return consolidated;
    return [...consolidated].sort(sortFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consolidated, sortColumn, sortDirection]);

  const orderResetSignature = useMemo(
    () =>
      JSON.stringify({
        filters,
        groupBy,
        sortColumn,
        sortDirection,
      }),
    [filters, groupBy, sortColumn, sortDirection]
  );

  useEffect(() => {
    if (isLoading) return;
    setManualOrderIds(baseSortedFlat.map(getVisualOrderId));
    setHasPendingReorder(false);
    // baseSortedFlat is intentionally read only when filters/sort reset or a refetch finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderResetSignature, isLoading, getVisualOrderId]);

  const applyCurrentOrdering = useCallback(() => {
    setFrozenVisibleIds(new Set(freshFilteredDemandas.map((demanda) => demanda.id)));
    setAppliedFilterSignature(filterSignature);
    setManualOrderIds([]);
    setHasPendingReorder(false);
  }, [filterSignature, freshFilteredDemandas]);

  const sortedFlat = useMemo(() => {
    if (manualOrderIds.length === 0) return baseSortedFlat;

    const rank = new Map(manualOrderIds.map((id, index) => [id, index]));
    return [...baseSortedFlat].sort((a, b) => {
      const rankA = rank.get(getVisualOrderId(a));
      const rankB = rank.get(getVisualOrderId(b));

      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;
      return 0;
    });
  }, [baseSortedFlat, manualOrderIds, getVisualOrderId]);

  // Group structure
  const grouped = useMemo(() => {
    if (groupBy === "nenhum") return [{ label: "", count: sortedFlat.length, items: sortedFlat }];
    const groups = new Map<string, ConsolidatedDemand[]>();
    sortedFlat.forEach((d) => {
      let label = "";
      if (groupBy === "responsavel") {
        label = getProfileById(d.responsavel_id)?.nome ?? "Sem responsável";
      } else if (groupBy === "setor") {
        label = getSetorById(d.setor_id)?.nome ?? "Sem setor";
      } else if (groupBy === "setor_responsavel") {
        label = `${getSetorById(d.setor_id)?.nome ?? "Sem setor"} › ${getProfileById(d.responsavel_id)?.nome ?? "Sem responsável"}`;
      }
      const arr = groups.get(label) ?? [];
      arr.push(d);
      groups.set(label, arr);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([label, items]) => ({ label, count: items.length, items }));
  }, [sortedFlat, groupBy, getProfileById, getSetorById]);

  useEffect(() => {
    if (groupBy === "nenhum") {
      setCollapsedGroups(new Set());
      return;
    }

    setCollapsedGroups(new Set(grouped.map((group) => group.label)));
    // grouped is intentionally read from the render where groupBy changed,
    // so we don't re-collapse everything after every small inline update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  const handleSort = (c: NonNullable<SortCol>) => {
    if (sortColumn === c) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumn(null); setSortDirection("asc"); }
    } else { setSortColumn(c); setSortDirection("asc"); }
  };

  const expandedSelectedIds = useMemo(() => {
    const ids: string[] = [];
    consolidated.forEach((c) => {
      if (c.siblings.every((s) => selectedIds.has(s.id))) {
        c.siblings.forEach((s) => ids.push(s.id));
      } else {
        c.siblings.forEach((s) => { if (selectedIds.has(s.id)) ids.push(s.id); });
      }
    });
    return Array.from(new Set(ids));
  }, [consolidated, selectedIds]);

  const totalSiblingsVisible = useMemo(() => consolidated.reduce((acc, c) => acc + c.siblings.length, 0), [consolidated]);
  const allSelected = totalSiblingsVisible > 0 && consolidated.every((c) => c.siblings.every((s) => selectedIds.has(s.id)));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else {
      const next = new Set<string>();
      consolidated.forEach((c) => c.siblings.forEach((s) => next.add(s.id)));
      setSelectedIds(next);
    }
  };

  const toggleRow = (c: ConsolidatedDemand) => {
    const next = new Set(selectedIds);
    const allInRow = c.siblings.every((s) => next.has(s.id));
    c.siblings.forEach((s) => { allInRow ? next.delete(s.id) : next.add(s.id); });
    setSelectedIds(next);
  };

  const toggleGroup = (items: ConsolidatedDemand[]) => {
    const next = new Set(selectedIds);
    const allIn = items.every((c) => c.siblings.every((s) => next.has(s.id)));
    items.forEach((c) => c.siblings.forEach((s) => { allIn ? next.delete(s.id) : next.add(s.id); }));
    setSelectedIds(next);
  };

  const handleDeleteClick = (d: Demanda) => {
    if (isGestorOrAdmin) setDeletingDemanda(d);
    else setSolicitandoExclusao(d);
  };

  // Inline cell edits
  const inlineUpdate = async (id: string, patch: Partial<Demanda>) => {
    const previousDemandas = allDemandas;
    updateLocalDemandas((prev) =>
      prev.map((demanda) => (demanda.id === id ? { ...demanda, ...patch } : demanda))
    );
    if (shouldQueueReorder(patch)) {
      setHasPendingReorder(true);
    }

    const { error } = await supabase.from("demandas").update(patch).eq("id", id);
    if (error) {
      setAllDemandas(previousDemandas);
      if (shouldQueueReorder(patch)) {
        setHasPendingReorder(false);
      }
    }
  };

  const groupUpdate = async (c: ConsolidatedDemand, patch: Partial<Demanda>) => {
    const ids = c.siblings.map((s) => s.id);
    const previousDemandas = allDemandas;

    updateLocalDemandas((prev) =>
      prev.map((demanda) =>
        ids.includes(demanda.id) ? { ...demanda, ...patch } : demanda
      )
    );
    if (shouldQueueReorder(patch)) {
      setHasPendingReorder(true);
    }

    const { error } = await supabase.from("demandas").update(patch).in("id", ids);
    if (error) {
      setAllDemandas(previousDemandas);
      if (shouldQueueReorder(patch)) {
        setHasPendingReorder(false);
      }
    }
  };

  const updateGroupWeeks = async (
    c: ConsolidatedDemand,
    semanas: number[],
    options?: { markPendingReorder?: boolean }
  ) => {
    const previousDemandas = allDemandas;
    const shouldMarkPending = options?.markPendingReorder ?? true;
    const orderedWeeks = [...new Set(semanas)].sort((a, b) => a - b);
    const sortedSiblings = [...c.siblings].sort(
      (a, b) => (a.semana_limite?.[0] ?? 0) - (b.semana_limite?.[0] ?? 0)
    );
    const count = orderedWeeks.length;
    const grupoId = count > 1 ? c.grupo_id ?? crypto.randomUUID() : null;
    const template = sortedSiblings[0] ?? c.siblings[0];
    const siblingsToReuse = sortedSiblings.slice(0, Math.min(sortedSiblings.length, count));
    const siblingsToDeactivate = sortedSiblings.slice(count);
    const weeksToCreate = orderedWeeks.slice(siblingsToReuse.length);
    const rowsToInsert = weeksToCreate.map((semana) => ({
      id: crypto.randomUUID(),
      numero: template.numero,
      responsavel_id: template.responsavel_id,
      setor_id: template.setor_id,
      descricao: template.descricao,
      observacoes: template.observacoes ?? null,
      status_responsavel: template.status_responsavel,
      status_gestor: template.status_gestor,
      semanas_repeticao: count,
      semana_limite: [semana],
      mes: template.mes,
      ano: template.ano,
      prioritaria: template.prioritaria,
      muito_urgente: template.muito_urgente ?? false,
      grupo_id: grupoId,
      ativa: true,
    }));

    updateLocalDemandas((prev) => {
      const next = prev
        .map((demanda) => {
          const reusedIndex = siblingsToReuse.findIndex((sibling) => sibling.id === demanda.id);
          if (reusedIndex !== -1) {
            return {
              ...demanda,
              semana_limite: [orderedWeeks[reusedIndex]],
              semanas_repeticao: count,
              grupo_id: grupoId,
            };
          }

          if (siblingsToDeactivate.some((sibling) => sibling.id === demanda.id)) {
            return { ...demanda, ativa: false };
          }

          return demanda;
        })
        .filter((demanda) => demanda.ativa);

      return [...next, ...rowsToInsert];
    });
    if (shouldMarkPending) {
      setHasPendingReorder(true);
    }

    if (siblingsToReuse.length > 0) {
      const updateResults = await Promise.all(
        siblingsToReuse.map((sibling, index) =>
          supabase
            .from("demandas")
            .update({
              semana_limite: [orderedWeeks[index]],
              semanas_repeticao: count,
              grupo_id: grupoId,
            })
            .eq("id", sibling.id)
        )
      );

      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) {
        setAllDemandas(previousDemandas);
        if (shouldMarkPending) {
          setHasPendingReorder(false);
        }
        return false;
      }
    }

    const idsToDeactivate = siblingsToDeactivate.map((sibling) => sibling.id);
    if (idsToDeactivate.length > 0) {
      const { error: deleteError } = await supabase
        .from("demandas")
        .update({ ativa: false })
        .in("id", idsToDeactivate);
      if (deleteError) {
        setAllDemandas(previousDemandas);
        if (shouldMarkPending) {
          setHasPendingReorder(false);
        }
        return false;
      }
    }

    if (weeksToCreate.length > 0) {
      const rowsToPersist = weeksToCreate.map((semana) => ({
        responsavel_id: template.responsavel_id,
        setor_id: template.setor_id,
        descricao: template.descricao,
        observacoes: template.observacoes ?? null,
        status_responsavel: template.status_responsavel,
        status_gestor: template.status_gestor,
        semanas_repeticao: count,
        semana_limite: [semana],
        mes: template.mes,
        ano: template.ano,
        prioritaria: template.prioritaria,
        muito_urgente: template.muito_urgente ?? false,
        grupo_id: grupoId,
        ativa: true,
      }));

      const { error: insertError } = await supabase.from("demandas").insert(rowsToPersist);
      if (insertError) {
        setAllDemandas(previousDemandas);
        if (shouldMarkPending) {
          setHasPendingReorder(false);
        }
        return false;
      }
    }

    return true;
  };

  const buildBalancedWeeks = (count: number, currentWeeks: number[], weekLoads: number[]) => {
    const selected: number[] = [];

    while (selected.length < count) {
      const candidates = [1, 2, 3, 4, 5].filter((week) => !selected.includes(week));
      candidates.sort((weekA, weekB) => {
        const loadDiff = weekLoads[weekA - 1] - weekLoads[weekB - 1];
        if (loadDiff !== 0) return loadDiff;

        const currentPreferenceDiff =
          Number(!currentWeeks.includes(weekA)) - Number(!currentWeeks.includes(weekB));
        if (currentPreferenceDiff !== 0) return currentPreferenceDiff;

        const spacingA =
          selected.length === 0
            ? 0
            : Math.min(...selected.map((selectedWeek) => Math.abs(selectedWeek - weekA)));
        const spacingB =
          selected.length === 0
            ? 0
            : Math.min(...selected.map((selectedWeek) => Math.abs(selectedWeek - weekB)));
        if (spacingA !== spacingB) return spacingB - spacingA;

        return weekA - weekB;
      });

      const nextWeek = candidates[0];
      selected.push(nextWeek);
      weekLoads[nextWeek - 1] += 1;
    }

    return selected.sort((a, b) => a - b);
  };

  const handleRebalanceDemandas = async () => {
    if (filters.responsaveis.length !== 1 || isRebalancing) return;

    const targetGroups = consolidated.filter(
      (group) => group.responsavel_id === filters.responsaveis[0] && !isDemandaPrazo(group)
    );

    if (targetGroups.length === 0) {
      toast({
        title: "Nada para reequalizar",
        description: "Nao encontrei demandas para o responsavel filtrado.",
      });
      return;
    }

    setIsRebalancing(true);

    const weekLoads = [0, 0, 0, 0, 0];
    const plan = [...targetGroups]
      .sort((groupA, groupB) => groupB.siblings.length - groupA.siblings.length)
      .map((group) => {
        const currentWeeks = Array.from(
          new Set(group.siblings.flatMap((sibling) => sibling.semana_limite || []))
        ).sort((a, b) => a - b);

        const nextWeeks = buildBalancedWeeks(currentWeeks.length, currentWeeks, weekLoads);
        return {
          group,
          currentWeeks,
          nextWeeks,
          changed: currentWeeks.join("|") !== nextWeeks.join("|"),
        };
      });

    const changedGroups = plan.filter((item) => item.changed);

    if (changedGroups.length === 0) {
      setIsRebalancing(false);
      toast({
        title: "Demandas ja equilibradas",
        description: "A distribuicao entre semanas ja estava balanceada.",
      });
      return;
    }

    let updatedGroups = 0;

    for (const item of changedGroups) {
      const success = await updateGroupWeeks(item.group, item.nextWeeks, {
        markPendingReorder: false,
      });

      if (!success) {
        setIsRebalancing(false);
        await fetchAllDemandas();
        toast({
          variant: "destructive",
          title: "Erro ao reequalizar",
          description: "Nao consegui concluir a redistribuicao das demandas.",
        });
        return;
      }

      updatedGroups += 1;
    }

    setHasPendingReorder(true);
    setIsRebalancing(false);
    toast({
      title: "Demandas reequalizadas",
      description: `${updatedGroups} grupo(s) tiveram as semanas redistribuidas.`,
    });
  };

  const applyPrazoPatch = async (
    ids: string[],
    payload: {
      modo_execucao: DemandaModoExecucao;
      semana_inicio_prazo: number | null;
      semana_fim_prazo: number | null;
    }
  ) => {
    if (ids.length === 0) return;

    const patch = {
      modo_execucao: payload.modo_execucao,
      semana_inicio_prazo: payload.modo_execucao === "prazo" ? payload.semana_inicio_prazo : null,
      semana_fim_prazo: payload.modo_execucao === "prazo" ? payload.semana_fim_prazo : null,
    };
    const { error } = await supabase.from("demandas").update(patch).in("id", ids);
    if (error) {
      if (isPrazoColumnMissingError(error)) {
        if (payload.modo_execucao === "prazo") saveDemandasPrazoMeta(ids, payload);
        else clearDemandasPrazoMeta(ids);
        return;
      }
      throw error;
    }

    if (payload.modo_execucao === "prazo") saveDemandasPrazoMeta(ids, payload);
    else clearDemandasPrazoMeta(ids);
  };

  const handleTransformSelectedToPrazo = async (payload: {
    semana_inicio_prazo: number;
    semana_fim_prazo: number;
    comportamento: "colapsar" | "preservar";
  }) => {
    const prazoWeeks = buildPrazoWeeks(payload.semana_inicio_prazo, payload.semana_fim_prazo);
    const selectedDemandas = allDemandas.filter((demanda) => selectedIds.has(demanda.id));
    if (selectedDemandas.length === 0) return;

    setIsSavingPrazoDialog(true);
    try {
      if (payload.comportamento === "preservar") {
        const ids = selectedDemandas.map((demanda) => demanda.id);
        const { error } = await supabase
          .from("demandas")
          .update({
            semana_limite: prazoWeeks,
            semanas_repeticao: 1,
          })
          .in("id", ids);
        if (error) throw error;

        await applyPrazoPatch(ids, {
          modo_execucao: "prazo",
          semana_inicio_prazo: payload.semana_inicio_prazo,
          semana_fim_prazo: payload.semana_fim_prazo,
        });
      } else {
        const grouped = new Map<string, Demanda[]>();
        selectedDemandas.forEach((demanda) => {
          const key =
            demanda.grupo_id ??
            `${demanda.descricao.trim().toLowerCase()}|${demanda.responsavel_id}|${demanda.mes}|${demanda.ano}`;
          const current = grouped.get(key) || [];
          current.push(demanda);
          grouped.set(key, current);
        });

        for (const items of grouped.values()) {
          const sorted = [...items].sort((a, b) => a.numero - b.numero);
          const keeper = sorted[0];
          const idsToDeactivate = sorted.slice(1).map((item) => item.id);

          const { error: updateError } = await supabase
            .from("demandas")
            .update({
              semana_limite: prazoWeeks,
              semanas_repeticao: 1,
              grupo_id: null,
            })
            .eq("id", keeper.id);
          if (updateError) throw updateError;

          if (idsToDeactivate.length > 0) {
            const { error: deactivateError } = await supabase
              .from("demandas")
              .update({ ativa: false })
              .in("id", idsToDeactivate);
            if (deactivateError) throw deactivateError;
          }

          await applyPrazoPatch([keeper.id], {
            modo_execucao: "prazo",
            semana_inicio_prazo: payload.semana_inicio_prazo,
            semana_fim_prazo: payload.semana_fim_prazo,
          });
          clearDemandasPrazoMeta(idsToDeactivate);
        }
      }

      setShowPrazoDialog(false);
      toast({
        title: "Demandas com prazo atualizadas",
        description:
          payload.comportamento === "colapsar"
            ? "As demandas selecionadas foram convertidas para linhas únicas com prazo."
            : "As demandas selecionadas agora usam janela de prazo.",
      });
      handleDemandaChange();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao transformar demandas",
        description: error.message || "Não foi possível aplicar o prazo.",
      });
    } finally {
      setIsSavingPrazoDialog(false);
    }
  };

  const openBulkPersistenteDialog = () => {
    const selectedGroups = consolidated.filter((group) => group.siblings.some((demanda) => selectedIds.has(demanda.id)));
    if (selectedGroups.length === 0) return;
    setTransformingPersistenteMode("bulk");
    setTransformingPersistenteDemanda(selectedGroups[0].siblings[0]);
  };

  const deactivateDemandas = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("demandas").update({ ativa: false }).in("id", ids);
    if (error) throw error;
    clearDemandasPrazoMeta(ids);
  };

  const handleTransformSelectedToPersistente = async (payload: {
    descricao: string;
    dias_semana: number[];
    semanas_aplicaveis: number[];
  }) => {
    const selectedGroups = consolidated.filter((group) => group.siblings.some((demanda) => selectedIds.has(demanda.id)));
    if (selectedGroups.length === 0) return;

    setIsBulkTransformingPersistente(true);
    let successCount = 0;
    const createdModelos = [];
    const deactivateIds: string[] = [];

    try {
      for (const group of selectedGroups) {
        const first = group.siblings[0];
        const semanas = Array.from(new Set(group.siblings.flatMap((demanda) => demanda.semana_limite || []))).sort((a, b) => a - b);
        const created = await createRotinaModelo({
          nome: group.descricao.trim(),
          descricao: first.observacoes?.trim() || group.descricao.trim(),
          setor_id: first.setor_id,
          responsavel_padrao_id: first.responsavel_id,
          dias_semana: payload.dias_semana,
          semanas_aplicaveis: payload.semanas_aplicaveis.length > 0 ? payload.semanas_aplicaveis : semanas.length > 0 ? semanas : [1, 2, 3, 4, 5],
          ativo: true,
          exige_aprovacao: true,
          entra_calculo_apt: true,
          cor: "#f97316",
          icone: "clock",
        });

        if (created) {
          successCount += 1;
          createdModelos.push(created);
          group.siblings.forEach((demanda) => deactivateIds.push(demanda.id));
        }
      }

      if (successCount > 0) {
        await deactivateDemandas(deactivateIds);
        await gerarOcorrenciasDoPeriodo(createdModelos);
        toast({
          title: "Demandas transformadas em persistentes",
          description:
            successCount === selectedGroups.length
              ? `${successCount} grupo(s) saíram da lista comum e viraram rotinas persistentes.`
              : `${successCount} de ${selectedGroups.length} grupo(s) foram transformados em rotinas persistentes.`,
        });
        setTransformingPersistenteDemanda(null);
        setSelectedIds(new Set());
        handleDemandaChange();
      } else {
        toast({
          variant: "destructive",
          title: "Nenhuma rotina foi criada",
          description: "Não foi possível transformar as demandas selecionadas em persistentes.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao transformar demandas",
        description: error.message || "Não foi possível transformar as demandas selecionadas em persistentes.",
      });
    } finally {
      setIsBulkTransformingPersistente(false);
    }
  };

  const handleTransformSingleToPersistente = async (payload: {
    nome: string;
    descricao: string;
    setor_id: string | null;
    responsavel_padrao_id: string;
    dias_semana: number[];
    semanas_aplicaveis: number[];
  }) => {
    if (transformingPersistenteMode === "bulk") {
      await handleTransformSelectedToPersistente(payload);
      return;
    }

    const demanda = transformingPersistenteDemanda;
    if (!demanda) return;

    setIsSavingPersistenteDialog(true);
    try {
      const created = await createRotinaModelo({
        ...payload,
        ativo: true,
        exige_aprovacao: true,
        entra_calculo_apt: true,
        cor: "#f97316",
        icone: "clock",
      });

      if (created) {
        const idsToDeactivate = demanda.grupo_id
          ? allDemandas.filter((item) => item.grupo_id === demanda.grupo_id).map((item) => item.id)
          : [demanda.id];

        await deactivateDemandas(idsToDeactivate);
        await gerarOcorrenciasDoPeriodo([created]);
        toast({
          title: "Demanda transformada em persistente",
          description: "A demanda saiu da lista comum e agora passa a funcionar como rotina persistente.",
        });
        setTransformingPersistenteDemanda(null);
        handleDemandaChange();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao transformar demanda",
        description: error.message || "Não foi possível transformar esta demanda em persistente.",
      });
    } finally {
      setIsSavingPersistenteDialog(false);
    }
  };

  const profileOptions = profiles.map((p) => ({ value: p.user_id, label: p.nome, color: p.cor ?? null }));
  const setorOptions = setores.map((s) => ({ value: s.id, label: s.nome, color: s.cor }));

  const currentMes = new Date().getMonth() + 1;
  const currentAno = new Date().getFullYear();

  const getInitials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  const SortBtn = ({ col, children, align = "left" }: { col: NonNullable<SortCol>; children: React.ReactNode; align?: "left" | "center" }) => (
    <button
      type="button"
      onClick={() => handleSort(col)}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground",
        align === "center" && "justify-center w-full"
      )}
    >
      {children}
      {sortColumn === col
        ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
        : <ArrowUpDown className="h-3 w-3 opacity-30" />}
    </button>
  );

  const renderRow = (c: ConsolidatedDemand) => {
    const profile = getProfileById(c.responsavel_id);
    const setor = getSetorById(c.setor_id);
    const first = c.siblings[0];
    const hasPending = c.siblings.some((s) => pendingDemandaIds.has(s.id));
    const allSemanas = Array.from(new Set(c.siblings.flatMap((s) => s.semana_limite || []))).sort((a, b) => a - b);
    const allInRow = c.siblings.every((s) => selectedIds.has(s.id));
    const showMonthBadge = c.mes !== currentMes || c.ano !== currentAno;
    const prazoWindow = formatPrazoWindow(c, "compact");
    const isPrazo = isDemandaPrazo(c);

    return (
      <TableRow
        key={c.key}
        className={cn(
          "group h-10 hover:bg-accent/30 transition-colors",
          allInRow && "bg-primary/5",
          c.muito_urgente && "shadow-[inset_3px_0_0_0_hsl(var(--destructive))]",
          !c.muito_urgente && c.prioritaria && "shadow-[inset_3px_0_0_0_hsl(var(--warning))]"
        )}
      >
        {/* Checkbox */}
        <TableCell className="w-[36px] py-1">
          <Checkbox
            checked={allInRow}
            onCheckedChange={() => toggleRow(c)}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>

        {/* Descrição */}
        <TableCell className="py-1.5 align-top" style={{ width: descWidth, maxWidth: descWidth }}>
          <div className="flex items-start gap-1.5 min-w-0">
            <div className="flex h-4 w-4 shrink-0 items-start justify-center pt-0.5">
              {c.muito_urgente ? (
                <Flame className="h-3.5 w-3.5 text-destructive" />
              ) : c.prioritaria ? (
                <Star className="h-3.5 w-3.5 text-warning" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <TooltipProvider delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm leading-tight line-clamp-2 break-words">{c.descricao}</p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md"><p className="text-xs">{c.descricao}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {(hasPending || showMonthBadge || c.tags.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {prazoWindow && (
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0 text-[9px] font-semibold text-orange-700">
                      Prazo {prazoWindow}
                    </span>
                  )}
                  {showMonthBadge && (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0 rounded">
                      {MESES_FULL[c.mes - 1].slice(0, 3)}/{c.ano}
                    </span>
                  )}
                  {c.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border px-1.5 py-0 text-[9px] font-semibold"
                      style={{ backgroundColor: `${tag.cor}66`, borderColor: tag.cor }}
                    >
                      #{tag.nome}
                    </span>
                  ))}
                  {hasPending && (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-warning bg-warning/10 px-1.5 py-0 rounded">
                      Excl. pendente
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </TableCell>

        {/* Responsável */}
        <TableCell className="py-1 w-[132px] align-top">
          <InlinePicker
            value={c.responsavel_id}
            options={profileOptions}
            onSelect={(v) => v && groupUpdate(c, { responsavel_id: v })}
            searchPlaceholder="Buscar pessoa..."
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm hover:bg-muted rounded px-1 py-0.5 -mx-1 truncate max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar
                  className="h-5 w-5 border shrink-0"
                  style={{ borderColor: profile?.cor || "#6B7280", backgroundColor: `${profile?.cor || "#6B7280"}20` }}
                >
                  <AvatarFallback className="text-[9px] font-medium" style={{ color: profile?.cor || "#6B7280" }}>
                    {getInitials(profile?.nome || "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{profile?.nome || "—"}</span>
              </button>
            }
          />
        </TableCell>

        {/* Setor */}
        <TableCell className="py-1 w-[140px] align-top">
          <InlinePicker
            value={c.setor_id}
            options={setorOptions}
            allowNone
            onSelect={(v) => groupUpdate(c, { setor_id: v })}
            searchPlaceholder="Buscar setor..."
            trigger={
              <button
                type="button"
                className="flex items-start gap-1.5 text-sm text-left hover:bg-muted rounded px-1 py-0.5 -mx-1 w-full min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: setor?.cor || "#E5E7EB" }} />
                <span className="line-clamp-2 leading-tight break-words">{setor?.nome ?? "—"}</span>
              </button>
            }
          />
        </TableCell>

        {/* Semanas */}
        <TableCell className="py-1 w-[180px] align-top">
          {isPrazo ? (
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
              {prazoWindow}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5].map((semana) => {
                const isSelected = allSemanas.includes(semana);

                return (
                  <button
                    key={semana}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextSemanas = isSelected
                        ? allSemanas.filter((value) => value !== semana)
                        : [...allSemanas, semana].sort((a, b) => a - b);

                      if (nextSemanas.length === 0) return;
                      void updateGroupWeeks(c, nextSemanas);
                    }}
                    className={cn(
                      "h-6 min-w-6 rounded-md border px-1.5 text-[11px] font-semibold transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={`${semana}ª semana`}
                  >
                    {semana}
                  </button>
                );
              })}
            </div>
          )}
        </TableCell>

        {/* Repetições */}
        <TableCell className="py-1 w-[52px] text-center align-top">
          <div
            className="inline-flex h-6 w-9 items-center justify-center rounded-md border bg-muted text-[11px] font-semibold text-foreground/80"
            title={isPrazo ? "Demanda com prazo" : "Repetição calculada automaticamente pelas semanas"}
          >
            {isPrazo ? "PZ" : `${allSemanas.length}X`}
          </div>
        </TableCell>

        {/* Flags */}
        <TableCell className="py-1 w-[60px] align-top">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); groupUpdate(c, { prioritaria: !c.prioritaria }); }}
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted"
              title="Prioritária"
            >
              <Star className={cn("h-3.5 w-3.5", c.prioritaria ? "fill-warning text-warning" : "text-muted-foreground/40")} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); groupUpdate(c, { muito_urgente: !c.muito_urgente }); }}
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted"
              title="Urgente"
            >
              <Flame className={cn("h-3.5 w-3.5", c.muito_urgente ? "fill-destructive text-destructive" : "text-muted-foreground/40")} />
            </button>
          </div>
        </TableCell>

        {/* Status Resp */}
        <TableCell className="py-1 w-[56px] align-top">
          <div className="flex items-center gap-1">
            <StatusBolinha
              size="sm"
              status={first.status_responsavel}
              onClick={() => {
                const cycle = ["pendente", "executado", "nao_realizado"] as const;
                const next = cycle[(cycle.indexOf(first.status_responsavel) + 1) % cycle.length];
                inlineUpdate(first.id, { status_responsavel: next });
              }}
            />
            {c.siblings.length > 1 && <span className="text-[9px] text-muted-foreground">+{c.siblings.length - 1}</span>}
          </div>
        </TableCell>

        {/* Status Gestor */}
        {isGestorOrAdmin && (
          <TableCell className="py-1 w-[56px] align-top">
            <StatusBolinha
              size="sm"
              status={first.status_gestor}
              onClick={() => {
                const cycle = ["pendente", "executado", "nao_realizado"] as const;
                const next = cycle[(cycle.indexOf(first.status_gestor) + 1) % cycle.length];
                inlineUpdate(first.id, { status_gestor: next });
              }}
            />
          </TableCell>
        )}

        {/* Actions */}
        <TableCell className="py-1 w-[72px] align-top">
          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingDemanda(first); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTransformingPersistenteMode("single"); setTransformingPersistenteDemanda(first); }}>
                  <RefreshCw className="mr-2 h-4 w-4 text-orange-600" /> Transformar em persistente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedIds(new Set(c.siblings.map((item) => item.id))); setShowPrazoDialog(true); }}>
                  <Repeat className="mr-2 h-4 w-4 text-warning" /> Transformar em demanda com prazo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(first); }} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setSelectedDemand(c)}
              className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted"
              aria-label="Ver detalhes"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3 pb-20">
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        profileOptions={profileOptions.map(({ value, label }) => ({ value, label }))}
        setorOptions={setorOptions.map(({ value, label }) => ({ value, label }))}
        tagOptions={tagOptions}
      />

      {/* Grouping toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
          <Group className="h-3 w-3" /> Agrupar:
        </span>
        {([
          ["nenhum", "Nenhum"],
          ["responsavel", "Responsável"],
          ["setor", "Setor"],
          ["setor_responsavel", "Setor › Resp."],
        ] as [GroupBy, string][]).map(([g, lbl]) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            className={cn(
              "h-7 px-2.5 rounded-md text-[11px] font-medium border transition-colors",
              groupBy === g
                ? "bg-foreground text-background border-foreground"
                : "bg-background hover:bg-muted border-border/70 text-muted-foreground"
            )}
          >
            {lbl}
          </button>
        ))}
        {filters.responsaveis.length === 1 && !isColaborador && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2.5 text-[11px]"
            onClick={() => void handleRebalanceDemandas()}
            disabled={isRebalancing || consolidated.length === 0}
          >
            {isRebalancing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Reequalizar demandas
          </Button>
        )}
        {hasPendingReorder && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 px-2.5 text-[11px]"
            onClick={applyCurrentOrdering}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar lista
          </Button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {consolidated.length} grupos · {filteredDemandas.length} demandas
        </span>
      </div>

      {isGestorOrAdmin && filteredRotinaModelos.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-orange-950">Demandas persistentes</p>
                <p className="text-xs text-orange-800/80">
                  Modelos recorrentes filtrados junto da lista. Edite em Configurações &gt; Setores.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-orange-300 bg-white/70 text-orange-800">
              {filteredRotinaModelos.length} modelo{filteredRotinaModelos.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {filteredRotinaModelos.map((modelo) => {
              const setor = getSetorById(modelo.setor_id);
              const profile = modelo.responsavel_padrao_id ? getProfileById(modelo.responsavel_padrao_id) : null;
              const semanas = (modelo.semanas_aplicaveis || []).join(",");
              return (
                <div
                  key={modelo.id}
                  className="flex max-w-full items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs shadow-sm"
                  title={modelo.descricao}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  <span className="max-w-[260px] truncate font-semibold text-orange-950">{modelo.nome}</span>
                  <span className="text-muted-foreground">{setor?.nome || "Sem setor"}</span>
                  <span className="text-muted-foreground">{profile?.nome || "Sem responsável"}</span>
                  <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[10px]">
                    {(modelo.dias_semana || []).length}x/sem.
                  </Badge>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {semanas || "sem semanas"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur z-10">
              <TableRow className="h-9 hover:bg-transparent border-b">
                <TableHead className="w-[36px] py-0">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar tudo" />
                </TableHead>
                <TableHead
                  className="py-0 relative group/desc"
                  style={{ width: descWidth, maxWidth: descWidth }}
                >
                  <div className="flex items-center justify-between pr-2">
                    <SortBtn col="descricao">Descrição</SortBtn>
                  </div>
                  <div
                    onMouseDown={startResize}
                    onDoubleClick={() => setDescWidth(DESC_DEFAULT)}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize flex items-center justify-center group/handle"
                    title="Arraste para redimensionar (duplo-clique para resetar)"
                  >
                    <span className="h-4 w-px bg-border group-hover/desc:bg-primary/60 transition-colors" />
                  </div>
                </TableHead>
                <TableHead className="w-[132px] py-0"><SortBtn col="responsavel">Responsável</SortBtn></TableHead>
                <TableHead className="w-[140px] py-0"><SortBtn col="setor">Setor</SortBtn></TableHead>
                <TableHead className="w-[180px] py-0"><SortBtn col="semana">Semanas</SortBtn></TableHead>
                <TableHead className="w-[52px] py-0 text-center"><SortBtn col="repeticao" align="center">Rep.</SortBtn></TableHead>
                <TableHead className="w-[60px] py-0 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Flags</TableHead>
                <TableHead className="w-[56px] py-0 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Feito</TableHead>
                {isGestorOrAdmin && (
                  <TableHead className="w-[56px] py-0 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Aprov.</TableHead>
                )}
                <TableHead className="w-[72px] py-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.length === 0 || consolidated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isGestorOrAdmin ? 10 : 9} className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma demanda encontrada
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map((g) => {
                  if (groupBy === "nenhum") {
                    return g.items.map((c) => <Fragment key={c.key}>{renderRow(c)}</Fragment>);
                  }
                  const collapsed = collapsedGroups.has(g.label);
                  const groupAllSelected = g.items.every((c) => c.siblings.every((s) => selectedIds.has(s.id)));
                  return (
                    <Fragment key={`g-${g.label}`}>
                      <TableRow className="bg-muted/40 hover:bg-muted/60 border-t border-b border-border/60">
                        <TableCell className="py-1.5">
                          <Checkbox checked={groupAllSelected} onCheckedChange={() => toggleGroup(g.items)} />
                        </TableCell>
                        <TableCell colSpan={isGestorOrAdmin ? 9 : 8} className="py-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(collapsedGroups);
                              collapsed ? next.delete(g.label) : next.add(g.label);
                              setCollapsedGroups(next);
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold"
                          >
                            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {g.label}
                            <Badge variant="secondary" className="ml-2 h-5 text-[10px] font-normal">
                              {g.count} grupo{g.count > 1 ? "s" : ""}
                            </Badge>
                          </button>
                        </TableCell>
                      </TableRow>
                      {!collapsed && g.items.map((c) => <Fragment key={c.key}>{renderRow(c)}</Fragment>)}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={selectedDemand !== null} onOpenChange={() => setSelectedDemand(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
          {selectedDemand && (
            <div className="space-y-4">
              <p className="text-sm">{selectedDemand.descricao}</p>
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
                  {selectedDemand.siblings.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>#{s.numero}</TableCell>
                      <TableCell>{s.semana_limite.join(", ")}ª</TableCell>
                      <TableCell><StatusBolinha status={s.status_responsavel} disabled /></TableCell>
                      {isGestorOrAdmin && <TableCell><StatusBolinha status={s.status_gestor} disabled /></TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk bar */}
      {!isColaborador && (
        <BulkActionsBar
          selectedCount={expandedSelectedIds.length}
          selectedDemandaIds={expandedSelectedIds}
          profileOptions={profileOptions.map(({ value, label }) => ({ value, label }))}
          setorOptions={setorOptions}
          onClear={() => setSelectedIds(new Set())}
          onReassign={(rid) => bulk.reassignResponsavel(expandedSelectedIds, rid)}
          onMoveSetor={(sid) => bulk.moveSetor(expandedSelectedIds, sid)}
          onSetRepeticoes={(n) => bulk.runRepeticoes(expandedSelectedIds, n)}
          onSetPrioridade={(v) => bulk.setPrioridade(expandedSelectedIds, v)}
          onSetUrgencia={(v) => bulk.setUrgencia(expandedSelectedIds, v)}
          onSetStatusResp={(s) => bulk.setStatusResponsavel(expandedSelectedIds, s)}
          onSetStatusGestor={(s) => bulk.setStatusGestor(expandedSelectedIds, s)}
          onTransformPersistente={openBulkPersistenteDialog}
          onTransformPrazo={() => setShowPrazoDialog(true)}
          onDuplicate={() => setDuplicandoIds(expandedSelectedIds)}
          onDelete={() => bulk.softDelete(expandedSelectedIds)}
          canDelete={isGestorOrAdmin}
        />
      )}

      {/* Existing dialogs */}
      {editingDemanda && (
        <EditarDemandaIrmaDialog
          open={!!editingDemanda}
          onOpenChange={(open) => !open && setEditingDemanda(null)}
          demanda={editingDemanda}
          profiles={profiles}
          setores={setores}
          siblingCount={allDemandas.filter((d) => d.grupo_id && d.grupo_id === editingDemanda.grupo_id).length || 1}
          onDemandaEditada={handleDemandaChange}
        />
      )}

      {deletingDemanda && (
        <ExcluirDemandaIrmaDialog
          open={!!deletingDemanda}
          onOpenChange={(open) => !open && setDeletingDemanda(null)}
          demandaId={deletingDemanda.id}
          demandaNumero={deletingDemanda.numero}
          grupoId={deletingDemanda.grupo_id}
          siblingCount={allDemandas.filter((d) => d.grupo_id && d.grupo_id === deletingDemanda.grupo_id).length || 1}
          siblings={deletingDemanda.grupo_id ? allDemandas.filter((d) => d.grupo_id === deletingDemanda.grupo_id).map((d) => ({ id: d.id, numero: d.numero, descricao: d.descricao, semana_limite: d.semana_limite })) : []}
          onDemandaExcluida={handleDemandaChange}
        />
      )}

      {solicitandoExclusao && (
        <SolicitarExclusaoDialog
          open={!!solicitandoExclusao}
          onOpenChange={(open) => !open && setSolicitandoExclusao(null)}
          demandaId={solicitandoExclusao.id}
          demandaNumero={solicitandoExclusao.numero}
          grupoId={solicitandoExclusao.grupo_id}
          siblingCount={solicitandoExclusao.grupo_id ? allDemandas.filter((d) => d.grupo_id === solicitandoExclusao.grupo_id).length : 1}
          demandaDescricao={solicitandoExclusao.descricao}
          demandaResponsavelId={solicitandoExclusao.responsavel_id}
          demandaMes={solicitandoExclusao.mes}
          demandaAno={solicitandoExclusao.ano}
          demandaSemanasRepeticao={solicitandoExclusao.semanas_repeticao}
          onSolicitacaoEnviada={handleDemandaChange}
        />
      )}

      {duplicandoIds && duplicandoIds.length > 0 && (
        <DuplicarDemandasEmMassaDialog
          open={!!duplicandoIds}
          onOpenChange={(open) => !open && setDuplicandoIds(null)}
          selectedIds={new Set(duplicandoIds)}
          onComplete={handleDemandaChange}
        />
      )}

      <TransformarDemandaPersistenteDialog
        open={!!transformingPersistenteDemanda}
        demanda={transformingPersistenteDemanda}
        setores={setores}
        profiles={profiles}
        isSaving={isSavingPersistenteDialog || isBulkTransformingPersistente}
        onOpenChange={(open) => !open && setTransformingPersistenteDemanda(null)}
        onConfirm={handleTransformSingleToPersistente}
      />

      <TransformarDemandaPrazoDialog
        open={showPrazoDialog}
        onOpenChange={setShowPrazoDialog}
        selectedCount={selectedIds.size}
        isSaving={isSavingPrazoDialog}
        onConfirm={handleTransformSelectedToPrazo}
      />
    </div>
  );
}
