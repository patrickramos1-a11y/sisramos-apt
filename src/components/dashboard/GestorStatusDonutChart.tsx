import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
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

  const chartConfig = {
    aprovado: { label: "Aprovado", color: COLORS.aprovado },
    pendente: { label: "Pendente", color: COLORS.pendente },
    rejeitado: { label: "Não Aprovado", color: COLORS.rejeitado },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Status Gestor/Admin</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
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

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {chartData.map((entry) => (
            <button
              key={entry.name}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all",
                onStatusClick && "hover:bg-muted cursor-pointer",
                activeStatus === entry.name && "bg-muted ring-1 ring-primary"
              )}
              onClick={() => onStatusClick?.(entry.name)}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.label}</span>
              <span className="text-muted-foreground">({entry.value})</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
