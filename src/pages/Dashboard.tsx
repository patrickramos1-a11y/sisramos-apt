import { useMemo } from "react";
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
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { demandas, profiles, setores, isLoading, getProfileById, getSetorById } = useDemandas();

  // Dados: Setores por usuário (X = usuários, Y = setores)
  const { setoresPorUsuarioData, setoresPorUsuarioConfig } = useMemo(() => {
    // Cria uma estrutura: { usuario: { setor1: count, setor2: count, ... } }
    const userSetorCounts: Record<string, Record<string, number>> = {};
    const allSetorNames = new Set<string>();
    
    demandas.forEach((demanda) => {
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
  }, [demandas, getProfileById, getSetorById, setores]);

  // Lista de setores para renderizar as barras
  const setorNames = useMemo(() => {
    return Object.keys(setoresPorUsuarioConfig);
  }, [setoresPorUsuarioConfig]);

  // Dados: Pizza de porcentagem de setores
  const { setoresPizzaData, setoresPizzaConfig } = useMemo(() => {
    const setorCounts: Record<string, number> = {};
    
    demandas.forEach((demanda) => {
      const setor = getSetorById(demanda.setor_id);
      const setorName = setor?.nome || "Sem setor";
      setorCounts[setorName] = (setorCounts[setorName] || 0) + 1;
    });

    const total = demandas.length;
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
  }, [demandas, getSetorById, setores]);

  // Dados: Feito por usuário (status_responsavel = executado)
  const feitoPorUsuario = useMemo(() => {
    const userFeito: Record<string, { feito: number; total: number }> = {};
    
    demandas.forEach((demanda) => {
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
  }, [demandas, getProfileById]);

  // Dados: Aprovado por usuário (status_gestor = executado)
  const aprovadoPorUsuario = useMemo(() => {
    const userAprovado: Record<string, { aprovado: number; total: number }> = {};
    
    demandas.forEach((demanda) => {
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
  }, [demandas, getProfileById]);

  // Dados: Comparativo Feito vs Aprovado
  const comparativoFeitoAprovado = useMemo(() => {
    const userData: Record<string, { feito: number; aprovado: number }> = {};
    
    demandas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      
      if (!userData[userName]) {
        userData[userName] = { feito: 0, aprovado: 0 };
      }
      if (demanda.status_responsavel === "executado") {
        userData[userName].feito++;
      }
      if (demanda.status_gestor === "executado") {
        userData[userName].aprovado++;
      }
    });

    return Object.entries(userData).map(([nome, data]) => ({
      nome,
      feito: data.feito,
      aprovado: data.aprovado,
    })).sort((a, b) => (b.feito + b.aprovado) - (a.feito + a.aprovado));
  }, [demandas, getProfileById]);


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

  const chartConfigComparativo = {
    feito: {
      label: "Feito",
      color: "hsl(142 76% 36%)",
    },
    aprovado: {
      label: "Aprovado",
      color: "hsl(221 83% 53%)",
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
        <h1 className="text-2xl font-bold">Dashboards</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Setores - Barras */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gráfico de Setores</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Porcentagem de Setores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Setor</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Gráfico de Feito */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gráfico de Feito</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigFeito} className="h-[300px] w-full">
                <BarChart data={feitoPorUsuario} margin={{ left: 20, right: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="feito" fill="var(--color-feito)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Aprovado por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aprovado por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigAprovado} className="h-[300px] w-full">
                <BarChart data={aprovadoPorUsuario} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="aprovado" fill="var(--color-aprovado)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Comparativo Feito vs Aprovado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparativo: Feito vs Aprovado</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigComparativo} className="h-[300px] w-full">
                <BarChart data={comparativoFeitoAprovado} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="feito" fill="var(--color-feito)" radius={4} />
                  <Bar dataKey="aprovado" fill="var(--color-aprovado)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
