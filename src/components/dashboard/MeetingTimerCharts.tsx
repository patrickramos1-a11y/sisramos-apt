import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Clock, TrendingUp, TrendingDown, BarChart3, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerRecord {
  id: string;
  mes: number;
  ano: number;
  semana: number;
  started_at: string;
  stopped_at: string | null;
  duration_seconds: number | null;
}

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const WEEK_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(30, 80%, 50%)",
  "hsl(340, 65%, 50%)",
];

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}min`;
}

function toMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

const weeklyAvgChartConfig: ChartConfig = {
  avg: { label: "Média (min)", color: "hsl(var(--primary))" },
};

const monthlyChartConfig: ChartConfig = {
  duration: { label: "Duração (min)", color: "hsl(var(--primary))" },
};

const weeklyChartConfig: ChartConfig = {
  sem1: { label: "Semana 1", color: WEEK_COLORS[0] },
  sem2: { label: "Semana 2", color: WEEK_COLORS[1] },
  sem3: { label: "Semana 3", color: WEEK_COLORS[2] },
  sem4: { label: "Semana 4", color: WEEK_COLORS[3] },
  sem5: { label: "Semana 5", color: WEEK_COLORS[4] },
};

const evolutionChartConfig: ChartConfig = {
  total: { label: "Tempo Total (min)", color: "hsl(var(--primary))" },
};

export default function MeetingTimerCharts() {
  const [timers, setTimers] = useState<TimerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimers = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("checklist_timers")
        .select("*")
        .not("stopped_at", "is", null)
        .order("ano", { ascending: true })
        .order("mes", { ascending: true })
        .order("semana", { ascending: true });
      setTimers((data as TimerRecord[]) || []);
      setIsLoading(false);
    };
    fetchTimers();
  }, []);

  // KPI Stats
  const stats = useMemo(() => {
    const completed = timers.filter((t) => t.duration_seconds);
    if (completed.length === 0) return { total: 0, avg: 0, min: 0, max: 0, count: 0 };
    const durations = completed.map((t) => t.duration_seconds!);
    const total = durations.reduce((a, b) => a + b, 0);
    return {
      total,
      avg: Math.round(total / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: durations.length,
    };
  }, [timers]);

  // Monthly bar chart data
  const monthlyChartData = useMemo(() => {
    const map: Record<string, { label: string; totalSec: number; count: number; sortKey: string }> = {};
    timers.forEach((t) => {
      const key = `${t.ano}-${String(t.mes).padStart(2, "0")}`;
      if (!map[key]) {
        map[key] = { label: `${MONTH_SHORT[t.mes - 1]}/${t.ano}`, totalSec: 0, count: 0, sortKey: key };
      }
      map[key].totalSec += t.duration_seconds || 0;
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => ({
        name: m.label,
        duration: toMinutes(m.totalSec),
        count: m.count,
        totalFormatted: formatDurationShort(m.totalSec),
      }));
  }, [timers]);

  // Weekly average bar chart data
  const weeklyAvgData = useMemo(() => {
    const weekTotals: Record<number, { sum: number; count: number }> = {};
    timers.forEach((t) => {
      if (!t.duration_seconds) return;
      if (!weekTotals[t.semana]) weekTotals[t.semana] = { sum: 0, count: 0 };
      weekTotals[t.semana].sum += t.duration_seconds;
      weekTotals[t.semana].count += 1;
    });
    return [1, 2, 3, 4, 5].map((sem) => ({
      name: `${sem}ª Sem`,
      semana: sem,
      avg: weekTotals[sem] ? toMinutes(Math.round(weekTotals[sem].sum / weekTotals[sem].count)) : 0,
      count: weekTotals[sem]?.count || 0,
      avgFormatted: weekTotals[sem] ? formatDurationShort(Math.round(weekTotals[sem].sum / weekTotals[sem].count)) : "—",
    }));
  }, [timers]);

  // Weekly comparison line chart (each week as a line across months)
  const weeklyComparisonData = useMemo(() => {
    const monthMap: Record<string, { label: string; sortKey: string; weeks: Record<number, number> }> = {};
    timers.forEach((t) => {
      const key = `${t.ano}-${String(t.mes).padStart(2, "0")}`;
      if (!monthMap[key]) {
        monthMap[key] = { label: `${MONTH_SHORT[t.mes - 1]}/${t.ano}`, sortKey: key, weeks: {} };
      }
      if (t.duration_seconds) {
        monthMap[key].weeks[t.semana] = (monthMap[key].weeks[t.semana] || 0) + t.duration_seconds;
      }
    });
    return Object.values(monthMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => ({
        name: m.label,
        sem1: m.weeks[1] ? toMinutes(m.weeks[1]) : undefined,
        sem2: m.weeks[2] ? toMinutes(m.weeks[2]) : undefined,
        sem3: m.weeks[3] ? toMinutes(m.weeks[3]) : undefined,
        sem4: m.weeks[4] ? toMinutes(m.weeks[4]) : undefined,
        sem5: m.weeks[5] ? toMinutes(m.weeks[5]) : undefined,
      }));
  }, [timers]);

  // Monthly evolution line chart (total per month)
  const monthlyEvolutionData = useMemo(() => {
    const map: Record<string, { label: string; totalSec: number; sortKey: string }> = {};
    timers.forEach((t) => {
      const key = `${t.ano}-${String(t.mes).padStart(2, "0")}`;
      if (!map[key]) {
        map[key] = { label: `${MONTH_SHORT[t.mes - 1]}/${t.ano}`, totalSec: 0, sortKey: key };
      }
      map[key].totalSec += t.duration_seconds || 0;
    });
    return Object.values(map)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => ({
        name: m.label,
        total: toMinutes(m.totalSec),
        totalFormatted: formatDurationShort(m.totalSec),
      }));
  }, [timers]);

  const kpiCards = [
    { label: "Total de Reuniões", value: String(stats.count), icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Tempo Médio", value: stats.avg > 0 ? formatDurationShort(stats.avg) : "—", icon: Clock, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
    { label: "Mais Rápida", value: stats.min > 0 ? formatDurationShort(stats.min) : "—", icon: TrendingDown, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
    { label: "Mais Longa", value: stats.max > 0 ? formatDurationShort(stats.max) : "—", icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (timers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Cronômetro de Reuniões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma reunião registrada ainda.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Cronômetro de Reuniões
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn("p-1.5 rounded-md", kpi.bgColor)}>
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  {kpi.label}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Total Duration Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Duração Total por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyChartConfig} className="h-[280px] w-full">
            <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="min" width={45} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <span className="font-medium">
                        {item.payload.totalFormatted} ({item.payload.count} reuniões)
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="duration" radius={[4, 4, 0, 0]} barSize={monthlyChartData.length <= 3 ? 60 : undefined}>
                {monthlyChartData.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Weekly Comparison Line Chart */}
      {weeklyComparisonData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Comparativo Semanal ao Longo dos Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={weeklyChartConfig} className="h-[300px] w-full">
              <LineChart data={weeklyComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="min" width={45} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {[1, 2, 3, 4, 5].map((sem) => (
                  <Line
                    key={sem}
                    type="linear"
                    dataKey={`sem${sem}`}
                    name={`Semana ${sem}`}
                    stroke={WEEK_COLORS[sem - 1]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: WEEK_COLORS[sem - 1] }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Evolution Line Chart */}
      {monthlyEvolutionData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Evolução Mensal do Tempo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={evolutionChartConfig} className="h-[280px] w-full">
              <LineChart data={monthlyEvolutionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="min" width={45} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <span className="font-medium">{item.payload.totalFormatted}</span>
                      )}
                    />
                  }
                />
                <Line
                  type="linear"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
