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
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { demandas, profiles, setores, isLoading, getProfileById, getSetorById } = useDemandas();

  // Dados: Setores por usuário
  const setoresPorUsuario = useMemo(() => {
    const userSetores: Record<string, Set<string>> = {};
    
    demandas.forEach((demanda) => {
      const profile = getProfileById(demanda.responsavel_id);
      const userName = profile?.nome || "Desconhecido";
      const setor = getSetorById(demanda.setor_id);
      const setorName = setor?.nome || "Sem setor";
      
      if (!userSetores[userName]) {
        userSetores[userName] = new Set();
      }
      userSetores[userName].add(setorName);
    });

    return Object.entries(userSetores).map(([nome, setoresSet]) => ({
      nome,
      setores: setoresSet.size,
    })).sort((a, b) => b.setores - a.setores);
  }, [demandas, getProfileById, getSetorById]);

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

  const chartConfigSetores = {
    setores: {
      label: "Setores",
      color: "hsl(var(--primary))",
    },
  };

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
          {/* Setores por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Setores por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigSetores} className="h-[300px] w-full">
                <BarChart data={setoresPorUsuario} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="setores" fill="var(--color-setores)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Feito por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feito por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigFeito} className="h-[300px] w-full">
                <BarChart data={feitoPorUsuario} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
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
