import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  ArrowUpDown, ArrowUp, ArrowDown, Flame, Star, Group, ChevronDown,
} from "lucide-react";
import StatusBolinha from "@/components/apt/StatusBolinha";
import EditarDemandaIrmaDialog from "@/components/apt/EditarDemandaIrmaDialog";
import ExcluirDemandaIrmaDialog from "@/components/apt/ExcluirDemandaIrmaDialog";
import SolicitarExclusaoDialog from "@/components/apt/SolicitarExclusaoDialog";
import DuplicarDemandasEmMassaDialog from "@/components/apt/DuplicarDemandasEmMassaDialog";
import { useSolicitacoesExclusao } from "@/hooks/useSolicitacoesExclusao";
import { useBulkDemandaActions } from "@/hooks/useBulkDemandaActions";
import { cn } from "@/lib/utils";
import FiltersBar, { ListaFilters, MESES_FULL } from "./gerenciamento/FiltersBar";
import BulkActionsBar from "./gerenciamento/BulkActionsBar";
import { InlinePicker, RepeticoesPicker } from "./gerenciamento/InlinePickers";

interface Profile { id: string; user_id: string; nome: string; cor?: string | null; }
interface Setor { id: string; nome: string; cor: string; }
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
  key: string;
  grupo_id: string | null;
  descricao: string;
  responsavel_id: string;
  setor_id: string | null;
  prioritaria: boolean;
  muito_urgente: boolean;
  mes: number;
  ano: number;
  siblings: Demanda[];
}

type GroupBy = "nenhum" | "responsavel" | "setor" | "setor_responsavel";
type SortCol = "descricao" | "responsavel" | "setor" | "repeticao" | "semana" | null;

interface Props {
  profiles: Profile[];
  setores: Setor[];
  onDemandaChange: () => void;
}

const STORAGE_KEY = "gerenciamento-lista-prefs";

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
};

export default function GerenciamentoLista({ profiles, setores, onDemandaChange }: Props) {
  const { user, isGestorOrAdmin, role } = useAuth();
  const isColaborador = role === "colaborador";

  const prefs = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [filters, setFilters] = useState<ListaFilters>({ ...DEFAULT_FILTERS, ...(prefs?.filters ?? {}) });
  const [groupBy, setGroupBy] = useState<GroupBy>(prefs?.groupBy ?? "nenhum");
  const [sortColumn, setSortColumn] = useState<SortCol>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDemand, setSelectedDemand] = useState<ConsolidatedDemand | null>(null);

  const [allDemandas, setAllDemandas] = useState<Demanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [deletingDemanda, setDeletingDemanda] = useState<{ id: string; numero: number; grupo_id: string | null } | null>(null);
  const [solicitandoExclusao, setSolicitandoExclusao] = useState<{ id: string; numero: number; grupo_id: string | null; descricao: string; responsavel_id: string; mes: number; ano: number; semanas_repeticao: number } | null>(null);
  const [duplicandoIds, setDuplicandoIds] = useState<string[] | null>(null);

  const { pendingDemandaIds, refetchSolicitacoes } = useSolicitacoesExclusao();

  // persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, groupBy }));
    } catch {}
  }, [filters, groupBy]);

  const fetchAllDemandas = useCallback(async () => {
    setIsLoading(true);
    let query = supabase.from("demandas").select("*").eq("ativa", true).order("numero", { ascending: true });
    if (!filters.todosOsMeses && filters.meses.length > 0) {
      query = query.in("mes", filters.meses.map((m) => parseInt(m)));
    }
    if (isColaborador && user?.id) query = query.eq("responsavel_id", user.id);
    const { data, error } = await query;
    if (error) { console.error(error); setAllDemandas([]); }
    else setAllDemandas(data || []);
    setIsLoading(false);
  }, [filters.meses, filters.todosOsMeses, isColaborador, user?.id]);

  useEffect(() => { fetchAllDemandas(); }, [fetchAllDemandas]);

  const handleDemandaChange = () => {
    fetchAllDemandas();
    onDemandaChange();
    refetchSolicitacoes();
    setSelectedIds(new Set());
  };

  const bulk = useBulkDemandaActions(handleDemandaChange);

  // Client-side filtering
  const filteredDemandas = useMemo(() => {
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
    return result;
  }, [allDemandas, filters]);

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
          mes: d.mes,
          ano: d.ano,
          siblings: [d],
        });
      }
    });
    let result = Array.from(map.values());
    if (filters.repeticoes.length > 0) {
      const reps = filters.repeticoes.map((r) => parseInt(r));
      result = result.filter((d) => reps.includes(d.siblings.length));
    }
    return result;
  }, [filteredDemandas, filters.repeticoes]);

  const getProfileById = useCallback((id: string) => profiles.find((p) => p.user_id === id), [profiles]);
  const getSetorById = useCallback((id: string | null) => (id ? setores.find((s) => s.id === id) ?? null : null), [setores]);

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

  const sortedFlat = useMemo(() => {
    if (!sortColumn) return consolidated;
    return [...consolidated].sort(sortFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consolidated, sortColumn, sortDirection]);

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
    const { error } = await supabase.from("demandas").update(patch).eq("id", id);
    if (!error) handleDemandaChange();
  };
  const groupUpdate = async (c: ConsolidatedDemand, patch: Partial<Demanda>) => {
    const ids = c.siblings.map((s) => s.id);
    const { error } = await supabase.from("demandas").update(patch).in("id", ids);
    if (!error) handleDemandaChange();
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

    return (
      <TableRow
        key={c.key}
        className={cn(
          "group relative h-10 hover:bg-accent/30 transition-colors",
          allInRow && "bg-primary/5"
        )}
      >
        {/* Vertical priority bar */}
        {(c.muito_urgente || c.prioritaria) && (
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[3px]",
              c.muito_urgente ? "bg-destructive" : "bg-warning"
            )}
          />
        )}

        {/* Checkbox */}
        <TableCell className="w-[36px] py-1">
          <Checkbox
            checked={allInRow}
            onCheckedChange={() => toggleRow(c)}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>

        {/* Descrição */}
        <TableCell className="py-1.5 max-w-[560px]">
          <div className="flex items-start gap-1.5 min-w-0">
            {c.muito_urgente && <Flame className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />}
            {c.prioritaria && !c.muito_urgente && <Star className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />}
            <div className="min-w-0 flex-1">
              <TooltipProvider delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm leading-tight line-clamp-2 break-words">{c.descricao}</p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md"><p className="text-xs">{c.descricao}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {(hasPending || showMonthBadge) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {showMonthBadge && (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0 rounded">
                      {MESES_FULL[c.mes - 1].slice(0, 3)}/{c.ano}
                    </span>
                  )}
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
        <TableCell className="py-1 w-[180px]">
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
        <TableCell className="py-1 w-[160px]">
          <InlinePicker
            value={c.setor_id}
            options={setorOptions}
            allowNone
            onSelect={(v) => groupUpdate(c, { setor_id: v })}
            searchPlaceholder="Buscar setor..."
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm hover:bg-muted rounded px-1 py-0.5 -mx-1 truncate max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: setor?.cor || "#E5E7EB" }} />
                <span className="truncate">{setor?.nome ?? "—"}</span>
              </button>
            }
          />
        </TableCell>

        {/* Semanas */}
        <TableCell className="py-1 w-[140px]">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => {
              const has = allSemanas.includes(s);
              return (
                <span
                  key={s}
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium",
                    has ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground/30"
                  )}
                >
                  {s}
                </span>
              );
            })}
          </div>
        </TableCell>

        {/* Repetições */}
        <TableCell className="py-1 w-[72px] text-center">
          <RepeticoesPicker
            value={c.siblings.length}
            onSelect={(n) => groupUpdate(c, { semanas_repeticao: n })}
            trigger={
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-6 px-2 items-center rounded-md border bg-muted text-xs font-semibold hover:bg-accent"
              >
                {c.siblings.length}X
              </button>
            }
          />
        </TableCell>

        {/* Flags */}
        <TableCell className="py-1 w-[64px]">
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
        <TableCell className="py-1 w-[56px]">
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
          <TableCell className="py-1 w-[56px]">
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
        <TableCell className="py-1 w-[80px]">
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
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {consolidated.length} grupos · {filteredDemandas.length} demandas
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur z-10">
              <TableRow className="h-9 hover:bg-transparent border-b">
                <TableHead className="w-[36px] py-0">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar tudo" />
                </TableHead>
                <TableHead className="py-0"><SortBtn col="descricao">Descrição</SortBtn></TableHead>
                <TableHead className="w-[180px] py-0"><SortBtn col="responsavel">Responsável</SortBtn></TableHead>
                <TableHead className="w-[160px] py-0"><SortBtn col="setor">Setor</SortBtn></TableHead>
                <TableHead className="w-[140px] py-0"><SortBtn col="semana">Semanas</SortBtn></TableHead>
                <TableHead className="w-[72px] py-0 text-center"><SortBtn col="repeticao" align="center">Rep.</SortBtn></TableHead>
                <TableHead className="w-[64px] py-0 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Flags</TableHead>
                <TableHead className="w-[56px] py-0 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Feito</TableHead>
                {isGestorOrAdmin && (
                  <TableHead className="w-[56px] py-0 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Aprov.</TableHead>
                )}
                <TableHead className="w-[80px] py-0" />
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
                    return g.items.map((c, i) => (
                      <RowWithZebra key={c.key} idx={i}>{renderRow(c)}</RowWithZebra>
                    ));
                  }
                  const collapsed = collapsedGroups.has(g.label);
                  const groupAllSelected = g.items.every((c) => c.siblings.every((s) => selectedIds.has(s.id)));
                  return (
                    <>
                      <TableRow key={`g-${g.label}`} className="bg-muted/40 hover:bg-muted/60 border-t border-b border-border/60">
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
                      {!collapsed && g.items.map((c, i) => (
                        <RowWithZebra key={c.key} idx={i}>{renderRow(c)}</RowWithZebra>
                      ))}
                    </>
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
          demandaIds={duplicandoIds}
          allDemandas={allDemandas as any}
          profiles={profiles}
          setores={setores}
          onDemandasDuplicadas={handleDemandaChange}
        />
      )}
    </div>
  );
}

function RowWithZebra({ idx, children }: { idx: number; children: React.ReactNode }) {
  // Use wrapper just for the zebra context (the row className already handles hover/selected)
  return (
    <>{idx % 2 === 1 ? <ShadowedRow>{children}</ShadowedRow> : children}</>
  );
}

function ShadowedRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}