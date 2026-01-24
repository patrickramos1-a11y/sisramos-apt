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
  const chartSetoresRef = useRef<HTMLDivElement>(null);
  const chartPizzaRef = useRef<HTMLDivElement>(null);
  const chartPendentesRef = useRef<HTMLDivElement>(null);
  const chartFeitoRef = useRef<HTMLDivElement>(null);
  const chartAprovadoRef = useRef<HTMLDivElement>(null);
  const chartNaoRealizadoRef = useRef<HTMLDivElement>(null);
  const chartComparativoRef = useRef<HTMLDivElement>(null);

  // Estados dos filtros
  const [filterAno, setFilterAno] = useState<string>("all");
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterSemana, setFilterSemana] = useState<string>("all");
  const [filterUsuario, setFilterUsuario] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");

  // All charts info for bulk export
  const allCharts = [
    { ref: chartSetoresRef, title: "Gráfico de Setores" },
    { ref: chartPizzaRef, title: "Distribuição por Setor" },
    { ref: chartPendentesRef, title: "Gráfico de Pendentes" },
    { ref: chartFeitoRef, title: "Gráfico de Feito" },
    { ref: chartAprovadoRef, title: "Gráfico de Aprovado" },
    { ref: chartNaoRealizadoRef, title: "Gráfico de Não Realizado" },
    { ref: chartComparativoRef, title: "Gráfico de Comparativo" },
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

  // Dados: Setores por usuário (X = usuários, Y = setores)
  const { setoresPorUsuarioData, setoresPorUsuarioConfig } = useMemo(() => {
    // Cria uma estrutura: { usuario: { setor1: count, setor2: count, ... } }
    const userSetorCounts: Record<string, Record<string, number>> = {};
    const allSetorNames = new Set<string>();
    
    demandasFiltradas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      const setor = getSetorById(demanda.setor_id);
      const setorName = setor?.nome || "Sem setor";
      
      allSetorNames.add(setorName);
      
      if (!userSetorCounts[userName]) {
        userSetorCounts[userName] = {};
      }
      userSetorCounts[userName][setorName] = (userSetorCounts[userName][setorName] || 0) + 1;
    });

    // Converte para o formato do recharts
    const data = Object.entries(userSetorCounts).map(([nome, setorCounts]) => ({
      nome,
      ...setorCounts,
    }));

    // Cria config dinâmico para cada setor com cores distintas
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
    
    const config: Record<string, { label: string; color: string }> = {};
    const setorArray = Array.from(allSetorNames);
    setorArray.forEach((setor, index) => {
      const setorData = setores.find(s => s.nome === setor);
      config[setor] = {
        label: setor,
        color: setorData?.cor || colors[index % colors.length],
      };
    });

    return { setoresPorUsuarioData: data, setoresPorUsuarioConfig: config, setorNames: setorArray };
  }, [demandasFiltradas, getProfileById, getSetorById, setores]);

  // Lista de setores para renderizar as barras
  const setorNames = useMemo(() => {
    return Object.keys(setoresPorUsuarioConfig);
  }, [setoresPorUsuarioConfig]);

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

  // Dados: Feito por usuário (status_responsavel = executado)
  const feitoPorUsuario = useMemo(() => {
    const userFeito: Record<string, { feito: number; total: number }> = {};
    
    demandasFiltradas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      
      if (!userFeito[userName]) {
        userFeito[userName] = { feito: 0, total: 0 };
      }
      userFeito[userName].total++;
      if (demanda.status_responsavel === "executado") {
        userFeito[userName].feito++;
      }
    });

    return Object.entries(userFeito).map(([nome, data]) => ({
      nome,
      feito: data.feito,
      total: data.total,
    })).sort((a, b) => b.feito - a.feito);
  }, [demandasFiltradas, getProfileById]);

  // Dados: Aprovado por usuário (status_gestor = executado)
  const aprovadoPorUsuario = useMemo(() => {
    const userAprovado: Record<string, { aprovado: number; total: number }> = {};
    
    demandasFiltradas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      
      if (!userAprovado[userName]) {
        userAprovado[userName] = { aprovado: 0, total: 0 };
      }
      userAprovado[userName].total++;
      if (demanda.status_gestor === "executado") {
        userAprovado[userName].aprovado++;
      }
    });

    return Object.entries(userAprovado).map(([nome, data]) => ({
      nome,
      aprovado: data.aprovado,
      total: data.total,
    })).sort((a, b) => b.aprovado - a.aprovado);
  }, [demandasFiltradas, getProfileById]);

  // Dados: Não realizado por usuário (status_responsavel = nao_realizado)
  const naoRealizadoPorUsuario = useMemo(() => {
    const userNaoRealizado: Record<string, { nao_realizado: number; total: number }> = {};
    
    demandasFiltradas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      
      if (!userNaoRealizado[userName]) {
        userNaoRealizado[userName] = { nao_realizado: 0, total: 0 };
      }
      userNaoRealizado[userName].total++;
      if (demanda.status_responsavel === "nao_realizado") {
        userNaoRealizado[userName].nao_realizado++;
      }
    });

    return Object.entries(userNaoRealizado).map(([nome, data]) => ({
      nome,
      nao_realizado: data.nao_realizado,
      total: data.total,
    })).sort((a, b) => b.nao_realizado - a.nao_realizado);
  }, [demandasFiltradas, getProfileById]);

  // Dados: Pendente por usuário (status_responsavel = pendente)
  const pendentePorUsuario = useMemo(() => {
    const userPendente: Record<string, { pendente: number; total: number }> = {};
    
    demandasFiltradas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      
      if (!userPendente[userName]) {
        userPendente[userName] = { pendente: 0, total: 0 };
      }
      userPendente[userName].total++;
      if (demanda.status_responsavel === "pendente") {
        userPendente[userName].pendente++;
      }
    });

    return Object.entries(userPendente).map(([nome, data]) => ({
      nome,
      pendente: data.pendente,
      total: data.total,
    })).sort((a, b) => b.pendente - a.pendente);
  }, [demandasFiltradas, getProfileById]);

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


  const chartConfigFeito = {
    feito: {
      label: "Feito",
      color: "hsl(142 76% 36%)",
    },
  };

  const chartConfigAprovado = {
    aprovado: {
      label: "Aprovado",
      color: "hsl(221 83% 53%)",
    },
  };

  const chartConfigNaoRealizado = {
    nao_realizado: {
      label: "Não Realizado",
      color: "hsl(0 84% 60%)",
    },
  };

  const chartConfigPendente = {
    pendente: {
      label: "Pendente",
      color: "hsl(38 92% 50%)",
    },
  };

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
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold">Dashboards</h1>
            <ExportAllChartsButton charts={allCharts} />
          </div>
          
          {/* Filtros */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Filtro de Ano */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Ano</span>
                  <Select value={filterAno} onValueChange={setFilterAno}>
                    <SelectTrigger className="w-[120px]">
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
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Mês</span>
                  <Select value={filterMes} onValueChange={setFilterMes}>
                    <SelectTrigger className="w-[140px]">
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
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Semana</span>
                  <Select value={filterSemana} onValueChange={setFilterSemana}>
                    <SelectTrigger className="w-[130px]">
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
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Usuário</span>
                  <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                    <SelectTrigger className="w-[180px]">
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
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Setor</span>
                  <Select value={filterSetor} onValueChange={setFilterSetor}>
                    <SelectTrigger className="w-[160px]">
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

                {/* Botão Limpar Filtros */}
                {temFiltrosAtivos && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-transparent">.</span>
                    <Button variant="outline" size="sm" onClick={limparFiltros} className="gap-1">
                      <X className="h-4 w-4" />
                      Limpar
                    </Button>
                  </div>
                )}
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
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Setores - Barras */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Gráfico de Setores</CardTitle>
              <ChartExportButtons chartRef={chartSetoresRef} chartName="Gráfico de Setores" />
            </CardHeader>
            <CardContent>
              <div ref={chartSetoresRef}>
                <ChartContainer config={setoresPorUsuarioConfig} className="h-[300px] w-full">
                  <BarChart data={setoresPorUsuarioData} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    {setorNames.map((setor) => (
                      <Bar 
                        key={setor} 
                        dataKey={setor} 
                        fill={setoresPorUsuarioConfig[setor]?.color || "hsl(var(--primary))"} 
                        radius={4} 
                        stackId="setores"
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Porcentagem de Setores */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Distribuição por Setor</CardTitle>
              <ChartExportButtons chartRef={chartPizzaRef} chartName="Distribuição por Setor" />
            </CardHeader>
            <CardContent>
              <div ref={chartPizzaRef}>
                <ChartContainer config={setoresPizzaConfig} className="h-[300px] w-full">
                  <PieChart>
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          formatter={(value, name, item) => (
                            <span>{item.payload.percentage}% ({value})</span>
                          )}
                        />
                      } 
                    />
                    <Pie
                      data={setoresPizzaData}
                      dataKey="value"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ nome, percentage }) => `${nome}: ${percentage}%`}
                      labelLine={true}
                    >
                      {setoresPizzaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="nome" />} />
                  </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pendentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Gráfico de Pendentes</CardTitle>
              <ChartExportButtons chartRef={chartPendentesRef} chartName="Gráfico de Pendentes" />
            </CardHeader>
            <CardContent>
              <div ref={chartPendentesRef}>
                <ChartContainer config={chartConfigPendente} className="h-[300px] w-full">
                  <BarChart data={pendentePorUsuario} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pendente" fill="var(--color-pendente)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Feito */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Gráfico de Feito</CardTitle>
              <ChartExportButtons chartRef={chartFeitoRef} chartName="Gráfico de Feito" />
            </CardHeader>
            <CardContent>
              <div ref={chartFeitoRef}>
                <ChartContainer config={chartConfigFeito} className="h-[300px] w-full">
                  <BarChart data={feitoPorUsuario} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="feito" fill="var(--color-feito)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Aprovado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Gráfico de Aprovado</CardTitle>
              <ChartExportButtons chartRef={chartAprovadoRef} chartName="Gráfico de Aprovado" />
            </CardHeader>
            <CardContent>
              <div ref={chartAprovadoRef}>
                <ChartContainer config={chartConfigAprovado} className="h-[300px] w-full">
                  <BarChart data={aprovadoPorUsuario} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="aprovado" fill="var(--color-aprovado)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Não Realizado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Gráfico de Não Realizado</CardTitle>
              <ChartExportButtons chartRef={chartNaoRealizadoRef} chartName="Gráfico de Não Realizado" />
            </CardHeader>
            <CardContent>
              <div ref={chartNaoRealizadoRef}>
                <ChartContainer config={chartConfigNaoRealizado} className="h-[300px] w-full">
                  <BarChart data={naoRealizadoPorUsuario} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="nao_realizado" fill="var(--color-nao_realizado)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

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
