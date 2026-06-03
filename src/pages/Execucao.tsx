import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { useMomentoAPT } from "@/hooks/useMomentoAPT";
import { resolveAptViewDate, useAptContext } from "@/hooks/useAptContext";
import { AptRotinaOcorrencia, AptRotinaResumo, AptRotinaStatusOcorrencia, useAptRotinas } from "@/hooks/useAptRotinas";
import { supabase } from "@/integrations/supabase/client";
import APTHorizontalFilters from "@/components/apt/APTHorizontalFilters";
import APTFilters from "@/components/apt/APTFilters";
import AptMomentosNavigator from "@/components/apt/AptMomentosNavigator";
import ConfigurarAptDialog from "@/components/apt/ConfigurarAptDialog";
import TopSetoresBar from "@/components/apt/TopSetoresBar";
import RotinasPersistentesSection from "@/components/apt/RotinasPersistentesSection";
import StatusBolinha from "@/components/apt/StatusBolinha";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { buildSetorWhatsAppHref } from "@/lib/setor-actions";
import { AptTag, uniqueTags } from "@/lib/tags";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Flame,
  Layers3,
  ListChecks,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCcw,
  Settings2,
  Star,
  X,
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
  tags?: AptTag[];
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
  tags: AptTag[];
}

interface ResponsavelExecutionSection {
  responsavelId: string;
  groups: ExecutionGroup[];
  rotinas: AptRotinaResumo[];
}

interface ProfileSummary {
  id: string;
  user_id: string;
  nome: string;
  email?: string;
  cor?: string | null;
  avatar_url?: string | null;
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
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

function getSectionExecutionSummary(groups: ExecutionGroup[]) {
  return groups.reduce(
    (acc, group) => {
      const summary = getExecutionStatusSummary(group);
      acc.total += summary.total;
      acc.feitas += summary.feitas;
      acc.naoFeitas += summary.naoFeitas;
      acc.pendentes += summary.pendentes;
      acc.aguardandoGestor += summary.aguardandoGestor;
      return acc;
    },
    { total: 0, feitas: 0, naoFeitas: 0, pendentes: 0, aguardandoGestor: 0 }
  );
}

function getRotinaExecutionSummary(rotina: AptRotinaResumo) {
  return {
    total: rotina.previstas,
    feitas: rotina.feitas,
    naoFeitas: rotina.nao_feitas,
    pendentes: rotina.pendentes,
    aguardandoGestor:
      rotina.modelo.exige_aprovacao && rotina.avaliacao?.status_gestor !== "aprovado" ? 1 : 0,
  };
}

function sumSectionExecution(section: ResponsavelExecutionSection) {
  const common = getSectionExecutionSummary(section.groups);
  const persistent = section.rotinas.reduce(
    (acc, rotina) => {
      const summary = getRotinaExecutionSummary(rotina);
      acc.total += summary.total;
      acc.feitas += summary.feitas;
      acc.naoFeitas += summary.naoFeitas;
      acc.pendentes += summary.pendentes;
      acc.aguardandoGestor += summary.aguardandoGestor;
      return acc;
    },
    { total: 0, feitas: 0, naoFeitas: 0, pendentes: 0, aguardandoGestor: 0 }
  );

  return {
    total: common.total + persistent.total,
    feitas: common.feitas + persistent.feitas,
    naoFeitas: common.naoFeitas + persistent.naoFeitas,
    pendentes: common.pendentes + persistent.pendentes,
    aguardandoGestor: common.aguardandoGestor + persistent.aguardandoGestor,
  };
}

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function getRotinaWeeks(rotina: AptRotinaResumo) {
  const weeks = rotina.ocorrencias.length > 0
    ? rotina.ocorrencias.map((item) => item.semana_apt)
    : rotina.modelo.semanas_aplicaveis;

  return [...new Set(weeks)].filter(Boolean).sort((a, b) => a - b);
}

function getRotinaFrequency(rotina: AptRotinaResumo) {
  if (rotina.ocorrencias.length === 0) return rotina.modelo.dias_semana.length;
  const perWeek = new Map<number, number>();
  rotina.ocorrencias.forEach((item) => {
    perWeek.set(item.semana_apt, (perWeek.get(item.semana_apt) || 0) + 1);
  });
  return Math.max(0, ...Array.from(perWeek.values()));
}

function getDateWeekday(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getWeekdayStatus(ocorrencias: AptRotinaOcorrencia[], weekday: number): AptRotinaStatusOcorrencia | "sem_ocorrencia" {
  const items = ocorrencias.filter((item) => getDateWeekday(item.data) === weekday);
  if (items.length === 0) return "sem_ocorrencia";
  if (items.some((item) => item.status_execucao === "pendente")) return "pendente";
  if (items.some((item) => item.status_execucao === "nao_realizado")) return "nao_realizado";
  return "executado";
}

function weekdayChipClass(status: AptRotinaStatusOcorrencia | "sem_ocorrencia") {
  if (status === "executado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "nao_realizado") return "border-red-200 bg-red-50 text-red-700";
  if (status === "pendente") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-border bg-background text-muted-foreground";
}

function getRotinaResponsavelStatus(rotina: AptRotinaResumo, todayKey: string): Demanda["status_responsavel"] {
  const todayOccurrence = rotina.ocorrencias.find((item) => item.data === todayKey);
  if (todayOccurrence) return todayOccurrence.status_execucao;
  if (rotina.pendentes > 0) return "pendente";
  if (rotina.nao_feitas > 0) return "nao_realizado";
  return "executado";
}

function getRotinaGestorStatus(rotina: AptRotinaResumo): Demanda["status_gestor"] {
  if (rotina.avaliacao?.status_gestor === "aprovado") return "executado";
  if (rotina.avaliacao?.status_gestor === "reprovado") return "nao_realizado";
  return "pendente";
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
  currentProfile?: ProfileSummary | null;
  profiles: ProfileSummary[];
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
    availableTags,
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showConfigMomentosDialog, setShowConfigMomentosDialog] = useState(false);
  const [momentoSelecionado, setMomentoSelecionado] = useState<number | null>(null);
  const [isSavingMomentos, setIsSavingMomentos] = useState(false);
  const [suggestedWeek, setSuggestedWeek] = useState<number | null>(null);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [executionSortKey, setExecutionSortKey] = useState<ExecutionSortKey>("responsavel");
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatusFilter>("todos");
  const [executionTableTab, setExecutionTableTab] = useState<"demandas" | "persistentes">("demandas");
  const [expandedResponsaveis, setExpandedResponsaveis] = useState<Set<string>>(new Set());
  const [executionStatusDefaultApplied, setExecutionStatusDefaultApplied] = useState(false);
  const [executionDefaultsApplied, setExecutionDefaultsApplied] = useState(false);
  const [responsavelChipStats, setResponsavelChipStats] = useState<Record<string, { groups: number; total: number }>>({});

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeek = Math.min(5, Math.ceil(now.getDate() / 7));

  const { mes: viewedMes, ano: viewedAno } = resolveAptViewDate(
    filters.meses,
    filters.anos,
    currentMonth,
    currentYear
  );

  useEffect(() => {
    if (executionStatusDefaultApplied || !user) return;
    setExecutionStatusFilter(isGestorOrAdmin ? "todos" : "pendentes");
    setExecutionStatusDefaultApplied(true);
  }, [executionStatusDefaultApplied, isGestorOrAdmin, user]);

  const {
    config: momentosConfig,
    isLocalFallback,
    saveConfig: saveMomentos,
    avancarMomento,
    reabrirMomento,
    ativarMomento,
    semanasDoMomento,
    visualMomentosConfig,
    activeMomentNumber,
    activeMomentWeeks,
    isAptFinalizada,
  } = useAptContext({
    mes: viewedMes,
    ano: viewedAno,
    momentoSelecionado,
    suggestedWeek,
    currentWeek,
  });

  const {
    resumos: rotinaResumos,
    marcarOcorrencia: marcarRotinaOcorrencia,
    atualizarAvaliacao: atualizarRotinaAvaliacao,
  } = useAptRotinas({
    mes: viewedMes,
    ano: viewedAno,
    semanas: activeMomentWeeks,
    momento: activeMomentNumber,
  });

  useEffect(() => {
    if (executionDefaultsApplied) return;
    let cancelled = false;

    const applyOperationalMonth = async () => {
      let targetMes = currentMonth;
      let targetAno = currentYear;

      const { data: latestConfig } = await (supabase as any)
        .from("apt_momentos_config")
        .select("mes,ano")
        .or(`ano.lt.${currentYear},and(ano.eq.${currentYear},mes.lte.${currentMonth})`)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestConfig?.mes && latestConfig?.ano) {
        targetMes = latestConfig.mes;
        targetAno = latestConfig.ano;
      } else {
        const { data: currentDemandas } = await supabase
          .from("demandas")
          .select("id")
          .eq("ativa", true)
          .eq("mes", currentMonth)
          .eq("ano", currentYear)
          .limit(1);

        if (!currentDemandas || currentDemandas.length === 0) {
          const { data: latestDemanda } = await supabase
            .from("demandas")
            .select("mes,ano")
            .eq("ativa", true)
            .or(`ano.lt.${currentYear},and(ano.eq.${currentYear},mes.lte.${currentMonth})`)
            .order("ano", { ascending: false })
            .order("mes", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestDemanda?.mes && latestDemanda?.ano) {
            targetMes = latestDemanda.mes;
            targetAno = latestDemanda.ano;
          }
        }
      }

      if (cancelled) return;
      setFilters((prev) => ({
        ...prev,
        meses: [String(targetMes)],
        anos: [String(targetAno)],
        semanas: prev.semanas.length > 0 ? prev.semanas : [],
        statusResponsavel: prev.statusResponsavel,
        statusGestor: prev.statusGestor,
      }));
      setExecutionDefaultsApplied(true);
    };

    void applyOperationalMonth();
    return () => {
      cancelled = true;
    };
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

    if (momentosConfig && momentosConfig.momento_ativo === null) {
      if (momentoSelecionado !== null) {
        setMomentoSelecionado(null);
      }
      if (filters.semanas.length > 0) {
        setFilters((prev) => ({ ...prev, semanas: [] }));
      }
      return;
    }

    const momentoAtivo = momentosConfig?.momento_ativo ?? suggestedWeek ?? currentWeek;
    const weeks = momentosConfig?.momento_ativo
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
    momentoSelecionado,
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
      const momentos = [...momentosConfig.momentos];
      const atualIdx = momentos.findIndex((momento) => momento.numero === activeMomentNumber);
      const proximo = atualIdx >= 0
        ? momentos.find((momento) => momento.numero > momentos[atualIdx].numero && !momento.concluido)
        : null;
      await avancarMomento();
      if (!proximo) {
        setMomentoSelecionado(null);
        setFilters((prev) => ({ ...prev, semanas: [] }));
      }
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

    if (ok) {
      if (novoAtivo !== null) {
        setMomentoSelecionado(novoAtivo);
        const semanas = proximoMomento?.semanas ?? [];
        if (semanas.length > 0) {
          setFilters((prev) => ({ ...prev, semanas: semanas.map(String) }));
        }
      } else {
        setMomentoSelecionado(null);
        setFilters((prev) => ({ ...prev, semanas: [] }));
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

  const updateGroupResponsavelToStatus = async (
    group: ExecutionGroup,
    status: Demanda["status_responsavel"]
  ) => {
    if (!canEditGroupResponsavel(group)) return;

    const { error } = await supabase
      .from("demandas")
      .update({ status_responsavel: status })
      .in("id", group.siblings.map((demanda) => demanda.id));

    if (error) {
      console.error("Erro ao atualizar status do grupo de execução:", error);
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

    await updateGroupsGestorStatus(selectedVisibleGroups, status, true);
  };

  const updateGroupsGestorStatus = async (
    groups: ExecutionGroup[],
    status: Demanda["status_gestor"],
    clearSelected = false
  ) => {
    if (!isGestorOrAdmin || groups.length === 0) return;

    const ids = groups.filter(canEditGroupGestor).flatMap((group) => group.siblings.map((demanda) => demanda.id));

    if (ids.length === 0) return;

    const { error } = await supabase.from("demandas").update({ status_gestor: status }).in("id", ids);

    if (error) {
      console.error("Erro ao atualizar aprovação em massa:", error);
      return;
    }

    if (clearSelected) {
      setSelectedGroupKeys(new Set());
    }
    await fetchDemandas();
  };

  const getSectionSelectedState = (groups: ExecutionGroup[]) => {
    const keys = groups.map((group) => group.key);
    const selectedCount = keys.filter((key) => selectedGroupKeys.has(key)).length;
    return {
      keys,
      selectedCount,
      allSelected: keys.length > 0 && selectedCount === keys.length,
      someSelected: selectedCount > 0 && selectedCount < keys.length,
    };
  };

  const toggleSectionSelection = (groups: ExecutionGroup[]) => {
    const sectionState = getSectionSelectedState(groups);
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (sectionState.allSelected) {
        sectionState.keys.forEach((key) => next.delete(key));
      } else {
        sectionState.keys.forEach((key) => next.add(key));
      }
      return next;
    });
  };

  const toggleResponsavelSection = (responsavelId: string) => {
    setExpandedResponsaveis((prev) => {
      const next = new Set(prev);
      if (next.has(responsavelId)) {
        next.delete(responsavelId);
      } else {
        next.add(responsavelId);
      }
      return next;
    });
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
    ? demandas.filter((item) =>
        activeTopSetor === "sem_setor" ? item.setor_id === null : item.setor_id === activeTopSetor
      )
    : demandas;

  useEffect(() => {
    const fetchResponsavelChipStats = async () => {
      if (!user || !isGestorOrAdmin) {
        setResponsavelChipStats({});
        return;
      }

      let query = supabase.from("demandas").select("*").eq("ativa", true);

      if (filters.meses.length > 0) query = query.in("mes", filters.meses.map((m) => parseInt(m, 10)));
      if (filters.anos.length > 0) query = query.in("ano", filters.anos.map((a) => parseInt(a, 10)));
      if (filters.setores.length > 0) query = query.in("setor_id", filters.setores);
      if (activeTopSetor === "sem_setor") query = query.is("setor_id", null);
      else if (activeTopSetor) query = query.eq("setor_id", activeTopSetor);
      if (filters.busca) query = query.ilike("descricao", `%${filters.busca}%`);

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar contadores por colaborador:", error);
        setResponsavelChipStats({});
        return;
      }

      let filteredData = (data ?? []) as Demanda[];

      if (filters.semanas.length > 0) {
        const semanaNumbers = filters.semanas.map((s) => parseInt(s, 10));
        filteredData = filteredData.filter((demanda) =>
          demanda.semana_limite.some((semana) => semanaNumbers.includes(semana))
        );
      }

      if (filters.repeticoes.length > 0) {
        const repeticaoNumbers = filters.repeticoes.map((r) => parseInt(r, 10));
        filteredData = filteredData.filter((demanda) => repeticaoNumbers.includes(demanda.semanas_repeticao));
      }

      if (filters.urgente) filteredData = filteredData.filter((demanda) => demanda.muito_urgente);
      if (filters.prioridade) filteredData = filteredData.filter((demanda) => demanda.prioritaria);

      const groupKeysByResponsavel = new Map<string, Set<string>>();
      const totalByResponsavel = new Map<string, number>();

      filteredData.forEach((demanda) => {
        const responsavelId = demanda.responsavel_id;
        const key = [
          demanda.descricao.trim().toLowerCase(),
          demanda.responsavel_id,
          demanda.setor_id ?? "",
          demanda.prioritaria ? "1" : "0",
          demanda.muito_urgente ? "1" : "0",
        ].join("|");

        if (!groupKeysByResponsavel.has(responsavelId)) groupKeysByResponsavel.set(responsavelId, new Set());
        groupKeysByResponsavel.get(responsavelId)?.add(key);
        totalByResponsavel.set(responsavelId, (totalByResponsavel.get(responsavelId) ?? 0) + 1);
      });

      const nextStats: Record<string, { groups: number; total: number }> = {};
      groupKeysByResponsavel.forEach((keys, responsavelId) => {
        nextStats[responsavelId] = {
          groups: keys.size,
          total: totalByResponsavel.get(responsavelId) ?? 0,
        };
      });

      setResponsavelChipStats(nextStats);
    };

    fetchResponsavelChipStats();
  }, [activeTopSetor, filters, isGestorOrAdmin, user]);

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
        existing.tags = uniqueTags([...existing.tags, ...(demanda.tags || [])]);
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
        tags: demanda.tags || [],
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

  const filteredRotinaResumos = useMemo(() => {
    const todayKey = getTodayKey();
    const busca = filters.busca.trim().toLowerCase();

    return rotinaResumos.filter((rotina) => {
      const responsavelId = rotina.responsavel_id || "";
      const setorId = rotina.setor_id || "sem_setor";
      const responsavelStatus = getRotinaResponsavelStatus(rotina, todayKey);
      const gestorStatus = getRotinaGestorStatus(rotina);

      if (!isGestorOrAdmin && responsavelId !== user?.id) return false;
      if (filters.responsaveis.length > 0 && !filters.responsaveis.includes(responsavelId)) return false;
      if (filters.setores.length > 0 && !filters.setores.includes(setorId)) return false;
      if (activeTopSetor && activeTopSetor !== setorId) return false;
      if (busca && !`${rotina.modelo.nome} ${rotina.modelo.descricao}`.toLowerCase().includes(busca)) return false;

      if (executionStatusFilter === "pendentes") return responsavelStatus === "pendente";
      if (executionStatusFilter === "feitas") return responsavelStatus === "executado";
      if (executionStatusFilter === "nao_realizadas") return responsavelStatus === "nao_realizado";
      if (executionStatusFilter === "aguardando") return responsavelStatus !== "pendente" && gestorStatus === "pendente";
      return true;
    });
  }, [
    activeTopSetor,
    executionStatusFilter,
    filters.busca,
    filters.responsaveis,
    filters.setores,
    isGestorOrAdmin,
    rotinaResumos,
    user?.id,
  ]);

  const groupsByResponsavel = useMemo<ResponsavelExecutionSection[]>(() => {
    if (!isGestorOrAdmin) {
      return [
        {
          responsavelId: user?.id ?? "me",
          groups: executionGroups,
          rotinas: filteredRotinaResumos,
        },
      ];
    }

    const map = new Map<string, ResponsavelExecutionSection>();
    executionGroups.forEach((group) => {
      const current = map.get(group.responsavel_id) ?? {
        responsavelId: group.responsavel_id,
        groups: [],
        rotinas: [],
      };
      current.groups.push(group);
      map.set(group.responsavel_id, current);
    });
    filteredRotinaResumos.forEach((rotina) => {
      const responsavelId = rotina.responsavel_id || "sem_responsavel";
      const current = map.get(responsavelId) ?? {
        responsavelId,
        groups: [],
        rotinas: [],
      };
      current.rotinas.push(rotina);
      map.set(responsavelId, current);
    });

    return Array.from(map.values())
      .sort((a, b) => {
        const nomeA = getProfileById(a.responsavelId)?.nome ?? "";
        const nomeB = getProfileById(b.responsavelId)?.nome ?? "";
        return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [executionGroups, filteredRotinaResumos, getProfileById, isGestorOrAdmin, user?.id]);

  const responsavelChips = useMemo(() => {
    if (!isGestorOrAdmin) return [];

    const rotinaStats = filteredRotinaResumos.reduce<Record<string, { groups: number; total: number }>>((acc, rotina) => {
      const id = rotina.responsavel_id || "sem_responsavel";
      acc[id] = acc[id] || { groups: 0, total: 0 };
      acc[id].groups += 1;
      acc[id].total += rotina.previstas;
      return acc;
    }, {});

    return profiles
      .map((profile) => {
        const commonStats = responsavelChipStats[profile.user_id] ?? { groups: 0, total: 0 };
        const persistentStats = rotinaStats[profile.user_id] ?? { groups: 0, total: 0 };
        return {
          profile,
          stats: {
            groups: commonStats.groups + persistentStats.groups,
            total: commonStats.total + persistentStats.total,
          },
          active: filters.responsaveis.includes(profile.user_id),
        };
      })
      .filter((item) => item.stats.total > 0 || item.active)
      .sort((a, b) => a.profile.nome.localeCompare(b.profile.nome, "pt-BR"));
  }, [filteredRotinaResumos, filters.responsaveis, isGestorOrAdmin, profiles, responsavelChipStats]);

  const unifiedExecutionRowsCount = executionGroups.length + filteredRotinaResumos.length;

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

  useEffect(() => {
    setExpandedResponsaveis(new Set());
  }, [visibleGroupKeys]);

  const pendingCount = filteredByTopSetor.filter((item) => item.status_responsavel === "pendente").length;
  const doneCount = filteredByTopSetor.filter((item) => item.status_responsavel === "executado").length;
  const notDoneCount = filteredByTopSetor.filter((item) => item.status_responsavel === "nao_realizado").length;
  const waitingApprovalCount = filteredByTopSetor.filter(
    (item) =>
      (item.status_responsavel === "executado" || item.status_responsavel === "nao_realizado") &&
      item.status_gestor === "pendente"
  ).length;
  const allMomentItemsProcessed = filteredByTopSetor.length > 0 && pendingCount === 0;

  const mobileSetorStats = useMemo(() => {
    const countMap: Record<string, { total: number; pending: number; done: number }> = {};

    demandas.forEach((demanda) => {
      const setorId = demanda.setor_id || "sem_setor";
      if (!countMap[setorId]) countMap[setorId] = { total: 0, pending: 0, done: 0 };
      countMap[setorId].total += 1;
      if (demanda.status_responsavel === "pendente") countMap[setorId].pending += 1;
      if (demanda.status_responsavel === "executado") countMap[setorId].done += 1;
    });

    return Object.entries(countMap)
      .map(([setorId, stats]) => {
        const setor = setores.find((item) => item.id === setorId);
        return {
          setorId,
          nome: setor?.nome || "Sem Setor",
          cor: setor?.cor || "#6B7280",
          ...stats,
          pctDone: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.pending - a.pending || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [demandas, setores]);

  const isMomentoBloqueado = isAPTBloqueado(viewedMes, viewedAno);
  const activeMomentLabel =
    isAptFinalizada && activeMomentNumber === null
      ? "APT finalizada"
      : activeMomentNumber !== null
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
      helper: activeMomentWeeks.length > 0 ? `Semanas ${semanasCompactas(activeMomentWeeks)}` : "Nenhum momento em andamento",
      icon: Layers3,
    },
    {
      label: "Metas visíveis",
      value: String(unifiedExecutionRowsCount),
      helper: `${filteredByTopSetor.length + filteredRotinaResumos.reduce((acc, rotina) => acc + rotina.previstas, 0)} ocorrências no ciclo`,
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
            <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" onClick={() => setShowFilters((prev) => !prev)}>
              <Settings2 className="h-4 w-4" />
              {showFilters ? "Recolher filtros" : "Mostrar filtros"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2 lg:hidden" onClick={() => setShowMobileFilters((prev) => !prev)}>
              <Settings2 className="h-4 w-4" />
              Filtros
              {(filters.responsaveis.length + filters.setores.length + filters.semanas.length + (filters.urgente ? 1 : 0) + (filters.prioridade ? 1 : 0)) > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">!</span>
              )}
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

        <div className="mb-3 grid grid-cols-4 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:hidden">
          <div className="border-r border-border/60 p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Mês</p>
            <p className="truncate text-xs font-bold">{MONTH_NAMES[viewedMes - 1].slice(0, 3)} {viewedAno}</p>
          </div>
          <div className="border-r border-border/60 p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Momento</p>
            <p className="truncate text-xs font-bold">{activeMomentLabel}</p>
          </div>
          <div className="border-r border-border/60 p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Pend.</p>
            <p className="text-sm font-bold text-warning">{pendingCount}</p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Aprov.</p>
            <p className="text-sm font-bold text-primary">{waitingApprovalCount}</p>
          </div>
        </div>

        <div className="mb-4 hidden gap-3 md:grid-cols-2 lg:grid xl:grid-cols-4">
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
                  availableTags={availableTags}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={() => {
                    clearFilters();
                    setActiveTopSetor(null);
                    setMomentoSelecionado(null);
                  }}
                  showResponsavelFilter={isGestorOrAdmin}
                  showStatusFilters={false}
                  currentWeek={currentWeek}
                  suggestedWeek={suggestedWeek}
                  currentUserId={user?.id ?? null}
                />
              </div>
            </div>

            {showMobileFilters && (
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
                showStatusFilters={false}
              />
            </div>
            )}
          </>
        )}

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {momentos.map((momento) => {
            const isActive = momento.numero === activeMomentNumber;
            const semanas = momento.semanas.length > 0 ? momento.semanas : [momento.numero];
            return (
              <button
                key={momento.numero}
                type="button"
                onClick={() => handleSelecionarMomento(momento.numero)}
                className={cn(
                  "min-w-[104px] rounded-2xl border px-3 py-2 text-left text-xs transition-all",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground"
                )}
              >
                <span className="block font-bold">Mom. {momento.numero}</span>
                <span className={cn("block text-[10px]", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {semanasCompactas(semanas)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-3 space-y-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "pendentes" as ExecutionStatusFilter, label: "Pend.", count: pendingCount, tone: "border-warning/40 bg-warning/10 text-warning" },
              { key: "feitas" as ExecutionStatusFilter, label: "Feitas", count: doneCount, tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" },
              { key: "nao_realizadas" as ExecutionStatusFilter, label: "Não feitas", count: notDoneCount, tone: "border-destructive/40 bg-destructive/10 text-destructive" },
              { key: "aguardando" as ExecutionStatusFilter, label: "Aprov.", count: waitingApprovalCount, tone: "border-primary/40 bg-primary/10 text-primary" },
            ].map((item) => {
              const active = executionStatusFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setExecutionStatusFilter(active ? "todos" : item.key)}
                  className={cn(
                    "min-w-fit rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                    active ? item.tone : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {item.label} <span className="ml-1 font-bold">{item.count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {mobileSetorStats.slice(0, 8).map((setor) => {
              const active = activeTopSetor === setor.setorId;
              const dimmed = activeTopSetor !== null && !active;
              return (
                <button
                  key={setor.setorId}
                  type="button"
                  onClick={() => setActiveTopSetor(active ? null : setor.setorId)}
                  className={cn(
                    "relative min-w-[132px] overflow-hidden rounded-xl border bg-card p-2 text-left transition-all",
                    active && "scale-[1.02] ring-2 ring-offset-1 ring-offset-background",
                    dimmed && "opacity-35"
                  )}
                  style={active ? { borderColor: setor.cor, ["--tw-ring-color" as any]: setor.cor } : undefined}
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ background: `linear-gradient(90deg, ${setor.cor} ${setor.pctDone}%, transparent ${setor.pctDone}%)` }}
                  />
                  <div className="relative">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: setor.cor }} />
                      <span className="truncate text-[11px] font-semibold">{setor.nome}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-bold leading-none">{setor.pending}</span>
                      <span className="text-[10px] font-semibold" style={{ color: setor.cor }}>{setor.pctDone}%</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{setor.total} dem.</p>
                  </div>
                </button>
              );
            })}
          </div>

          {allMomentItemsProcessed && executionStatusFilter === "pendentes" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700">
              Tudo certo por aqui. Não há pendências neste momento.
            </div>
          )}
        </div>

        <div className="mb-4 hidden lg:block">
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

        <div className="mb-4 hidden flex-wrap items-center gap-2 lg:flex">
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
          <div className="hidden lg:block">
            <TopSetoresBar
              demandas={demandas}
              setores={setores}
              activeSetorId={activeTopSetor}
              onSetorClick={setActiveTopSetor}
              statusField={isGestorOrAdmin ? "status_gestor" : "status_responsavel"}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {isGestorOrAdmin && (
              <div className="hidden rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-sm lg:block">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Colaboradores
                </div>
                <div className="flex flex-wrap gap-2">
                  {responsavelChips.map(({ profile, stats, active }) => {
                    const hasResponsibleFilter = filters.responsaveis.length > 0;
                    const isDimmed = hasResponsibleFilter && !active;
                    return (
                      <button
                        key={profile.user_id}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            responsaveis: active ? [] : [profile.user_id],
                          }))
                        }
                        className={cn(
                          "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all duration-200",
                          active
                            ? "scale-[1.03] border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background hover:bg-muted",
                          isDimmed && "opacity-35 hover:opacity-80"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: profile.cor || "#65a30d" }}
                        />
                        {profile.nome || "Sem responsável"}
                        <span className={cn("font-normal", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {stats.groups}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3 lg:hidden">
              {isGestorOrAdmin && selectedVisibleGroups.length > 0 && (
                <div className="sticky top-[58px] z-40 flex items-center gap-2 rounded-2xl border border-primary/30 bg-background/95 p-2 shadow-lg backdrop-blur">
                  <span className="flex-1 text-xs font-semibold text-primary">
                    {selectedVisibleGroups.length} selecionada{selectedVisibleGroups.length === 1 ? "" : "s"}
                  </span>
                  <Button size="sm" className="h-8 bg-emerald-600 px-3 text-xs hover:bg-emerald-700" onClick={() => updateSelectedGestorStatus("executado")}>
                    Aprovar
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 px-3 text-xs" onClick={() => updateSelectedGestorStatus("nao_realizado")}>
                    Rejeitar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setSelectedGroupKeys(new Set())}>
                    Limpar
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-bold">Demandas do momento</p>
                  <p className="text-xs text-muted-foreground">
                    {executionGroups.length} linhas · {filteredByTopSetor.length} ocorrências
                  </p>
                </div>
                {isGestorOrAdmin && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={toggleAllVisibleGroups}>
                    {allVisibleSelected ? "Limpar" : "Selecionar"}
                  </Button>
                )}
              </div>

              {groupsByResponsavel.map((section) => {
                const sectionProfile = getProfileById(section.responsavelId);
                return (
                  <div key={`mobile-${section.responsavelId}`} className="space-y-2">
                    {isGestorOrAdmin && (
                      <div className="flex items-center gap-2 px-1 pt-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: sectionProfile?.cor || "#65a30d" }}
                        />
                        <span className="text-xs font-bold">{sectionProfile?.nome || "Sem responsável"}</span>
                        <span className="text-[11px] text-muted-foreground">{section.groups.length} metas</span>
                      </div>
                    )}

                    {section.groups.map((group) => {
                      const setor = getSetorById(group.setor_id);
                      const summary = getExecutionStatusSummary(group);
                      const allWeeks = [...new Set(group.siblings.flatMap((item) => item.semana_limite))].sort((a, b) => a - b);
                      const whatsappHref = getWhatsappHref(group.siblings[0]);
                      const responsavel = getProfileById(group.responsavel_id);
                      const responsavelStatus = getGroupStatus(group, "status_responsavel");
                      const gestorStatus = getGroupStatus(group, "status_gestor");
                      const canEditResponsavel = canEditGroupResponsavel(group);

                      return (
                        <article
                          key={`mobile-card-${group.key}`}
                          className={cn(
                            "rounded-2xl border bg-card p-3 shadow-sm",
                            group.muito_urgente && "border-destructive/30 bg-destructive/[0.04]",
                            group.prioritaria && !group.muito_urgente && "border-warning/30 bg-warning/[0.04]",
                            selectedGroupKeys.has(group.key) && "ring-2 ring-primary/30"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {isGestorOrAdmin && (
                              <input
                                type="checkbox"
                                checked={selectedGroupKeys.has(group.key)}
                                onChange={() => toggleGroupSelection(group.key)}
                                aria-label={`Selecionar ${group.descricao}`}
                                className="mt-1 h-4 w-4 rounded border-border"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5 text-[10px]">
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: setor?.cor || "#CBD5E1" }} />
                                  {setor?.nome || "Sem setor"}
                                </Badge>
                                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                                  {semanasCompactas(allWeeks)}
                                </Badge>
                                {isGestorOrAdmin && (
                                  <Badge variant="outline" className="gap-1 rounded-full px-2 py-0.5 text-[10px]">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: responsavel?.cor || "#65a30d" }} />
                                    {responsavel?.nome || "Sem responsável"}
                                  </Badge>
                                )}
                                {whatsappHref && (
                                  <Button asChild variant="ghost" size="icon" className="ml-auto h-7 w-7 text-emerald-600">
                                    <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Enviar mensagem no WhatsApp">
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                                  {group.muito_urgente ? (
                                    <Flame className="h-4 w-4 fill-destructive text-destructive" />
                                  ) : group.prioritaria ? (
                                    <Star className="h-4 w-4 fill-warning text-warning" />
                                  ) : null}
                                </span>
                                <p className="text-sm font-semibold leading-snug">{group.descricao}</p>
                              </div>

                              {group.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {group.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                                      style={{ backgroundColor: `${tag.cor}66`, borderColor: tag.cor }}
                                    >
                                      #{tag.nome}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {group.observacoes.length > 0 && (
                                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{group.observacoes[0]}</p>
                              )}

                              <div className="mt-3 flex items-center gap-2">
                                {isGestorOrAdmin ? (
                                  <>
                                    <div className="flex flex-1 items-center gap-2 rounded-xl border px-2.5 py-2">
                                      <StatusBolinha status={responsavelStatus} disabled size="sm" />
                                      <span className="text-[11px] text-muted-foreground">
                                        Colaborador {summary.feitas}/{summary.total}
                                      </span>
                                    </div>
                                    <div className="flex flex-1 items-center gap-2 rounded-xl border px-2.5 py-2">
                                      <StatusBolinha status={gestorStatus} disabled size="sm" />
                                      <span className="text-[11px] text-muted-foreground">Gestor</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      className={cn(
                                        "h-9 flex-1 gap-1 rounded-xl text-xs",
                                        responsavelStatus === "executado"
                                          ? "bg-emerald-600 hover:bg-emerald-700"
                                          : "bg-emerald-600/90 hover:bg-emerald-700"
                                      )}
                                      disabled={!canEditResponsavel}
                                      onClick={() => updateGroupResponsavelToStatus(group, "executado")}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Feito {summary.feitas > 0 ? `${summary.feitas}/${summary.total}` : ""}
                                    </Button>
                                    <Button
                                      variant={responsavelStatus === "nao_realizado" ? "destructive" : "outline"}
                                      size="sm"
                                      className="h-9 flex-1 gap-1 rounded-xl text-xs"
                                      disabled={!canEditResponsavel}
                                      onClick={() => updateGroupResponsavelToStatus(group, "nao_realizado")}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Não feito
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          <div className="hidden lg:block">
            <Tabs
              value={executionTableTab}
              onValueChange={(value) => setExecutionTableTab(value as "demandas" | "persistentes")}
              className="space-y-3"
            >
              <div className="rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
                <TabsList className="grid h-auto w-full grid-cols-2 bg-muted/40 p-1">
                  <TabsTrigger value="demandas" className="gap-2 rounded-xl py-2 text-sm">
                    <ListChecks className="h-4 w-4" />
                    Demandas do momento
                    <Badge variant="secondary" className="rounded-full">
                      {unifiedExecutionRowsCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="persistentes" className="gap-2 rounded-xl py-2 text-sm">
                    <RefreshCcw className="h-4 w-4" />
                    Demandas persistentes
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="persistentes" className="mt-0">
                <RotinasPersistentesSection
                  mes={viewedMes}
                  ano={viewedAno}
                  semanas={activeMomentWeeks}
                  momento={activeMomentNumber}
                  isGestorOrAdmin={isGestorOrAdmin}
                  profiles={profiles}
                  setores={setores}
                />
              </TabsContent>

              <TabsContent value="demandas" className="mt-0">
                {unifiedExecutionRowsCount === 0 ? (
                  <Card>
                    <CardContent className="py-14 text-center">
                      <p className="font-semibold text-foreground">
                        {allMomentItemsProcessed && executionStatusFilter === "pendentes"
                          ? "Tudo certo. Não há pendências comuns neste momento."
                          : "Nenhuma demanda encontrada para o ciclo selecionado."}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ajuste filtros, colaborador, setor ou momento para localizar demandas comuns e persistentes.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/30 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Planilha de execução</p>
                <p className="text-xs text-muted-foreground">
                  {unifiedExecutionRowsCount} linhas aglutinadas · {filteredByTopSetor.length + filteredRotinaResumos.reduce((acc, rotina) => acc + rotina.previstas, 0)} ocorrências do momento
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
                    const sectionCount =
                      section.groups.reduce((acc, group) => acc + group.siblings.length, 0) +
                      section.rotinas.reduce((acc, rotina) => acc + rotina.previstas, 0);
                    const sectionSelection = getSectionSelectedState(section.groups);
                    const sectionStats = getSectionExecutionSummary(section.groups);
                    const isExpanded = expandedResponsaveis.has(section.responsavelId);

                    return (
                      <Fragment key={section.responsavelId}>
                        <tr key={`${section.responsavelId}-header`} className="border-b border-border/70 bg-muted/60">
                          <td colSpan={executionTableColumnCount} className="px-3 py-2">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleResponsavelSection(section.responsavelId)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted"
                                    aria-label={isExpanded ? "Recolher colaborador" : "Expandir colaborador"}
                                  >
                                    <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                                  </button>
                                  {isGestorOrAdmin && (
                                    <input
                                      type="checkbox"
                                      checked={sectionSelection.allSelected}
                                      ref={(input) => {
                                        if (input) input.indeterminate = sectionSelection.someSelected;
                                      }}
                                      onChange={() => toggleSectionSelection(section.groups)}
                                      aria-label={`Selecionar demandas de ${profile?.nome || "responsável"}`}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                  )}
                                  <div
                                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
                                    style={{
                                      backgroundColor: `${profile?.cor || "#84cc16"}20`,
                                      color: profile?.cor || "#65a30d",
                                    }}
                                  >
                                    {profile?.avatar_url ? (
                                      <img src={profile.avatar_url} alt={profile?.nome || "Colaborador"} className="h-full w-full object-cover" />
                                    ) : (
                                      (profile?.nome || "?").charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <span className="font-semibold">{profile?.nome || "Sem responsável"}</span>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <Badge variant="outline" className="rounded-full bg-background/70">
                                      {section.groups.length + section.rotinas.length} metas
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full bg-background/70">
                                      {sectionCount} ocorrências
                                    </Badge>
                                    <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100">
                                      {sectionStats.pendentes} pend.
                                    </Badge>
                                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                      {sectionStats.feitas} feitas
                                    </Badge>
                                    <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100">
                                      {sectionStats.naoFeitas} não feitas
                                    </Badge>
                                    {sectionStats.aguardandoGestor > 0 && (
                                      <Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100">
                                        {sectionStats.aguardandoGestor} aguard.
                                      </Badge>
                                    )}
                                  </div>
                                  {sectionSelection.selectedCount > 0 && (
                                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                                      {sectionSelection.selectedCount} selecionadas
                                    </Badge>
                                  )}
                                </div>
                                {isGestorOrAdmin && section.groups.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => toggleSectionSelection(section.groups)}
                                  >
                                    {sectionSelection.allSelected ? "Limpar do colaborador" : "Selecionar colaborador"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                                    onClick={() => updateGroupsGestorStatus(section.groups, "executado")}
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => updateGroupsGestorStatus(section.groups, "nao_realizado")}
                                  >
                                    Rejeitar
                                  </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>

                        {isExpanded && section.groups.map((group) => {
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
                                    {group.tags.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {group.tags.map((tag) => (
                                          <span
                                            key={tag.id}
                                            className="rounded-full border px-1.5 py-0 text-[10px] font-semibold"
                                            style={{ backgroundColor: `${tag.cor}66`, borderColor: tag.cor }}
                                          >
                                            #{tag.nome}
                                          </span>
                                        ))}
                                      </div>
                                    )}
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

                        {isExpanded && section.rotinas.map((rotina) => {
                          const setor = getSetorById(rotina.setor_id);
                          const responsavel = getProfileById(rotina.responsavel_id || "");
                          const todayKey = getTodayKey();
                          const todayOccurrence = rotina.ocorrencias.find((item) => item.data === todayKey);
                          const responsavelStatus = getRotinaResponsavelStatus(rotina, todayKey);
                          const gestorStatus = getRotinaGestorStatus(rotina);
                          const allWeeks = getRotinaWeeks(rotina);
                          const repeatedLabel = `${rotina.previstas || rotina.ocorrencias.length || rotina.modelo.dias_semana.length}x`;
                          const dayStatusChips = rotina.modelo.dias_semana.map((day) => ({
                            day,
                            label: WEEKDAY_LABELS[day] || String(day),
                            status: getWeekdayStatus(rotina.ocorrencias, day),
                          }));

                          return (
                            <tr
                              key={`rotina-${rotina.key}`}
                              className="border-b border-orange-100 bg-orange-50/20 transition-colors hover:bg-orange-50/50"
                            >
                              <td className="px-3 py-2 text-center align-middle">
                                {isGestorOrAdmin && <span className="text-xs text-muted-foreground">-</span>}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 align-middle">
                                <Badge variant="outline" className="gap-1 rounded-full border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  REC
                                </Badge>
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-1">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: setor?.cor || rotina.modelo.cor }} />
                                  {setor?.nome || "Sem setor"}
                                </Badge>
                              </td>
                              {isGestorOrAdmin && (
                                <td className="whitespace-nowrap px-3 py-2 align-middle">
                                  <Badge
                                    variant="outline"
                                    className="gap-1.5 rounded-full px-2.5 py-1"
                                    style={{
                                      borderColor: `${responsavel?.cor || "#65a30d"}55`,
                                      backgroundColor: `${responsavel?.cor || "#65a30d"}14`,
                                      color: responsavel?.cor || "#65a30d",
                                    }}
                                  >
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: responsavel?.cor || "#65a30d" }} />
                                    {responsavel?.nome || "Sem responsável"}
                                  </Badge>
                                </td>
                              )}
                              <td className="min-w-0 px-3 py-2 align-middle">
                                <div className="flex min-w-0 items-center gap-2">
                                  <Clock3 className="h-4 w-4 shrink-0 text-orange-600" />
                                  <div className="flex shrink-0 items-center gap-1">
                                    {dayStatusChips.map((chip) => (
                                      <span
                                        key={chip.day}
                                        className={cn(
                                          "inline-flex h-6 min-w-8 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold",
                                          weekdayChipClass(chip.status)
                                        )}
                                        title={`${chip.label} · ${
                                          chip.status === "executado"
                                            ? "feito"
                                            : chip.status === "nao_realizado"
                                              ? "não feito"
                                              : chip.status === "pendente"
                                                ? "pendente"
                                                : "sem ocorrência"
                                        }`}
                                      >
                                        {chip.label}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="truncate font-medium leading-snug">{rotina.modelo.nome}</span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 align-middle">
                                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                  {semanasCompactas(allWeeks)}
                                </Badge>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-center align-middle">
                                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                  {repeatedLabel}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-center align-middle">
                                <div className="inline-flex items-center gap-2">
                                  <StatusBolinha
                                    status={responsavelStatus}
                                    onClick={
                                      todayOccurrence
                                        ? () => marcarRotinaOcorrencia(todayOccurrence.id, nextStatus(todayOccurrence.status_execucao))
                                        : undefined
                                    }
                                    disabled={!todayOccurrence}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {todayOccurrence
                                      ? todayOccurrence.status_execucao === "executado"
                                        ? "hoje"
                                        : `${rotina.feitas}/${rotina.previstas}`
                                      : `${rotina.feitas}/${rotina.previstas}`}
                                  </span>
                                </div>
                              </td>
                              {isGestorOrAdmin && (
                                <td className="px-3 py-2 text-center align-middle">
                                  <StatusBolinha
                                    status={gestorStatus}
                                    onClick={
                                      rotina.avaliacao
                                        ? () =>
                                            atualizarRotinaAvaliacao(
                                              rotina.avaliacao!.id,
                                              rotina.avaliacao!.status_gestor === "aprovado" ? "reprovado" : "aprovado"
                                            )
                                        : undefined
                                    }
                                    disabled={!rotina.avaliacao}
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 text-center align-middle">
                                <span className="text-xs text-muted-foreground">-</span>
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
                )}
              </TabsContent>
            </Tabs>
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
