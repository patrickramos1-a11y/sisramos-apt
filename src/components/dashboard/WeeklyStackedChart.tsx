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
  semana_limite: number[];
  status_responsavel: string;
  status_gestor: string;
}

interface WeeklyStackedChartProps {
  demandas: Demanda[];
  onWeekClick?: (week: number) => void;
  onBarClick?: (week: number, status: string) => void;
  activeWeek?: number | null;
}

const chartConfig = {
  feito: { label: "Feito", color: "hsl(142 76% 36%)" },
  aprovado: { label: "Aprovado", color: "hsl(221 83% 53%)" },
  pendente: { label: "Pendente", color: "hsl(38 92% 50%)" },
  nao_realizado: { label: "Não Realizado", color: "hsl(0 84% 60%)" },
};

export default function WeeklyStackedChart({
  demandas,
  onWeekClick,
  onBarClick,
  activeWeek,
}: WeeklyStackedChartProps) {
  const chartData = useMemo(() => {
    const weeks = [1, 2, 3, 4, 5].map((week) => {
      const weekDemandas = demandas.filter((d) =>
        d.semana_limite?.includes(week)
      );

      return {
        semana: `${week}ª`,
        weekNumber: week,
        feito: weekDemandas.filter((d) => d.status_responsavel === "executado").length,
        aprovado: weekDemandas.filter((d) => d.status_gestor === "executado").length,
        pendente: weekDemandas.filter((d) => d.status_responsavel === "pendente").length,
        nao_realizado: weekDemandas.filter((d) => d.status_responsavel === "nao_realizado").length,
      };
    });

    return weeks;
  }, [demandas]);

  const handleBarClick = (data: any, dataKey: string) => {
    if (onBarClick && data?.weekNumber) {
      onBarClick(data.weekNumber, dataKey);
    } else if (onWeekClick && data?.weekNumber) {
      onWeekClick(data.weekNumber);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Execução por Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="semana"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="feito"
                stackId="a"
                fill="var(--color-feito)"
                radius={[0, 0, 0, 0]}
                cursor={onBarClick || onWeekClick ? "pointer" : "default"}
                onClick={(data) => handleBarClick(data, "feito")}
                opacity={activeWeek !== null && activeWeek !== undefined ? 0.5 : 1}
              />
              <Bar
                dataKey="aprovado"
                stackId="a"
                fill="var(--color-aprovado)"
                cursor={onBarClick || onWeekClick ? "pointer" : "default"}
                onClick={(data) => handleBarClick(data, "aprovado")}
                opacity={activeWeek !== null && activeWeek !== undefined ? 0.5 : 1}
              />
              <Bar
                dataKey="pendente"
                stackId="a"
                fill="var(--color-pendente)"
                cursor={onBarClick || onWeekClick ? "pointer" : "default"}
                onClick={(data) => handleBarClick(data, "pendente")}
                opacity={activeWeek !== null && activeWeek !== undefined ? 0.5 : 1}
              />
              <Bar
                dataKey="nao_realizado"
                stackId="a"
                fill="var(--color-nao_realizado)"
                radius={[4, 4, 0, 0]}
                cursor={onBarClick || onWeekClick ? "pointer" : "default"}
                onClick={(data) => handleBarClick(data, "nao_realizado")}
                opacity={activeWeek !== null && activeWeek !== undefined ? 0.5 : 1}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
