import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AptRotinaStatusAvaliacao,
  AptRotinaStatusOcorrencia,
  AptRotinaOcorrencia,
  AptRotinaResumo,
  useAptRotinas,
} from "@/hooks/useAptRotinas";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface RotinasPersistentesSectionProps {
  mes: number;
  ano: number;
  semanas: number[];
  momento: number | null;
  isGestorOrAdmin: boolean;
  profiles: Array<{ user_id: string; nome: string; cor?: string | null }>;
  setores: Array<{ id: string; nome: string; cor?: string | null }>;
}

type StatusFilter = "todos" | "pendentes" | "executado" | "nao_realizado";

const STATUS_META = {
  pendente: {
    label: "Pendente",
    icon: Clock3,
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
  },
  executado: {
    label: "Feito",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  nao_realizado: {
    label: "Não feito",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
} as const;

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function ordinalWeek(week: number) {
  return `${week}ª`;
}

function getResumoWeeks(resumo: AptRotinaResumo) {
  const fromOcorrencias = resumo.ocorrencias.map((item) => item.semana_apt);
  const source = fromOcorrencias.length > 0 ? fromOcorrencias : resumo.modelo.semanas_aplicaveis;
  return [...new Set(source)].filter(Boolean).sort((a, b) => a - b);
}

function getWeeklyFrequency(resumo: AptRotinaResumo) {
  if (resumo.ocorrencias.length === 0) return resumo.modelo.dias_semana.length;

  const perWeek = new Map<number, number>();
  resumo.ocorrencias.forEach((item) => {
    perWeek.set(item.semana_apt, (perWeek.get(item.semana_apt) || 0) + 1);
  });

  return Math.max(0, ...Array.from(perWeek.values()));
}

function getRowStatus(resumo: AptRotinaResumo, todayKey: string): AptRotinaStatusOcorrencia {
  const todayOccurrence = resumo.ocorrencias.find((item) => item.data === todayKey);
  if (todayOccurrence) return todayOccurrence.status_execucao;
  if (resumo.pendentes > 0) return "pendente";
  if (resumo.nao_feitas > 0) return "nao_realizado";
  return "executado";
}

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

function getDateWeekday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getWeekdayStatus(
  ocorrencias: AptRotinaOcorrencia[],
  weekday: number
): AptRotinaStatusOcorrencia | "sem_ocorrencia" {
  const rows = ocorrencias.filter((item) => getDateWeekday(item.data) === weekday);
  if (rows.some((item) => item.status_execucao === "nao_realizado")) return "nao_realizado";
  if (rows.some((item) => item.status_execucao === "pendente")) return "pendente";
  if (rows.some((item) => item.status_execucao === "executado")) return "executado";
  return "sem_ocorrencia";
}

function getWeekdayTone(status: AptRotinaStatusOcorrencia | "sem_ocorrencia") {
  if (status === "executado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "nao_realizado") return "border-red-200 bg-red-50 text-red-700";
  if (status === "pendente") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-border bg-muted/40 text-muted-foreground";
}

function statusLabel(status: AptRotinaStatusAvaliacao | undefined) {
  if (status === "aprovado") return "Aprovado";
  if (status === "reprovado") return "Reprovado";
  return "Aguardando";
}

export default function RotinasPersistentesSection({
  mes,
  ano,
  semanas,
  momento,
  isGestorOrAdmin,
  profiles,
  setores,
}: RotinasPersistentesSectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const {
    modelos,
    resumos,
    ocorrencias,
    isLoading,
    tableUnavailable,
    gerarOcorrenciasDoPeriodo,
    marcarOcorrencia,
    calcularResumoDoMomento,
    atualizarAvaliacao,
  } = useAptRotinas({ mes, ano, semanas, momento });

  const filteredResumos = useMemo(() => {
    if (statusFilter === "todos") return resumos;
    const targetStatus = statusFilter === "pendentes" ? "pendente" : statusFilter;
    return resumos.filter((resumo) => resumo.ocorrencias.some((item) => item.status_execucao === targetStatus));
  }, [resumos, statusFilter]);

  const totals = useMemo(() => {
    const previstas = resumos.reduce((acc, resumo) => acc + resumo.previstas, 0);
    const feitas = resumos.reduce((acc, resumo) => acc + resumo.feitas, 0);
    const naoFeitas = resumos.reduce((acc, resumo) => acc + resumo.nao_feitas, 0);
    const pendentes = resumos.reduce((acc, resumo) => acc + resumo.pendentes, 0);
    const aguardando = resumos.filter((resumo) => resumo.modelo.exige_aprovacao && resumo.avaliacao?.status_gestor !== "aprovado").length;

    return {
      previstas,
      feitas,
      naoFeitas,
      pendentes,
      aguardando,
      percentual: previstas > 0 ? Math.round((feitas / previstas) * 100) : 0,
    };
  }, [resumos]);

  const setorStats = useMemo(() => {
    const map = new Map<string, { setorId: string | null; nome: string; cor: string; pendentes: number; previstas: number; feitas: number }>();

    resumos.forEach((resumo) => {
      const setor = setores.find((item) => item.id === resumo.setor_id);
      const key = resumo.setor_id || "sem_setor";
      const current = map.get(key) || {
        setorId: resumo.setor_id,
        nome: setor?.nome || "Sem Setor",
        cor: setor?.cor || "#64748b",
        pendentes: 0,
        previstas: 0,
        feitas: 0,
      };
      current.pendentes += resumo.pendentes;
      current.previstas += resumo.previstas;
      current.feitas += resumo.feitas;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.pendentes - a.pendentes || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [resumos, setores]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await gerarOcorrenciasDoPeriodo();
    setIsGenerating(false);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    await calcularResumoDoMomento();
    setIsCalculating(false);
  };

  const todayKey = getTodayKey();

  return (
    <section className="space-y-3">
      {tableUnavailable && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex flex-col gap-2 p-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Rotinas persistentes aguardando Supabase</p>
              <p className="text-xs">
                O app não vai mais salvar rotinas só neste navegador. A migration `apt_rotinas_persistentes` precisa estar ativa no Supabase para criar, marcar e aprovar.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-amber-300 bg-white/60 text-amber-800">
              Banco pendente
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-orange-100 p-2 text-orange-700">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Demandas persistentes do momento</p>
            <p className="text-xs text-muted-foreground">
              Aparecem como demandas recorrentes: setor, responsável, semanas, frequência e ação do dia.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {totals.previstas} previstas
          </Badge>
          <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">
            {totals.feitas} feitas
          </Badge>
          <Badge className="rounded-full bg-red-100 px-3 py-1 text-red-700 hover:bg-red-100">
            {totals.naoFeitas} não feitas
          </Badge>
          <Badge className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100">
            {totals.pendentes} pendentes
          </Badge>
          <Badge className="rounded-full bg-orange-100 px-3 py-1 text-orange-700 hover:bg-orange-100">
            {totals.percentual}%
          </Badge>
        </div>
      </div>

      {isGestorOrAdmin && setorStats.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {setorStats.map((item) => (
            <div key={item.setorId || "sem_setor"} className="rounded-2xl border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.cor }} />
                <span className="truncate text-xs font-semibold">{item.nome}</span>
              </div>
              <p className="mt-2 text-xl font-bold">{item.pendentes}</p>
              <p className="text-xs text-muted-foreground">
                pend. · {item.feitas}/{item.previstas} feitas
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["todos", "Todos"],
            ["pendentes", "Pendentes"],
            ["executado", "Feitas"],
            ["nao_realizado", "Não feitas"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value as StatusFilter)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {isGestorOrAdmin && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate} disabled={isGenerating || modelos.length === 0}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Gerar ocorrências
              </Button>
              <Button size="sm" className="gap-2" onClick={handleCalculate} disabled={isCalculating || resumos.length === 0}>
                {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Calcular resumo
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : modelos.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Nenhuma rotina persistente configurada ainda. Configure em Configurações &gt; Setores.
        </div>
      ) : ocorrencias.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Existem modelos configurados, mas ainda não há ocorrências para este mês/momento.
          {isGestorOrAdmin && " Use o botão “Gerar ocorrências” para criar as datas do ciclo."}
        </div>
      ) : filteredResumos.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Nenhuma rotina encontrada para este filtro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <div className="grid min-w-[1220px] grid-cols-[minmax(300px,1fr)_150px_140px_80px_100px_220px_190px_150px] items-center gap-3 bg-orange-50/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-orange-900">
            <span>Demanda persistente</span>
            <span>Responsável</span>
            <span>Setor</span>
            <span>Rep.</span>
            <span>Semanas</span>
            <span>Status dos dias</span>
            <span>Status de hoje</span>
            <span className="text-right">Aprovação</span>
          </div>
          {filteredResumos.map((resumo) => {
            const profile = profiles.find((item) => item.user_id === resumo.responsavel_id);
            const setor = setores.find((item) => item.id === resumo.setor_id);
            const avaliacaoStatus = resumo.avaliacao?.status_gestor;
            const weeks = getResumoWeeks(resumo);
            const monthlyCount = resumo.previstas || resumo.ocorrencias.length || getWeeklyFrequency(resumo);
            const todayOccurrence = resumo.ocorrencias.find((item) => item.data === todayKey);
            const nextOccurrence = resumo.ocorrencias
              .filter((item) => item.data > todayKey)
              .sort((a, b) => a.data.localeCompare(b.data))[0];
            const rowStatus = getRowStatus(resumo, todayKey);
            const statusMeta = STATUS_META[rowStatus];
            const StatusIcon = statusMeta.icon;
            const weekdayChips = resumo.modelo.dias_semana.map((weekday) => ({
              weekday,
              label: WEEKDAY_LABELS[weekday] ?? String(weekday),
              status: getWeekdayStatus(resumo.ocorrencias, weekday),
            }));
            return (
              <article
                key={resumo.key}
                className="grid min-w-[1220px] grid-cols-[minmax(300px,1fr)_150px_140px_80px_100px_220px_190px_150px] items-center gap-3 border-t px-4 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-100 text-orange-700"
                      title="Demanda persistente"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-tight">{resumo.modelo.nome}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {resumo.modelo.descricao || "Sem descrição operacional."}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Badge
                    variant="outline"
                    className="rounded-full"
                    style={{
                      borderColor: `${profile?.cor || "#64748b"}55`,
                      backgroundColor: `${profile?.cor || "#64748b"}14`,
                      color: profile?.cor || "#334155",
                    }}
                  >
                    {profile?.nome || "Sem responsável"}
                  </Badge>
                </div>

                <div>
                  <Badge
                    variant="secondary"
                    className="rounded-full"
                    style={{
                      borderColor: `${setor?.cor || resumo.modelo.cor}44`,
                      backgroundColor: `${setor?.cor || resumo.modelo.cor}18`,
                      color: setor?.cor || resumo.modelo.cor,
                    }}
                  >
                    {setor?.nome || "Sem setor"}
                  </Badge>
                </div>

                <div>
                  <Badge variant="outline" className="rounded-full px-2 py-1 text-xs">
                    {monthlyCount}x
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {weeks.map((week) => (
                    <Badge key={week} variant="outline" className="rounded-full px-2 py-1 text-xs">
                      {ordinalWeek(week)}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {weekdayChips.map((chip) => (
                    <Badge
                      key={chip.weekday}
                      variant="outline"
                      className={cn("rounded-full px-2 py-0.5 text-[11px]", getWeekdayTone(chip.status))}
                      title={
                        chip.status === "executado"
                          ? "Dia feito"
                          : chip.status === "nao_realizado"
                            ? "Dia não feito"
                            : chip.status === "pendente"
                              ? "Dia pendente"
                              : "Sem ocorrência gerada"
                      }
                    >
                      {chip.label}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-1">
                  {todayOccurrence ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={todayOccurrence.status_execucao === "executado" ? "outline" : "default"}
                      className={cn(
                        "h-8 w-full gap-2 rounded-full",
                        todayOccurrence.status_execucao === "executado"
                          ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                          : todayOccurrence.status_execucao === "nao_realizado"
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-orange-600 text-white hover:bg-orange-700"
                      )}
                      onClick={() =>
                        marcarOcorrencia(
                          todayOccurrence.id,
                          todayOccurrence.status_execucao === "executado" ? "nao_realizado" : "executado"
                        )
                      }
                    >
                      <StatusIcon className="h-4 w-4" />
                      {todayOccurrence.status_execucao === "executado" ? "Feito hoje" : "Marcar hoje"}
                    </Button>
                  ) : (
                    <Badge variant="outline" className={cn("w-full justify-center rounded-full py-1.5", statusMeta.className)}>
                      <StatusIcon className="mr-1 h-3.5 w-3.5" />
                      {nextOccurrence ? `Próx. ${formatShortDate(nextOccurrence.data)}` : statusMeta.label}
                    </Badge>
                  )}
                  <p className="text-center text-[11px] text-muted-foreground">
                    {resumo.feitas}/{resumo.previstas} feitas · {resumo.pendentes} pend.
                  </p>
                </div>

                <div className="flex justify-end">
                  {isGestorOrAdmin && resumo.avaliacao ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => atualizarAvaliacao(resumo.avaliacao!.id, "aprovado")}
                        title="Aprovar resumo"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => atualizarAvaliacao(resumo.avaliacao!.id, "reprovado")}
                        title="Reprovar resumo"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        avaliacaoStatus === "aprovado" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                        avaliacaoStatus === "reprovado" && "border-red-200 bg-red-50 text-red-700"
                      )}
                    >
                      {statusLabel(avaliacaoStatus)}
                    </Badge>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
