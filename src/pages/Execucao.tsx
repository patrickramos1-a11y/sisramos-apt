import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { useMomentoAPT } from "@/hooks/useMomentoAPT";
import { defaultMomentos, useAptMomentos } from "@/hooks/useAptMomentos";
import { supabase } from "@/integrations/supabase/client";
import APTHorizontalFilters from "@/components/apt/APTHorizontalFilters";
import APTFilters from "@/components/apt/APTFilters";
import AptMomentosNavigator from "@/components/apt/AptMomentosNavigator";
import ConfigurarAptDialog from "@/components/apt/ConfigurarAptDialog";
import TopSetoresBar from "@/components/apt/TopSetoresBar";
import StatusBolinha from "@/components/apt/StatusBolinha";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { buildSetorWhatsAppHref } from "@/lib/setor-actions";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Layers3,
  ListChecks,
  Loader2,
  Lock,
  MessageCircle,
  Settings2,
  Star,
} from "lucide-react";

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
}

interface ExecutionGroup {
  key: string;
  descricao: string;
  responsavel_id: string;
  setor_id: string | null;
  prioritaria: boolean;
  muito_urgente: boolean;
  observacoes: string[];
  siblings: Demanda[];
}

type ExecutionSortKey = "numero" | "responsavel" | "setor" | "descricao" | "semana";
type ExecutionStatusFilter = "todos" | "pendentes" | "aguardando" | "feitas" | "nao_realizadas";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function semanaLabel(semana: number) {
  return `${semana}ª`;
}

function semanasCompactas(semanas: number[]) {
  return [...new Set(semanas)].sort((a, b) => a - b).map(semanaLabel).join(" · ");
}

function getExecutionStatusSummary(group: ExecutionGroup) {
  const total = group.siblings.length;
  const feitas = group.siblings.filter((item) => item.status_responsavel === "executado").length;
  const naoFeitas = group.siblings.filter((item) => item.status_responsavel === "nao_realizado").length;
  const pendentes = total - feitas - naoFeitas;
  const aguardandoGestor = group.siblings.filter(
    (item) =>
      (item.status_responsavel === "executado" || item.status_responsavel === "nao_realizado") &&
      item.status_gestor === "pendente"
  ).length;

  return { total, feitas, naoFeitas, pendentes, aguardandoGestor };
}

function getGroupStatus(group: ExecutionGroup, field: "status_responsavel" | "status_gestor") {
  const statuses = group.siblings.map((item) => item[field]);
  if (statuses.every((status) => status === "executado")) return "executado";
  if (statuses.every((status) => status === "nao_realizado")) return "nao_realizado";
  return "pendente";
}

function nextStatus(status: Demanda["status_responsavel"]) {
  if (status === "pendente") return "executado";
  if (status === "executado") return "nao_realizado";
  return "pendente";
}

function GroupWeeksEditor({
  weeks,
  disabled,
  onSave,
}: {
  weeks: number[];
  disabled: boolean;
  onSave: (weeks: number[]) => Promise<void>;
}) {
  const normalizedWeeks = useMemo(() => [...new Set(weeks)].sort((a, b) => a - b), [weeks]);
  const [draftWeeks, setDraftWeeks] = useState<number[]>(normalizedWeeks);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) setDraftWeeks(normalizedWeeks);
  }, [normalizedWeeks, open]);

  const toggleWeek = (week: number) => {
    setDraftWeeks((prev) => {
      if (prev.includes(week)) {
        const next = prev.filter((item) => item !== week);
        return next.length > 0 ? next : prev;
      }
      return [...prev, week].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(draftWeeks);
    setIsSaving(false);
    setOpen(false);
  };

  const display = normalizedWeeks.length > 0 ? semanasCompactas(normalizedWeeks) : "-";

  if (disabled) {
    return (
      <Badge variant="outline" className="rounded-full px-2.5 py-1">
        {display}
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          aria-label="Editar semanas da demanda"
        >
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-3">
        <div className="mb-3">
          <p className="text-sm font-semibold">Editar semanas</p>
          <p className="text-xs text-muted-foreground">A repetição será igual ao total selecionado.</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((week) => {
            const active = draftWeeks.includes(week);
            return (
              <button
                key={week}
                type="button"
                onClick={() => toggleWeek(week)}
                className={cn(
                  "h-9 rounded-xl border text-sm font-bold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {week}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Repetição: {draftWeeks.length}x</span>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Aplicar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ResponsavelEditor({
  currentProfile,
  profiles,
  disabled,
  onChange,
}: {
  currentProfile?: { user_id: string; nome: string; cor?: string | null } | null;
  profiles: Array<{ user_id: string; nome: string; cor?: string | null }>;
  disabled: boolean;
  onChange: (responsavelId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (responsavelId: string) => {
    if (responsavelId === currentProfile?.user_id) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    await onChange(responsavelId);
    setIsSaving(false);
    setOpen(false);
  };

  const chip = (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-semibold">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentProfile?.cor || "#65a30d" }} />
      {currentProfile?.nome || "Sem responsável"}
    </span>
  );

  if (disabled) return chip;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="text-left" aria-label="Alterar responsável da demanda">
          {chip}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-72 overflow-y-auto rounded-2xl p-3">
        <div className="mb-3">
          <p className="text-sm font-semibold">Trocar colaborador</p>
          <p className="text-xs text-muted-foreground">A alteração vale para a meta aglutinada inteira.</p>
        </div>
        <div className="grid gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.user_id}
              type="button"
              disabled={isSaving}
              onClick={() => handleChange(profile.user_id)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
                profile.user_id === currentProfile?.user_id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: profile.cor || "#65a30d" }} />
                {profile.nome}
              </span>
              {profile.user_id === currentProfile?.user_id && <span className="text-xs font-semibold">Atual</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Execucao() {
  const { user, role, isGestorOrAdmin } = useAuth();
  const isColaborador = role === "colaborador";
  const {
    demandas,
    profiles,
    setores,
    isLoading,
    filters,
    setFilters,
    clearFilters,
    fetchDemandas,
    getProfileById,
    getSetorById,
  } = useDemandas();
  const { isStatusUpdateAllowed } = useMonthSettings();
  const { isAPTBloqueado, toggleBloqueio } = useMomentoAPT();

  const [activeTopSetor, setActiveTopSetor] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showConfigMomentosDialog, setShowConfigMomentosDialog] = useState(false);
  const [momentoSelecionado, setMomentoSelecionado] = useState<number | null>(null);
  const [isSavingMomentos, setIsSavingMomentos] = useState(false);
  const [suggestedWeek, setSuggestedWeek] = useState<number | null>(null);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [executionSortKey, setExecutionSortKey] = useState<ExecutionSortKey>("responsavel");
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatusFilter>("todos");
  const [executionDefaultsApplied, setExecutionDefaultsApplied] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeek = Math.min(5, Math.ceil(now.getDate() / 7));

  const viewedMes = filters.meses.length === 1 ? parseInt(filters.meses[0], 10) : currentMonth;
  const viewedAno = filters.anos.length === 1 ? parseInt(filters.anos[0], 10) : currentYear;

  const {
    config: momentosConfig,
    isLocalFallback,
    saveConfig: saveMomentos,
    avancarMomento,
    reabrirMomento,
    ativarMomento,
    semanasDoMomento,
    semanasDoMomentoAtivo,
  } = useAptMomentos(viewedMes, viewedAno);

  const defaultMomentosConfig = useMemo(() => defaultMomentos(5), []);
  const visualMomentosConfig = useMemo(
    () =>
      momentosConfig ?? {
        id: "visual-default",
        mes: viewedMes,
        ano: viewedAno,
        momentos: defaultMomentosConfig,
        momento_ativo: momentoSelecionado ?? suggestedWeek ?? currentWeek,
        created_at: "",
        updated_at: "",
      },
    [currentWeek, defaultMomentosConfig, momentoSelecionado, momentosConfig, suggestedWeek, viewedAno, viewedMes]
  );

  const activeMomentWeeks = useMemo(() => {
    if (momentoSelecionado !== null) {
      const semanasConfiguradas = semanasDoMomento(momentoSelecionado);
      if (semanasConfiguradas.length > 0) return semanasConfiguradas;
      return visualMomentosConfig.momentos.find((momento) => momento.numero === momentoSelecionado)?.semanas ?? [];
    }
    const weeks = semanasDoMomentoAtivo();
    if (weeks.length > 0) return weeks;
    if (suggestedWeek !== null) return [suggestedWeek];
    return [currentWeek];
  }, [currentWeek, momentoSelecionado, semanasDoMomento, semanasDoMomentoAtivo, suggestedWeek, visualMomentosConfig]);

  useEffect(() => {
    if (executionDefaultsApplied) return;
    setFilters((prev) => ({
      ...prev,
      meses: [String(currentMonth)],
      anos: [String(currentYear)],
      semanas: prev.semanas.length > 0 ? prev.semanas : [],
      statusResponsavel: prev.statusResponsavel,
      statusGestor: prev.statusGestor,
    }));
    setExecutionDefaultsApplied(true);
  }, [currentMonth, currentYear, executionDefaultsApplied, setFilters]);

  useEffect(() => {
    const fetchSuggestedWeek = async () => {
      const { data, error } = await supabase
        .from("checklist_timers")
        .select("semana, stopped_at, started_at")
        .eq("mes", viewedMes)
        .eq("ano", viewedAno)
        .order("started_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setSuggestedWeek(null);
        return;
      }

      const activeTimer = data.find((timer) => !timer.stopped_at);
      setSuggestedWeek(activeTimer?.semana ?? data[0].semana ?? null);
    };

    fetchSuggestedWeek();
  }, [viewedMes, viewedAno]);

  useEffect(() => {
    if (!executionDefaultsApplied) return;

    const momentoAtivo = momentosConfig?.momento_ativo ?? suggestedWeek ?? currentWeek;
    const weeks =
      momentosConfig?.momento_ativo
        ? semanasDoMomento(momentosConfig.momento_ativo)
        : visualMomentosConfig.momentos.find((momento) => momento.numero === momentoAtivo)?.semanas ?? [];

    if (weeks.length > 0) {
      const nextWeeks = weeks.map(String);
      const sameWeeks =
        filters.semanas.length === nextWeeks.length &&
        [...filters.semanas].sort().join("|") === [...nextWeeks].sort().join("|");

      setMomentoSelecionado(momentoAtivo);
      if (!sameWeeks) {
        setFilters((prev) => ({ ...prev, semanas: nextWeeks }));
      }
      return;
    }

    const fallbackWeeks = suggestedWeek !== null ? [suggestedWeek] : [currentWeek];
    setFilters((prev) => ({ ...prev, semanas: fallbackWeeks.map(String) }));
  }, [
    currentWeek,
    executionDefaultsApplied,
    filters.semanas.length,
    filters.semanas,
    momentosConfig,
    semanasDoMomento,
    setFilters,
    suggestedWeek,
    visualMomentosConfig,
  ]);

  const handleSelecionarMomento = (numero: number) => {
    setMomentoSelecionado(numero);
    const semanasConfiguradas = semanasDoMomento(numero);
    const semanas =
      semanasConfiguradas.length > 0
        ? semanasConfiguradas
        : visualMomentosConfig.momentos.find((momento) => momento.numero === numero)?.semanas ?? [];
    if (semanas.length > 0) {
      setFilters((prev) => ({ ...prev, semanas: semanas.map(String) }));
    }
  };

  const handleSaveMomentos = async (
    momentos: import("@/hooks/useAptMomentos").AptMomento[],
    momentoAtivo: number | null
  ) => {
    setIsSavingMomentos(true);
    const ok = await saveMomentos(momentos, momentoAtivo);
    setIsSavingMomentos(false);
    return ok;
  };

  const handleFecharEAvancar = async () => {
    if (!isGestorOrAdmin || activeMomentNumber === null || !user) return;

    if (momentosConfig) {
      await avancarMomento();
      return;
    }

    const momentosAtualizados = visualMomentosConfig.momentos.map((momento) =>
      momento.numero === activeMomentNumber
        ? {
            ...momento,
            concluido: true,
            concluidoEm: new Date().toISOString(),
            concluidoPor: user.id,
          }
        : momento
    );
    const proximoMomento = momentosAtualizados.find(
      (momento) => momento.numero > activeMomentNumber && !momento.concluido
    );
    const novoAtivo = proximoMomento?.numero ?? null;
    const ok = await saveMomentos(momentosAtualizados, novoAtivo);

    if (ok && novoAtivo !== null) {
      setMomentoSelecionado(novoAtivo);
      const semanas = proximoMomento?.semanas ?? [];
      if (semanas.length > 0) {
        setFilters((prev) => ({ ...prev, semanas: semanas.map(String) }));
      }
    }
  };

  const canEditGroupResponsavel = (group: ExecutionGroup) =>
    group.siblings.every((demanda) => isStatusUpdateAllowed(demanda.mes, demanda.ano)) &&
    (!isColaborador || !isMomentoBloqueado) &&
    (role === "admin" || user?.id === group.responsavel_id);

  const canEditGroupGestor = (group: ExecutionGroup) =>
    isGestorOrAdmin && group.siblings.every((demanda) => isStatusUpdateAllowed(demanda.mes, demanda.ano));

  const updateGroupResponsavelStatus = async (group: ExecutionGroup) => {
    if (!canEditGroupResponsavel(group)) return;

    const next = nextStatus(getGroupStatus(group, "status_responsavel"));
    const { error } = await supabase
      .from("demandas")
      .update({ status_responsavel: next })
      .in("id", group.siblings.map((demanda) => demanda.id));

    if (error) {
      console.error("Erro ao atualizar grupo de execução:", error);
      return;
    }

    await fetchDemandas();
  };

  const updateGroupGestorStatus = async (group: ExecutionGroup) => {
    if (!canEditGroupGestor(group)) return;

    const next = nextStatus(getGroupStatus(group, "status_gestor"));
    const { error } = await supabase
      .from("demandas")
      .update({ status_gestor: next })
      .in("id", group.siblings.map((demanda) => demanda.id));

    if (error) {
      console.error("Erro ao atualizar aprovação do grupo de execução:", error);
      return;
    }

    await fetchDemandas();
  };

  const toggleGroupSelection = (groupKey: string) => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const toggleAllVisibleGroups = () => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleGroupKeys.forEach((key) => next.delete(key));
      } else {
        visibleGroupKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  };

  const updateSelectedGestorStatus = async (status: Demanda["status_gestor"]) => {
    if (!isGestorOrAdmin || selectedVisibleGroups.length === 0) return;

    const ids = selectedVisibleGroups
      .filter(canEditGroupGestor)
      .flatMap((group) => group.siblings.map((demanda) => demanda.id));

    if (ids.length === 0) return;

    const { error } = await supabase.from("demandas").update({ status_gestor: status }).in("id", ids);

    if (error) {
      console.error("Erro ao atualizar aprovação em massa:", error);
      return;
    }

    setSelectedGroupKeys(new Set());
    await fetchDemandas();
  };

  const updateGroupResponsavel = async (group: ExecutionGroup, responsavelId: string) => {
    if (!isGestorOrAdmin) return;

    const { error } = await supabase
      .from("demandas")
      .update({ responsavel_id: responsavelId })
      .in("id", group.siblings.map((demanda) => demanda.id));

    if (error) {
      console.error("Erro ao trocar responsável do grupo de execução:", error);
      return;
    }

    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      next.delete(group.key);
      return next;
    });
    await fetchDemandas();
  };

  const updateGroupWeeks = async (group: ExecutionGroup, weeks: number[]) => {
    if (!isGestorOrAdmin) return;

    const nextWeeks = [...new Set(weeks)].filter((week) => week >= 1 && week <= 5).sort((a, b) => a - b);
    if (nextWeeks.length === 0) return;

    const { error } = await supabase
      .from("demandas")
      .update({
        semana_limite: nextWeeks,
        semanas_repeticao: nextWeeks.length,
      })
      .in("id", group.siblings.map((demanda) => demanda.id));

    if (error) {
      console.error("Erro ao editar semanas do grupo de execução:", error);
      return;
    }

    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      next.delete(group.key);
      return next;
    });
    await fetchDemandas();
  };

  const filteredByTopSetor = activeTopSetor
    ? demandas.filter((item) => item.setor_id === activeTopSetor)
    : demandas;

  const executionGroups = useMemo(() => {
    const map = new Map<string, ExecutionGroup>();

    filteredByTopSetor.forEach((demanda) => {
      const key = [
        demanda.descricao.trim().toLowerCase(),
        demanda.responsavel_id,
        demanda.setor_id ?? "",
        demanda.prioritaria ? "1" : "0",
        demanda.muito_urgente ? "1" : "0",
      ].join("|");

      const existing = map.get(key);
      if (existing) {
        existing.siblings.push(demanda);
        if (demanda.observacoes) existing.observacoes.push(demanda.observacoes);
        return;
      }

      map.set(key, {
        key,
        descricao: demanda.descricao,
        responsavel_id: demanda.responsavel_id,
        setor_id: demanda.setor_id,
        prioritaria: demanda.prioritaria,
        muito_urgente: demanda.muito_urgente ?? false,
        observacoes: demanda.observacoes ? [demanda.observacoes] : [],
        siblings: [demanda],
      });
    });

    const groups = Array.from(map.values())
      .map((group) => ({
        ...group,
        siblings: [...group.siblings].sort(
          (a, b) => (Math.min(...a.semana_limite) || 99) - (Math.min(...b.semana_limite) || 99)
        ),
      }));

    const filteredGroups = groups.filter((group) => {
      const responsavelStatus = getGroupStatus(group, "status_responsavel");
      const gestorStatus = getGroupStatus(group, "status_gestor");

      if (executionStatusFilter === "pendentes") return responsavelStatus === "pendente";
      if (executionStatusFilter === "feitas") return responsavelStatus === "executado";
      if (executionStatusFilter === "nao_realizadas") return responsavelStatus === "nao_realizado";
      if (executionStatusFilter === "aguardando") {
        return responsavelStatus !== "pendente" && gestorStatus === "pendente";
      }
      return true;
    });

    return filteredGroups.sort((a, b) => {
      if (executionSortKey === "numero") return (a.siblings[0]?.numero ?? 0) - (b.siblings[0]?.numero ?? 0);
      if (executionSortKey === "responsavel") {
        const nomeA = getProfileById(a.responsavel_id)?.nome ?? "";
        const nomeB = getProfileById(b.responsavel_id)?.nome ?? "";
        return nomeA.localeCompare(nomeB, "pt-BR") || a.descricao.localeCompare(b.descricao, "pt-BR");
      }
      if (executionSortKey === "setor") {
        const setorA = getSetorById(a.setor_id)?.nome ?? "";
        const setorB = getSetorById(b.setor_id)?.nome ?? "";
        return setorA.localeCompare(setorB, "pt-BR") || a.descricao.localeCompare(b.descricao, "pt-BR");
      }
      if (executionSortKey === "semana") {
        const semanaA = Math.min(...a.siblings.flatMap((item) => item.semana_limite));
        const semanaB = Math.min(...b.siblings.flatMap((item) => item.semana_limite));
        return semanaA - semanaB || a.descricao.localeCompare(b.descricao, "pt-BR");
      }
      return a.descricao.localeCompare(b.descricao, "pt-BR");
    });
  }, [executionSortKey, executionStatusFilter, filteredByTopSetor, getProfileById, getSetorById]);

  const groupsByResponsavel = useMemo(() => {
    if (!isGestorOrAdmin) {
      return [
        {
          responsavelId: user?.id ?? "me",
          groups: executionGroups,
        },
      ];
    }

    const map = new Map<string, ExecutionGroup[]>();
    executionGroups.forEach((group) => {
      const arr = map.get(group.responsavel_id) ?? [];
      arr.push(group);
      map.set(group.responsavel_id, arr);
    });

    return Array.from(map.entries())
      .map(([responsavelId, groups]) => ({ responsavelId, groups }))
      .sort((a, b) => {
        const nomeA = getProfileById(a.responsavelId)?.nome ?? "";
        const nomeB = getProfileById(b.responsavelId)?.nome ?? "";
        return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [executionGroups, getProfileById, isGestorOrAdmin, user?.id]);

  const visibleGroupKeys = useMemo(() => executionGroups.map((group) => group.key), [executionGroups]);
  const selectedVisibleGroups = useMemo(
    () => executionGroups.filter((group) => selectedGroupKeys.has(group.key)),
    [executionGroups, selectedGroupKeys]
  );
  const allVisibleSelected =
    visibleGroupKeys.length > 0 && visibleGroupKeys.every((key) => selectedGroupKeys.has(key));

  useEffect(() => {
    setSelectedGroupKeys((prev) => {
      const visible = new Set(visibleGroupKeys);
      const next = new Set([...prev].filter((key) => visible.has(key)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleGroupKeys]);

  const pendingCount = filteredByTopSetor.filter((item) => item.status_responsavel === "pendente").length;
  const waitingApprovalCount = filteredByTopSetor.filter(
    (item) =>
      (item.status_responsavel === "executado" || item.status_responsavel === "nao_realizado") &&
      item.status_gestor === "pendente"
  ).length;

  const isMomentoBloqueado = isAPTBloqueado(viewedMes, viewedAno);
  const activeMomentNumber = momentoSelecionado ?? visualMomentosConfig.momento_ativo ?? null;
  const activeMomentLabel =
    activeMomentNumber !== null
      ? visualMomentosConfig.momentos.find((momento) => momento.numero === activeMomentNumber)?.label ??
        `Momento ${activeMomentNumber}`
      : suggestedWeek !== null
        ? `Semana sugerida ${semanaLabel(suggestedWeek)}`
        : `Semana atual ${semanaLabel(currentWeek)}`;
  const momentos = visualMomentosConfig.momentos;
  const selectedMomento = activeMomentNumber !== null
    ? momentos.find((momento) => momento.numero === activeMomentNumber)
    : null;

  const contextCards = [
    {
      label: "Mês em execução",
      value: `${MONTH_NAMES[viewedMes - 1]} ${viewedAno}`,
      helper: "Abertura automática do mês corrente",
      icon: CalendarDays,
    },
    {
      label: "Momento rodando",
      value: activeMomentLabel,
      helper: `Semanas ${semanasCompactas(activeMomentWeeks)}`,
      icon: Layers3,
    },
    {
      label: "Metas visíveis",
      value: String(executionGroups.length),
      helper: `${filteredByTopSetor.length} ocorrências no ciclo`,
      icon: ListChecks,
    },
    {
      label: "Checklist do ciclo",
      value: "Pré-momento",
      helper: "Use o checklist como apoio operacional",
      icon: ClipboardCheck,
    },
  ];

  const getWhatsappHref = (demanda: Demanda) => {
    const setor = getSetorById(demanda.setor_id);
    const profile = getProfileById(demanda.responsavel_id);

    return buildSetorWhatsAppHref(setor, {
      numero: demanda.numero,
      descricao: demanda.descricao,
      observacoes: demanda.observacoes,
      responsavel: profile?.nome || "Desconhecido",
      setor: setor?.nome || "Sem setor",
      semanas: demanda.semana_limite || [],
      mes: demanda.mes,
      ano: demanda.ano,
    });
  };

  const executionTableColumnCount = isGestorOrAdmin ? 10 : 8;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1700px] p-2 md:p-4 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight md:text-2xl">Execução APT</h1>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
              Visão operacional do ciclo atual, com metas aglutinadas por momento e foco no que precisa ser rodado agora.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters((prev) => !prev)}>
              <Settings2 className="h-4 w-4" />
              {showFilters ? "Recolher filtros" : "Mostrar filtros"}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/checklist">
                <ClipboardCheck className="h-4 w-4" />
                Abrir checklist
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link to="/apt">
                <Layers3 className="h-4 w-4" />
                Planejamento APT
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {contextCards.map((card) => (
            <Card key={card.label} className="border-border/60">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <card.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-foreground">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isMomentoBloqueado && isColaborador && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Lock className="h-4 w-4" />
            Momento APT em andamento: suas marcações de status estão bloqueadas até o fechamento do ciclo.
          </div>
        )}

        {showFilters && (
          <>
            <div className="mb-4 hidden lg:block">
              <div className="sticky top-[58px] z-30 -mx-2 bg-background/95 px-2 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:-mx-4 md:px-4 lg:-mx-6 lg:px-6">
                <APTHorizontalFilters
                  profiles={profiles}
                  setores={setores}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={() => {
                    clearFilters();
                    setActiveTopSetor(null);
                    setMomentoSelecionado(null);
                  }}
                  showResponsavelFilter={isGestorOrAdmin}
                  currentWeek={currentWeek}
                  suggestedWeek={suggestedWeek}
                  currentUserId={user?.id ?? null}
                />
              </div>
            </div>

            <div className="mb-4 lg:hidden">
              <APTFilters
                profiles={profiles}
                setores={setores}
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={() => {
                  clearFilters();
                  setActiveTopSetor(null);
                  setMomentoSelecionado(null);
                }}
                showResponsavelFilter={isGestorOrAdmin}
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <AptMomentosNavigator
            mes={viewedMes}
            ano={viewedAno}
            config={visualMomentosConfig}
            isGestorOrAdmin={isGestorOrAdmin}
            momentoSelecionado={activeMomentNumber}
            onSelecionarMomento={handleSelecionarMomento}
            onAbrirConfig={() => setShowConfigMomentosDialog(true)}
          />
          {!momentosConfig && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Exibindo a sequência padrão de 5 momentos até a configuração do mês ser salva.
            </p>
          )}
          {isLocalFallback && (
            <p className="mt-2 text-[11px] text-amber-700">
              Configuração salva localmente neste navegador. Para todos os colaboradores enxergarem igual, a migration do Supabase precisa ser aplicada.
            </p>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2">
              <span className="text-lg font-bold text-warning">{pendingCount}</span>
              <span className="text-xs font-medium uppercase tracking-wide text-warning/80">Pendentes</span>
            </div>
          )}
          {waitingApprovalCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-primary">{waitingApprovalCount}</span>
              <span className="text-xs font-medium uppercase tracking-wide text-primary/80">Aguardando aprovação</span>
            </div>
          )}
          {isGestorOrAdmin && (
            <Button
              variant={isMomentoBloqueado ? "destructive" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => toggleBloqueio(viewedMes, viewedAno)}
            >
              <Lock className="h-4 w-4" />
              {isMomentoBloqueado ? "Momento APT ativo" : "Iniciar Momento APT"}
            </Button>
          )}
          {isGestorOrAdmin && momentos.length > 0 && activeMomentNumber !== null && (
            <Button size="sm" className="gap-2" onClick={handleFecharEAvancar}>
              <ChevronRight className="h-4 w-4" />
              Fechar e avançar
            </Button>
          )}
          {isGestorOrAdmin && selectedMomento?.concluido && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => reabrirMomento(selectedMomento.numero)}>
              Reabrir momento
            </Button>
          )}
          {isGestorOrAdmin && momentosConfig && selectedMomento && selectedMomento.numero !== momentosConfig?.momento_ativo && !selectedMomento.concluido && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => ativarMomento(selectedMomento.numero)}>
              Ativar momento
            </Button>
          )}
        </div>

        {!isLoading && demandas.length > 0 && (
          <TopSetoresBar
            demandas={demandas}
            setores={setores}
            activeSetorId={activeTopSetor}
            onSetorClick={setActiveTopSetor}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : executionGroups.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <p className="text-muted-foreground">Nenhuma meta encontrada para o ciclo selecionado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {isGestorOrAdmin && (
              <div className="rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-sm">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Colaboradores
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupsByResponsavel.map((section) => {
                    const profile = getProfileById(section.responsavelId);
                    const active = filters.responsaveis.includes(section.responsavelId);
                    return (
                      <button
                        key={section.responsavelId}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            responsaveis: active ? [] : [section.responsavelId],
                          }))
                        }
                        className={cn(
                          "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: profile?.cor || "#65a30d" }}
                        />
                        {profile?.nome || "Sem responsável"}
                        <span className={cn("font-normal", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {section.groups.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/30 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Planilha de execução</p>
                <p className="text-xs text-muted-foreground">
                  {executionGroups.length} linhas aglutinadas · {filteredByTopSetor.length} ocorrências do momento
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isGestorOrAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={toggleAllVisibleGroups}>
                      {allVisibleSelected ? "Limpar seleção" : "Selecionar todos"}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={selectedVisibleGroups.length === 0}
                      onClick={() => updateSelectedGestorStatus("executado")}
                    >
                      Aprovar selecionados
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={selectedVisibleGroups.length === 0}
                      onClick={() => updateSelectedGestorStatus("nao_realizado")}
                    >
                      Rejeitar selecionados
                    </Button>
                  </>
                )}
                <select
                  value={executionSortKey}
                  onChange={(event) => setExecutionSortKey(event.target.value as ExecutionSortKey)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                  aria-label="Ordenar planilha"
                >
                  <option value="responsavel">Ordenar: Responsável</option>
                  <option value="numero">Ordenar: Nº</option>
                  <option value="setor">Ordenar: Setor</option>
                  <option value="descricao">Ordenar: Descrição</option>
                  <option value="semana">Ordenar: Semana</option>
                </select>
                <select
                  value={executionStatusFilter}
                  onChange={(event) => setExecutionStatusFilter(event.target.value as ExecutionStatusFilter)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                  aria-label="Filtrar planilha"
                >
                  <option value="todos">Filtro: Todos</option>
                  <option value="pendentes">Filtro: Pendentes</option>
                  <option value="aguardando">Filtro: Aguardando aprovação</option>
                  <option value="feitas">Filtro: Feitas</option>
                  <option value="nao_realizadas">Filtro: Não feitas</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr className="[&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold">
                    <th className="w-10 text-center">
                      {isGestorOrAdmin && (
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisibleGroups}
                          aria-label="Selecionar todas as linhas visíveis"
                          className="h-4 w-4 rounded border-primary-foreground/50"
                        />
                      )}
                    </th>
                    <th className="w-20">Nº</th>
                    <th className="w-40">Setor</th>
                    {isGestorOrAdmin && <th className="w-44">Responsável</th>}
                    <th className="min-w-[420px]">Descrição</th>
                    <th className="w-32">Semanas</th>
                    <th className="w-20 text-center">Rep.</th>
                    <th className="w-24 text-center">Feito?</th>
                    {isGestorOrAdmin && <th className="w-28 text-center">Aprovado?</th>}
                    <th className="w-20 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {groupsByResponsavel.map((section) => {
                    const profile = getProfileById(section.responsavelId);
                    const sectionCount = section.groups.reduce((acc, group) => acc + group.siblings.length, 0);

                    return (
                      <Fragment key={section.responsavelId}>
                        {isGestorOrAdmin && (
                          <tr key={`${section.responsavelId}-header`} className="border-b border-border/70 bg-muted/60">
                            <td colSpan={executionTableColumnCount} className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                                  style={{
                                    backgroundColor: `${profile?.cor || "#84cc16"}20`,
                                    color: profile?.cor || "#65a30d",
                                  }}
                                >
                                  {(profile?.nome || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold">{profile?.nome || "Sem responsável"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {section.groups.length} metas aglutinadas · {sectionCount} ocorrências
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {section.groups.map((group) => {
                          const setor = getSetorById(group.setor_id);
                          const summary = getExecutionStatusSummary(group);
                          const allWeeks = [...new Set(group.siblings.flatMap((item) => item.semana_limite))].sort((a, b) => a - b);
                          const whatsappHref = getWhatsappHref(group.siblings[0]);
                          const firstNumber = group.siblings[0]?.numero;
                          const responsavel = getProfileById(group.responsavel_id);
                          const responsavelStatus = getGroupStatus(group, "status_responsavel");
                          const gestorStatus = getGroupStatus(group, "status_gestor");
                          const repeatedLabel =
                            group.siblings.length > 1 ? `${group.siblings.length}x` : `${group.siblings[0]?.semanas_repeticao ?? 1}x`;

                          return (
                            <tr
                              key={group.key}
                              className={cn(
                                "border-b border-border/60 transition-colors hover:bg-muted/40",
                                group.muito_urgente && "bg-destructive/[0.04]",
                                group.prioritaria && !group.muito_urgente && "bg-warning/[0.04]"
                              )}
                            >
                              <td className="px-3 py-3 text-center align-middle">
                                {isGestorOrAdmin && (
                                  <input
                                    type="checkbox"
                                    checked={selectedGroupKeys.has(group.key)}
                                    onChange={() => toggleGroupSelection(group.key)}
                                    aria-label={`Selecionar ${group.descricao}`}
                                    className="h-4 w-4 rounded border-border"
                                  />
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span>{firstNumber}</span>
                                  {group.siblings.length > 1 && (
                                    <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">
                                      +{group.siblings.length - 1}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle">
                                <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-1">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: setor?.cor || "#CBD5E1" }} />
                                  {setor?.nome || "Sem setor"}
                                </Badge>
                              </td>
                              {isGestorOrAdmin && (
                                <td className="whitespace-nowrap px-3 py-3 align-middle">
                                  <ResponsavelEditor
                                    currentProfile={responsavel}
                                    profiles={profiles}
                                    disabled={!isGestorOrAdmin}
                                    onChange={(responsavelId) => updateGroupResponsavel(group, responsavelId)}
                                  />
                                </td>
                              )}
                              <td className="px-3 py-3 align-middle">
                                <div className="flex min-w-0 items-start gap-2">
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                                    {group.muito_urgente ? (
                                      <Flame className="h-4 w-4 fill-destructive text-destructive" />
                                    ) : group.prioritaria ? (
                                      <Star className="h-4 w-4 fill-warning text-warning" />
                                    ) : null}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-medium leading-snug">{group.descricao}</p>
                                    {group.observacoes.length > 0 && (
                                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{group.observacoes[0]}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle">
                                <GroupWeeksEditor
                                  weeks={allWeeks}
                                  disabled={!isGestorOrAdmin}
                                  onSave={(weeks) => updateGroupWeeks(group, weeks)}
                                />
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
                                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                  {repeatedLabel}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-center align-middle">
                                <div className="inline-flex items-center gap-2">
                                  <StatusBolinha
                                    status={responsavelStatus}
                                    onClick={() => updateGroupResponsavelStatus(group)}
                                    disabled={!canEditGroupResponsavel(group)}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {summary.feitas}/{summary.total}
                                  </span>
                                </div>
                              </td>
                              {isGestorOrAdmin && (
                                <td className="px-3 py-3 text-center align-middle">
                                  <div className="inline-flex items-center gap-2">
                                    <StatusBolinha
                                      status={gestorStatus}
                                      onClick={() => updateGroupGestorStatus(group)}
                                      disabled={!canEditGroupGestor(group)}
                                    />
                                    {summary.aguardandoGestor > 0 && (
                                      <span className="text-xs text-sky-700">{summary.aguardandoGestor}</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="px-3 py-3 text-center align-middle">
                                {whatsappHref ? (
                                  <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700">
                                    <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Enviar mensagem no WhatsApp">
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        <ConfigurarAptDialog
          open={showConfigMomentosDialog}
          onOpenChange={setShowConfigMomentosDialog}
          mes={viewedMes}
          ano={viewedAno}
          config={momentosConfig}
          onSave={handleSaveMomentos}
          isSaving={isSavingMomentos}
        />
      </div>
    </AppLayout>
  );
}
