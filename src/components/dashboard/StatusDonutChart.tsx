import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { cn } from "@/lib/utils";

interface StatusDonutChartProps {
  data: {
    feito: number;
    pendente: number;
    naoRealizado: number;
  };
  onStatusClick?: (status: string) => void;
  activeStatus?: string | null;
}

const COLORS = {
  feito: "hsl(142 76% 36%)",
  pendente: "hsl(38 92% 50%)",
  naoRealizado: "hsl(0 84% 60%)",
};

const LABELS = {
  feito: "Feito",
  pendente: "Pendente",
  naoRealizado: "Não Realizado",
};

export default function StatusDonutChart({
  data,
  onStatusClick,
  activeStatus,
}: StatusDonutChartProps) {
  const chartData = useMemo(() => {
    return [
      { name: "feito", value: data.feito, label: LABELS.feito, color: COLORS.feito },
      { name: "pendente", value: data.pendente, label: LABELS.pendente, color: COLORS.pendente },
      { name: "naoRealizado", value: data.naoRealizado, label: LABELS.naoRealizado, color: COLORS.naoRealizado },
    ].filter((d) => d.value > 0);
  }, [data]);

  const total = data.feito + data.pendente + data.naoRealizado;
  const percentFeito = total > 0 ? Math.round((data.feito / total) * 100) : 0;

  const chartConfig = {
    feito: { label: "Feito", color: COLORS.feito },
    pendente: { label: "Pendente", color: COLORS.pendente },
    naoRealizado: { label: "Não Realizado", color: COLORS.naoRealizado },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Status Colaborador</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                onClick={(entry) => onStatusClick?.(entry.name)}
                style={{ cursor: onStatusClick ? "pointer" : "default" }}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={activeStatus && activeStatus !== entry.name ? 0.3 : 1}
                    stroke={activeStatus === entry.name ? "hsl(var(--primary))" : "transparent"}
                    strokeWidth={activeStatus === entry.name ? 3 : 0}
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} className="fill-foreground text-2xl font-bold">
                            {percentFeito}%
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 12} className="fill-muted-foreground text-xs">
                            concluído
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
                      LABELS[name as keyof typeof LABELS] || name,
                    ]}
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {chartData.map((entry) => (
            <button
              key={entry.name}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all",
                onStatusClick && "hover:bg-accent cursor-pointer",
                activeStatus === entry.name && "bg-accent ring-1 ring-primary"
              )}
              onClick={() => onStatusClick?.(entry.name)}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.label}</span>
              <span className="text-muted-foreground">({entry.value})</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
