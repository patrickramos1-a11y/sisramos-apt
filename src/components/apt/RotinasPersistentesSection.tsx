import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AptRotinaOcorrencia,
  AptRotinaStatusAvaliacao,
  useAptRotinas,
} from "@/hooks/useAptRotinas";
import {
  CalendarCheck2,
  CheckCircle2,
  Circle,
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

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
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

  const renderOccurrenceDot = (ocorrencia: AptRotinaOcorrencia) => {
    const meta = STATUS_META[ocorrencia.status_execucao];
    const Icon = meta.icon;

    return (
      <button
        key={ocorrencia.id}
        type="button"
        className={cn(
          "group flex min-w-[78px] flex-col items-center rounded-xl border px-2 py-2 text-xs transition-colors hover:bg-muted/60",
          meta.className
        )}
        onClick={() =>
          marcarOcorrencia(
            ocorrencia.id,
            ocorrencia.status_execucao === "executado" ? "nao_realizado" : "executado"
          )
        }
        title="Clique para alternar entre feito e não feito"
      >
        <Icon className="mb-1 h-4 w-4" />
        <span className="font-semibold">{formatDate(ocorrencia.data)}</span>
        <span className="text-[10px] opacity-80">{meta.label}</span>
      </button>
    );
  };

  return (
    <section className="space-y-3">
      {tableUnavailable && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex flex-col gap-2 p-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Rotinas persistentes em modo local</p>
              <p className="text-xs">
                Você consegue testar neste navegador. Para ficar público para todos, a migration `apt_rotinas_persistentes` precisa ser aplicada no Lovable.
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
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Rotinas persistentes do momento</p>
            <p className="text-xs text-muted-foreground">
              Ocorrências por data, separadas das demandas comuns e resumidas para aprovação semanal.
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
          <Badge className="rounded-full bg-sky-100 px-3 py-1 text-sky-700 hover:bg-sky-100">
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
        <div className="space-y-3">
          {filteredResumos.map((resumo) => {
            const profile = profiles.find((item) => item.user_id === resumo.responsavel_id);
            const setor = setores.find((item) => item.id === resumo.setor_id);
            const avaliacaoStatus = resumo.avaliacao?.status_gestor;

            return (
              <article key={resumo.key} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: resumo.modelo.cor }} />
                      <h3 className="font-semibold leading-tight">{resumo.modelo.nome}</h3>
                      <Badge variant="secondary" className="rounded-full">
                        {setor?.nome || "Sem setor"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {profile?.nome || "Sem responsável"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{resumo.modelo.descricao}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {resumo.feitas}/{resumo.previstas} feitas
                    </Badge>
                    <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100">
                      {resumo.pendentes} pend.
                    </Badge>
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
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {resumo.ocorrencias.map(renderOccurrenceDot)}
                </div>

                {isGestorOrAdmin && resumo.avaliacao && (
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => atualizarAvaliacao(resumo.avaliacao!.id, "aprovado")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar resumo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => atualizarAvaliacao(resumo.avaliacao!.id, "reprovado")}
                    >
                      <XCircle className="h-4 w-4" />
                      Reprovar
                    </Button>
                  </div>
                )}

                {isGestorOrAdmin && !resumo.avaliacao && (
                  <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <Circle className="h-3 w-3" />
                    Calcule o resumo do momento para liberar a aprovação desta rotina.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
