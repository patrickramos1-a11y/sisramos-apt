import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { cn } from "@/lib/utils";

interface GestorStatusDonutChartProps {
  data: {
    aprovado: number;
    pendente: number;
    rejeitado: number;
  };
  onStatusClick?: (status: string) => void;
  activeStatus?: string | null;
}

const COLORS = {
  aprovado: "hsl(221 83% 53%)",
  pendente: "hsl(38 92% 50%)",
  rejeitado: "hsl(0 84% 60%)",
};

const LABELS = {
  aprovado: "Aprovado",
  pendente: "Pendente",
  rejeitado: "Não Aprovado",
};

export default function GestorStatusDonutChart({
  data,
  onStatusClick,
  activeStatus,
}: GestorStatusDonutChartProps) {
  const chartData = useMemo(() => {
    return [
      { name: "aprovado", value: data.aprovado, label: LABELS.aprovado, color: COLORS.aprovado },
      { name: "pendente", value: data.pendente, label: LABELS.pendente, color: COLORS.pendente },
      { name: "rejeitado", value: data.rejeitado, label: LABELS.rejeitado, color: COLORS.rejeitado },
    ].filter((d) => d.value > 0);
  }, [data]);

  const total = data.aprovado + data.pendente + data.rejeitado;
  const percentAprovado = total > 0 ? Math.round((data.aprovado / total) * 100) : 0;

  const chartConfig = {
    aprovado: { label: "Aprovado", color: COLORS.aprovado },
    pendente: { label: "Pendente", color: COLORS.pendente },
    rejeitado: { label: "Não Aprovado", color: COLORS.rejeitado },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Status Gestor/Admin</CardTitle>
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
                            {percentAprovado}%
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 12} className="fill-muted-foreground text-xs">
                            aprovado
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
