import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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

interface BottleneckChartProps {
  demandas: Demanda[];
  profiles: Profile[];
  onResponsavelClick?: (responsavelId: string) => void;
  activeResponsavel?: string | null;
}

const chartConfig = {
  pendencias: { label: "Pendências", color: "hsl(45 93% 47%)" },
};

export default function BottleneckChart({
  demandas,
  profiles,
  onResponsavelClick,
  activeResponsavel,
}: BottleneckChartProps) {
  const chartData = useMemo(() => {
    const responsavelData: Record<string, { pendencias: number; userId: string }> = {};

    demandas.forEach((d) => {
      if (d.status_responsavel === "pendente" || d.status_responsavel === "nao_realizado") {
        if (!responsavelData[d.responsavel_id]) {
          responsavelData[d.responsavel_id] = { pendencias: 0, userId: d.responsavel_id };
        }
        responsavelData[d.responsavel_id].pendencias++;
      }
    });

    return Object.entries(responsavelData)
      .map(([userId, data]) => {
        const profile = profiles.find((p) => p.user_id === userId);
        return {
          nome: profile?.nome || "Desconhecido",
          userId,
          pendencias: data.pendencias,
        };
      })
      .filter((d) => d.pendencias > 0)
      .sort((a, b) => b.pendencias - a.pendencias)
      .slice(0, 10); // Top 10
  }, [demandas, profiles]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Número de Pendências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma pendência encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Número de Pendências</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 80, right: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 11 }}
                tickLine={false}
                width={70}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="pendencias"
                fill="var(--color-pendencias)"
                radius={[0, 4, 4, 0]}
                cursor={onResponsavelClick ? "pointer" : "default"}
                onClick={(data) => onResponsavelClick?.(data.userId)}
                opacity={activeResponsavel && activeResponsavel !== chartData.find(d => d.nome === activeResponsavel)?.userId ? 0.4 : 1}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
