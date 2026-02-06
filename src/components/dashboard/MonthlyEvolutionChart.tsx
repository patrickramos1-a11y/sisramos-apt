import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface MonthlyData {
  mes: number;
  ano: number;
  total: number;
  concluidas: number;
}

interface MonthlyEvolutionChartProps {
  data: MonthlyData[];
}

const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const chartConfig = {
  percentual: { label: "% Conclusão", color: "hsl(var(--primary))" },
};

export default function MonthlyEvolutionChart({ data }: MonthlyEvolutionChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano;
        return a.mes - b.mes;
      })
      .map((d) => ({
        label: `${mesesAbrev[d.mes - 1]}/${String(d.ano).slice(2)}`,
        percentual: d.total > 0 ? Math.round((d.concluidas / d.total) * 100) : 0,
        total: d.total,
        concluidas: d.concluidas,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Evolução Mensal de Conclusão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Sem dados históricos disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Evolução Mensal de Conclusão</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 10, right: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
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
              <Line
                type="monotone"
                dataKey="percentual"
                stroke="var(--color-percentual)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-percentual)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
