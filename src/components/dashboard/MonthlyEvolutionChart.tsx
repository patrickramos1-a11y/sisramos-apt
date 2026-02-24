import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3 } from "lucide-react";

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

type PeriodFilter = "3m" | "6m" | "12m" | "ano";

const chartConfig = {
  percentual: { label: "% Conclusão", color: "hsl(var(--primary))" },
};

export default function MonthlyEvolutionChart({ data }: MonthlyEvolutionChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>("12m");

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });
  }, [data]);

  // Get available years for "ano" view
  const availableYears = useMemo(() => {
    const years = [...new Set(sortedData.map((d) => d.ano))].sort();
    return years;
  }, [sortedData]);

  const chartData = useMemo(() => {
    if (period === "ano") {
      // Group by year
      const yearData: Record<number, { total: number; concluidas: number }> = {};
      sortedData.forEach((d) => {
        if (!yearData[d.ano]) yearData[d.ano] = { total: 0, concluidas: 0 };
        yearData[d.ano].total += d.total;
        yearData[d.ano].concluidas += d.concluidas;
      });
      return Object.entries(yearData)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([ano, d]) => ({
          label: ano,
          percentual: d.total > 0 ? Math.round((d.concluidas / d.total) * 100) : 0,
          total: d.total,
          concluidas: d.concluidas,
        }));
    }

    // Monthly view with period slicing
    const sliceCount = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    const sliced = sortedData.slice(-sliceCount);

    return sliced.map((d) => ({
      label: `${mesesAbrev[d.mes - 1]}/${String(d.ano).slice(2)}`,
      percentual: d.total > 0 ? Math.round((d.concluidas / d.total) * 100) : 0,
      total: d.total,
      concluidas: d.concluidas,
    }));
  }, [sortedData, period]);

  if (sortedData.length === 0) {
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

  const periodButtons: { value: PeriodFilter; label: string }[] = [
    { value: "3m", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "12m", label: "12M" },
    { value: "ano", label: "Ano" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Evolução {period === "ano" ? "Anual" : "Mensal"} de Conclusão</CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {periodButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={period === btn.value ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setPeriod(btn.value)}
              >
                {btn.value === "ano" && <BarChart3 className="h-3 w-3 mr-1" />}
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {period === "ano" ? (
              <BarChart data={chartData} margin={{ left: 10, right: 10, bottom: 10 }} barSize={chartData.length <= 2 ? 60 : undefined}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
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
                <Bar dataKey="percentual" fill="var(--color-percentual)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ left: 10, right: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
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
                  type="linear"
                  dataKey="percentual"
                  stroke="var(--color-percentual)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--color-percentual)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
