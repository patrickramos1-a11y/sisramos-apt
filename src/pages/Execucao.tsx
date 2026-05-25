import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import { useMonthSettings } from "@/hooks/useMonthSettings";
import { useMomentoAPT } from "@/hooks/useMomentoAPT";
import { useAptMomentos } from "@/hooks/useAptMomentos";
import { supabase } from "@/integrations/supabase/client";
import APTHorizontalFilters from "@/components/apt/APTHorizontalFilters";
import APTFilters from "@/components/apt/APTFilters";
import AptMomentosNavigator from "@/components/apt/AptMomentosNavigator";
import ConfigurarAptDialog from "@/components/apt/ConfigurarAptDialog";
import TopSetoresBar from "@/components/apt/TopSetoresBar";
import StatusBolinha from "@/components/apt/StatusBolinha";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSetorWhatsAppHref } from "@/lib/setor-actions";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
    updateStatusResponsavel,
    updateStatusGestor,
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [executionDefaultsApplied, setExecutionDefaultsApplied] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeek = Math.min(5, Math.ceil(now.getDate() / 7));

  const viewedMes = filters.meses.length === 1 ? parseInt(filters.meses[0], 10) : currentMonth;
  const viewedAno = filters.anos.length === 1 ? parseInt(filters.anos[0], 10) : currentYear;

  const {
    config: momentosConfig,
    saveConfig: saveMomentos,
    semanasDoMomento,
    semanasDoMomentoAtivo,
  } = useAptMomentos(viewedMes, viewedAno);

  const activeMomentWeeks = useMemo(() => {
    if (momentoSelecionado !== null) {
      return semanasDoMomento(momentoSelecionado);
    }
    const weeks = semanasDoMomentoAtivo();
    if (weeks.length > 0) return weeks;
    if (suggestedWeek !== null) return [suggestedWeek];
    return [currentWeek];
  }, [momentoSelecionado, semanasDoMomento, semanasDoMomentoAtivo, suggestedWeek, currentWeek]);

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
    if (filters.semanas.length > 0) return;

    if (momentosConfig?.momento_ativo) {
      const weeks = semanasDoMomento(momentosConfig.momento_ativo);
      setMomentoSelecionado(momentosConfig.momento_ativo);
      setFilters((prev) => ({ ...prev, semanas: weeks.map(String) }));
      return;
    }

    const fallbackWeeks = suggestedWeek !== null ? [suggestedWeek] : [currentWeek];
    setFilters((prev) => ({ ...prev, semanas: fallbackWeeks.map(String) }));
  }, [
    currentWeek,
    executionDefaultsApplied,
    filters.semanas.length,
    momentosConfig,
    semanasDoMomento,
    setFilters,
    suggestedWeek,
  ]);

  const handleSelecionarMomento = (numero: number) => {
    setMomentoSelecionado(numero);
    const semanas = semanasDoMomento(numero);
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

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        siblings: [...group.siblings].sort(
          (a, b) => (Math.min(...a.semana_limite) || 99) - (Math.min(...b.semana_limite) || 99)
        ),
      }))
      .sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
  }, [filteredByTopSetor]);

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

  const pendingCount = filteredByTopSetor.filter((item) => item.status_responsavel === "pendente").length;
  const waitingApprovalCount = filteredByTopSetor.filter(
    (item) =>
      (item.status_responsavel === "executado" || item.status_responsavel === "nao_realizado") &&
      item.status_gestor === "pendente"
  ).length;

  const isMomentoBloqueado = isAPTBloqueado(viewedMes, viewedAno);
  const activeMomentNumber = momentoSelecionado ?? momentosConfig?.momento_ativo ?? null;
  const activeMomentLabel =
    activeMomentNumber !== null
      ? momentosConfig?.momentos.find((momento) => momento.numero === activeMomentNumber)?.label ??
        `Momento ${activeMomentNumber}`
      : suggestedWeek !== null
        ? `Semana sugerida ${semanaLabel(suggestedWeek)}`
        : `Semana atual ${semanaLabel(currentWeek)}`;

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

  const toggleExpanded = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
              <Link to="/apt-planejamento">
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
            config={momentosConfig}
            isGestorOrAdmin={isGestorOrAdmin}
            momentoSelecionado={activeMomentNumber}
            onSelecionarMomento={handleSelecionarMomento}
            onAbrirConfig={() => setShowConfigMomentosDialog(true)}
          />
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
        </div>

        {!isLoading && isGestorOrAdmin && filteredByTopSetor.length > 0 && (
          <TopSetoresBar
            demandas={filteredByTopSetor}
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
          <div className="space-y-4">
            {groupsByResponsavel.map((section) => {
              const profile = getProfileById(section.responsavelId);
              const sectionCount = section.groups.reduce((acc, group) => acc + group.siblings.length, 0);

              return (
                <section key={section.responsavelId} className="space-y-3">
                  {isGestorOrAdmin && (
                    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                        style={{
                          backgroundColor: `${profile?.cor || "#84cc16"}20`,
                          color: profile?.cor || "#65a30d",
                        }}
                      >
                        {(profile?.nome || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{profile?.nome || "Sem responsável"}</p>
                        <p className="text-xs text-muted-foreground">
                          {section.groups.length} metas agrupadas · {sectionCount} ocorrências do momento
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3">
                    {section.groups.map((group) => {
                      const setor = getSetorById(group.setor_id);
                      const summary = getExecutionStatusSummary(group);
                      const allWeeks = [...new Set(group.siblings.flatMap((item) => item.semana_limite))].sort((a, b) => a - b);
                      const firstWhatsappHref = getWhatsappHref(group.siblings[0]);
                      const isExpanded = expandedGroups.has(group.key);

                      return (
                        <Card
                          key={group.key}
                          className={cn(
                            "overflow-hidden border-border/60",
                            group.muito_urgente && "border-destructive/30 bg-destructive/[0.03]",
                            group.prioritaria && !group.muito_urgente && "border-warning/30 bg-warning/[0.03]"
                          )}
                        >
                          <CardHeader className="px-4 py-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                                    {group.muito_urgente ? (
                                      <Flame className="h-4 w-4 fill-destructive text-destructive" />
                                    ) : group.prioritaria ? (
                                      <Star className="h-4 w-4 fill-warning text-warning" />
                                    ) : null}
                                  </span>
                                  <div className="min-w-0">
                                    <CardTitle className="text-base leading-snug">{group.descricao}</CardTitle>
                                    {group.observacoes.length > 0 && (
                                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                        {group.observacoes[0]}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-1">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: setor?.cor || "#CBD5E1" }}
                                    />
                                    {setor?.nome || "Sem setor"}
                                  </Badge>
                                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                    {allWeeks.length > 1 ? `Aglutinada em ${allWeeks.length} semanas` : "Meta pontual do ciclo"}
                                  </Badge>
                                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                    {semanasCompactas(allWeeks)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                <Badge className="rounded-full bg-warning/10 px-2.5 py-1 text-warning hover:bg-warning/10">
                                  {summary.pendentes} pend.
                                </Badge>
                                <Badge className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 hover:bg-emerald-500/10">
                                  {summary.feitas}/{summary.total} feitas
                                </Badge>
                                {summary.aguardandoGestor > 0 && (
                                  <Badge className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-700 hover:bg-sky-500/10">
                                    {summary.aguardandoGestor} aguardando gestor
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => toggleExpanded(group.key)}
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  {isExpanded ? "Ocultar semanas" : "Ver semanas"}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          {isExpanded && (
                            <CardContent className="border-t border-border/60 px-4 py-3">
                              <div className="space-y-2">
                                {group.siblings.map((demanda) => {
                                  const whatsappHref = getWhatsappHref(demanda) || firstWhatsappHref;
                                  const canEditResponsavel =
                                    isStatusUpdateAllowed(demanda.mes, demanda.ano) &&
                                    (!isColaborador || !isMomentoBloqueado) &&
                                    (role === "admin" || user?.id === demanda.responsavel_id);
                                  const canEditGestor =
                                    isStatusUpdateAllowed(demanda.mes, demanda.ano) && isGestorOrAdmin;

                                  return (
                                    <div
                                      key={demanda.id}
                                      className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 md:flex-row md:items-center md:justify-between"
                                    >
                                      <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                                            {semanaLabel(Math.min(...demanda.semana_limite))}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">Demanda #{demanda.numero}</span>
                                        </div>
                                        {demanda.observacoes && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">{demanda.observacoes}</p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Feito
                                          </span>
                                          <StatusBolinha
                                            size="sm"
                                            status={demanda.status_responsavel}
                                            onClick={() => updateStatusResponsavel(demanda.id, demanda.status_responsavel)}
                                            disabled={!canEditResponsavel}
                                          />
                                        </div>

                                        {isGestorOrAdmin && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                              Aprov.
                                            </span>
                                            <StatusBolinha
                                              size="sm"
                                              status={demanda.status_gestor}
                                              onClick={() => updateStatusGestor(demanda.id, demanda.status_gestor)}
                                              disabled={!canEditGestor}
                                            />
                                          </div>
                                        )}

                                        {whatsappHref && (
                                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700">
                                            <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Enviar mensagem no WhatsApp">
                                              <MessageCircle className="h-4 w-4" />
                                            </a>
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
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
