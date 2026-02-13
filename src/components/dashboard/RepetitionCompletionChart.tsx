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
  semanas_repeticao: number;
  status_responsavel: string;
}

interface RepetitionCompletionChartProps {
  demandas: Demanda[];
}

const chartConfig = {
  percentual: { label: "% Conclusão", color: "hsl(142 76% 36%)" },
};

export default function RepetitionCompletionChart({ demandas }: RepetitionCompletionChartProps) {
  const chartData = useMemo(() => {
    const repetitionData: Record<number, { total: number; concluidas: number }> = {
      1: { total: 0, concluidas: 0 },
      2: { total: 0, concluidas: 0 },
      3: { total: 0, concluidas: 0 },
      4: { total: 0, concluidas: 0 },
      5: { total: 0, concluidas: 0 },
    };

    demandas.forEach((d) => {
      const rep = d.semanas_repeticao || 1;
      if (rep >= 1 && rep <= 5) {
        repetitionData[rep].total++;
        if (d.status_responsavel === "executado") {
          repetitionData[rep].concluidas++;
        }
      }
    });

    return Object.entries(repetitionData).map(([rep, data]) => ({
      repeticao: `${rep}X`,
      repNumber: Number(rep),
      percentual: data.total > 0 ? Math.round((data.concluidas / data.total) * 100) : 0,
      total: data.total,
      concluidas: data.concluidas,
    }));
  }, [demandas]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Repetições x Conclusão</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="repeticao"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => [
                      `${value}% (${item.payload.concluidas}/${item.payload.total})`,
                      "Conclusão",
                    ]}
                  />
                }
              />
              <Bar
                dataKey="percentual"
                fill="var(--color-percentual)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
