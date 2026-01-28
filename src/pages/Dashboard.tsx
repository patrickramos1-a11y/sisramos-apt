import { useMemo, useState, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useDemandas } from "@/hooks/useDemandas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChartExportButtons from "@/components/dashboard/ChartExportButtons";
import ExportAllChartsButton from "@/components/dashboard/ExportAllChartsButton";

export default function Dashboard() {
  const { demandas, profiles, setores, isLoading, getProfileById, getSetorById } = useDemandas();

  // Chart refs for export
  const chartPizzaRef = useRef<HTMLDivElement>(null);
  const chartComparativoRef = useRef<HTMLDivElement>(null);

  // Estados dos filtros - inicializa com mês e ano atuais
  const currentDate = new Date();
  const [filterAno, setFilterAno] = useState<string>(currentDate.getFullYear().toString());
  const [filterMes, setFilterMes] = useState<string>((currentDate.getMonth() + 1).toString());
  const [filterSemana, setFilterSemana] = useState<string>("all");
  const [filterUsuario, setFilterUsuario] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");

  // All charts info for bulk export
  const allCharts = [
    { ref: chartPizzaRef, title: "Distribuição por Setor" },
    { ref: chartComparativoRef, title: "Status por Usuário" },
  ];

  // Opções de semanas
  const semanas = [
    { value: "1", label: "1ª Semana" },
    { value: "2", label: "2ª Semana" },
    { value: "3", label: "3ª Semana" },
    { value: "4", label: "4ª Semana" },
    { value: "5", label: "5ª Semana" },
  ];

  // Opções de anos disponíveis
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    demandas.forEach((d) => anos.add(d.ano));
    return Array.from(anos).sort((a, b) => b - a);
  }, [demandas]);

  // Opções de meses
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

  // Demandas filtradas
  const demandasFiltradas = useMemo(() => {
    return demandas.filter((demanda) => {
      if (filterAno !== "all" && demanda.ano !== parseInt(filterAno)) return false;
      if (filterMes !== "all" && demanda.mes !== parseInt(filterMes)) return false;
      if (filterSemana !== "all" && !demanda.semana_limite?.includes(parseInt(filterSemana))) return false;
      if (filterUsuario !== "all" && demanda.responsavel_id !== filterUsuario) return false;
      if (filterSetor !== "all" && demanda.setor_id !== filterSetor) return false;
      return true;
    });
  }, [demandas, filterAno, filterMes, filterSemana, filterUsuario, filterSetor]);

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFilterAno("all");
    setFilterMes("all");
    setFilterSemana("all");
    setFilterUsuario("all");
    setFilterSetor("all");
  };

  const temFiltrosAtivos = filterAno !== "all" || filterMes !== "all" || filterSemana !== "all" || filterUsuario !== "all" || filterSetor !== "all";

  // Dados: Pizza de porcentagem de setores
  const { setoresPizzaData, setoresPizzaConfig } = useMemo(() => {
    const setorCounts: Record<string, number> = {};
    
    demandasFiltradas.forEach((demanda) => {
      const setor = getSetorById(demanda.setor_id);
      const setorName = setor?.nome || "Sem setor";
      setorCounts[setorName] = (setorCounts[setorName] || 0) + 1;
    });

    const total = demandasFiltradas.length;
    const colors = [
      "hsl(var(--primary))",
      "hsl(142 76% 36%)",
      "hsl(221 83% 53%)",
      "hsl(38 92% 50%)",
      "hsl(280 65% 60%)",
      "hsl(0 84% 60%)",
      "hsl(180 70% 45%)",
      "hsl(320 70% 50%)",
    ];

    const data = Object.entries(setorCounts).map(([nome, count], index) => {
      const setorData = setores.find(s => s.nome === nome);
      return {
        nome,
        value: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        fill: setorData?.cor || colors[index % colors.length],
      };
    });

    const config: Record<string, { label: string; color: string }> = {};
    data.forEach((item) => {
      config[item.nome] = {
        label: item.nome,
        color: item.fill,
      };
    });

    return { setoresPizzaData: data, setoresPizzaConfig: config };
  }, [demandasFiltradas, getSetorById, setores]);

  // Dados: Comparativo completo (feito, aprovado, não realizado, pendente)
  const comparativoCompleto = useMemo(() => {
    const userData: Record<string, { feito: number; aprovado: number; nao_realizado: number; pendente: number }> = {};
    
    demandasFiltradas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      
      if (!userData[userName]) {
        userData[userName] = { feito: 0, aprovado: 0, nao_realizado: 0, pendente: 0 };
      }
      
      // Status do responsável
      if (demanda.status_responsavel === "executado") {
        userData[userName].feito++;
      } else if (demanda.status_responsavel === "nao_realizado") {
        userData[userName].nao_realizado++;
      } else if (demanda.status_responsavel === "pendente") {
        userData[userName].pendente++;
      }
      
      // Status do gestor (aprovado)
      if (demanda.status_gestor === "executado") {
        userData[userName].aprovado++;
      }
    });

    return Object.entries(userData).map(([nome, data]) => ({
      nome,
      feito: data.feito,
      aprovado: data.aprovado,
      nao_realizado: data.nao_realizado,
      pendente: data.pendente,
    })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [demandasFiltradas, getProfileById]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = demandasFiltradas.length;
    const feito = demandasFiltradas.filter(d => d.status_responsavel === "executado").length;
    const aprovado = demandasFiltradas.filter(d => d.status_gestor === "executado").length;
    const pendente = demandasFiltradas.filter(d => d.status_responsavel === "pendente").length;
    const naoRealizado = demandasFiltradas.filter(d => d.status_responsavel === "nao_realizado").length;
    
    return { total, feito, aprovado, pendente, naoRealizado };
  }, [demandasFiltradas]);


  const chartConfigComparativo = {
    feito: {
      label: "Feito",
      color: "hsl(142 76% 36%)",
    },
    aprovado: {
      label: "Aprovado",
      color: "hsl(221 83% 53%)",
    },
    nao_realizado: {
      label: "Não Realizado",
      color: "hsl(0 84% 60%)",
    },
    pendente: {
      label: "Pendente",
      color: "hsl(38 92% 50%)",
    },
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visão geral do desempenho da equipe
              </p>
            </div>
            <ExportAllChartsButton charts={allCharts} />
          </div>
          
          {/* Filtros */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap items-end gap-4">
                {/* Filtro de Ano */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</span>
                  <Select value={filterAno} onValueChange={setFilterAno}>
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {anosDisponiveis.map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Mês */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mês</span>
                  <Select value={filterMes} onValueChange={setFilterMes}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {meses.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Semana */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Semana</span>
                  <Select value={filterSemana} onValueChange={setFilterSemana}>
                    <SelectTrigger className="w-[120px] h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {semanas.map((semana) => (
                        <SelectItem key={semana.value} value={semana.value}>
                          {semana.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Usuário */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuário</span>
                  <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Setor */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Setor</span>
                  <Select value={filterSetor} onValueChange={setFilterSetor}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Badge com total filtrado */}
              {temFiltrosAtivos && (
                <div className="mt-3 pt-3 border-t">
                  <Badge variant="secondary">
                    {demandasFiltradas.length} demanda{demandasFiltradas.length !== 1 ? "s" : ""} encontrada{demandasFiltradas.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Feito</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryStats.feito}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.total > 0 ? Math.round((summaryStats.feito / summaryStats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aprovado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summaryStats.aprovado}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.total > 0 ? Math.round((summaryStats.aprovado / summaryStats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.pendente}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.total > 0 ? Math.round((summaryStats.pendente / summaryStats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Gráfico de Comparativo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Gráfico de Comparativo</CardTitle>
              <ChartExportButtons chartRef={chartComparativoRef} chartName="Gráfico de Comparativo" />
            </CardHeader>
            <CardContent>
              <div ref={chartComparativoRef}>
                <ChartContainer config={chartConfigComparativo} className="h-[300px] w-full">
                  <BarChart data={comparativoCompleto} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="feito" fill="var(--color-feito)" radius={4} />
                    <Bar dataKey="aprovado" fill="var(--color-aprovado)" radius={4} />
                    <Bar dataKey="nao_realizado" fill="var(--color-nao_realizado)" radius={4} />
                    <Bar dataKey="pendente" fill="var(--color-pendente)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
