import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface Demanda {
  id: string;
  responsavel_id: string;
  status_responsavel: string;
}

interface Profile {
  user_id: string;
  nome: string;
}

interface WeeklyUserChartProps {
  demandas: Demanda[];
  profiles: Profile[];
  currentWeek?: number;
}

const chartConfig = {
  feito: { label: "Feito", color: "hsl(142 76% 36%)" },
  pendente: { label: "Pendente", color: "hsl(38 92% 50%)" },
  nao_realizado: { label: "Não Realizado", color: "hsl(0 84% 60%)" },
};

export default function WeeklyUserChart({
  demandas,
  profiles,
}: WeeklyUserChartProps) {
  const chartData = useMemo(() => {
    const userData: Record<string, { feito: number; pendente: number; nao_realizado: number; userId: string }> = {};

    demandas.forEach((d) => {
      if (!userData[d.responsavel_id]) {
        userData[d.responsavel_id] = { feito: 0, pendente: 0, nao_realizado: 0, userId: d.responsavel_id };
      }
      
      if (d.status_responsavel === "executado") {
        userData[d.responsavel_id].feito++;
      } else if (d.status_responsavel === "pendente") {
        userData[d.responsavel_id].pendente++;
      } else if (d.status_responsavel === "nao_realizado") {
        userData[d.responsavel_id].nao_realizado++;
      }
    });

    return Object.entries(userData)
      .map(([userId, data]) => {
        const profile = profiles.find((p) => p.user_id === userId);
        return {
          nome: profile?.nome || "Desconhecido",
          ...data,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [demandas, profiles]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Situação por Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Situação por Responsável</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 20, right: 20, bottom: 10 }} barSize={chartData.length <= 2 ? 60 : undefined}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 11 }}
                tickLine={false}
                interval={0}
                angle={chartData.length > 3 ? -45 : 0}
                textAnchor={chartData.length > 3 ? "end" : "middle"}
                height={chartData.length > 3 ? 70 : 40}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="feito" stackId="a" fill="var(--color-feito)" />
              <Bar dataKey="pendente" stackId="a" fill="var(--color-pendente)" />
              <Bar dataKey="nao_realizado" stackId="a" fill="var(--color-nao_realizado)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
