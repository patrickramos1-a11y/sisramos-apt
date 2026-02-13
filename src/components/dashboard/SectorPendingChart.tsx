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
  setor_id: string | null;
  status_responsavel: string;
}

interface Setor {
  id: string;
  nome: string;
  cor?: string;
}

interface SectorPendingChartProps {
  demandas: Demanda[];
  setores: Setor[];
  onSetorClick?: (setorId: string) => void;
}

const chartConfig = {
  pendencias: { label: "Pendências", color: "hsl(38 92% 50%)" },
};

export default function SectorPendingChart({
  demandas,
  setores,
  onSetorClick,
}: SectorPendingChartProps) {
  const chartData = useMemo(() => {
    const setorData: Record<string, number> = {};

    demandas.forEach((d) => {
      if (d.status_responsavel === "pendente" || d.status_responsavel === "nao_realizado") {
        const setorId = d.setor_id || "sem_setor";
        setorData[setorId] = (setorData[setorId] || 0) + 1;
      }
    });

    return Object.entries(setorData)
      .map(([setorId, count]) => {
        const setor = setores.find((s) => s.id === setorId);
        return {
          setorId,
          nome: setor?.nome || "Sem Setor",
          pendencias: count,
        };
      })
      .filter((d) => d.pendencias > 0)
      .sort((a, b) => b.pendencias - a.pendencias);
  }, [demandas, setores]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Pendências por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Nenhuma pendência por setor
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(250, chartData.length * 40);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Pendências por Setor</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
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
                cursor={onSetorClick ? "pointer" : "default"}
                onClick={(data) => onSetorClick?.(data.setorId)}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
