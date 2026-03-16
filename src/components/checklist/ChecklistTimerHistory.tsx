import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Clock, TrendingUp, TrendingDown, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const WEEK_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(30, 80%, 50%)",
  "hsl(340, 65%, 50%)",
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}min`;
}

function toMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

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

export default function ChecklistTimerHistory() {
  const [timers, setTimers] = useState<TimerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchAll = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("checklist_timers")
        .select("*")
        .not("stopped_at", "is", null)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
        .order("semana", { ascending: true });
      setTimers((data as TimerRecord[]) || []);
      setIsLoading(false);
    };
    fetchAll();
  }, [open]);

  // Stats
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

  // Monthly bar chart data (total duration per month)
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

  // Weekly grouped bar chart data (avg duration per week across all months)
  const weeklyChartData = useMemo(() => {
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
      total: weekTotals[sem] ? toMinutes(weekTotals[sem].sum) : 0,
      count: weekTotals[sem]?.count || 0,
      avgFormatted: weekTotals[sem] ? formatDurationShort(Math.round(weekTotals[sem].sum / weekTotals[sem].count)) : "—",
    }));
  }, [timers]);

  // Monthly evolution line chart (per-week lines over months)
  const evolutionChartData = useMemo(() => {
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

  // Grouped table data
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, { label: string; timers: TimerRecord[]; totalSeconds: number }> = {};
    timers.forEach((t) => {
      const key = `${t.ano}-${String(t.mes).padStart(2, "0")}`;
      if (!groups[key]) {
        groups[key] = { label: `${MONTH_NAMES[t.mes - 1]} ${t.ano}`, timers: [], totalSeconds: 0 };
      }
      groups[key].timers.push(t);
      groups[key].totalSeconds += t.duration_seconds || 0;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({ key, ...val }));
  }, [timers]);

  const kpiCards = [
    { label: "Total de Reuniões", value: String(stats.count), icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Tempo Médio", value: stats.avg > 0 ? formatDurationShort(stats.avg) : "—", icon: Clock, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
    { label: "Mais Rápida", value: stats.min > 0 ? formatDurationShort(stats.min) : "—", icon: TrendingDown, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
    { label: "Mais Longa", value: stats.max > 0 ? formatDurationShort(stats.max) : "—", icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" },
  ];

  const hasData = timers.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Histórico</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Reuniões
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-80px)]">
          <div className="space-y-5">
            {/* KPI Dashboard */}
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

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : !hasData ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Clock className="h-8 w-8 opacity-40" />
                <p className="text-sm">Nenhuma reunião registrada ainda.</p>
              </div>
            ) : (
              <Tabs defaultValue="charts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="charts" className="text-xs">Gráficos</TabsTrigger>
                  <TabsTrigger value="table" className="text-xs">Tabela</TabsTrigger>
                </TabsList>

                {/* Charts Tab */}
                <TabsContent value="charts" className="space-y-4 mt-4">
                  {/* Monthly Total Duration Bar Chart */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Duração Total por Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                      <ChartContainer config={monthlyChartConfig} className="h-[200px] w-full">
                        <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" unit="min" width={45} />
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
                          <Bar dataKey="duration" radius={[4, 4, 0, 0]} barSize={monthlyChartData.length <= 2 ? 60 : undefined}>
                            {monthlyChartData.map((_, i) => (
                              <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Weekly Average Bar Chart */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Média de Duração por Semana
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                      <ChartContainer config={weeklyChartConfig} className="h-[200px] w-full">
                        <BarChart data={weeklyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" unit="min" width={45} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, name, item) => (
                                  <span className="font-medium">
                                    Média: {item.payload.avgFormatted} ({item.payload.count} reuniões)
                                  </span>
                                )}
                              />
                            }
                          />
                          <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={60}>
                            {weeklyChartData.map((entry, i) => (
                              <Cell key={i} fill={WEEK_COLORS[entry.semana - 1]} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Evolution Line Chart (per week over months) */}
                  {evolutionChartData.length > 1 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          Evolução por Semana ao Longo dos Meses
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-3">
                        <ChartContainer config={weeklyChartConfig} className="h-[220px] w-full">
                          <LineChart data={evolutionChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" unit="min" width={45} />
                            <ChartTooltip content={<ChartTooltipContent />} />
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
                </TabsContent>

                {/* Table Tab */}
                <TabsContent value="table" className="space-y-4 mt-4">
                  {groupedByMonth.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">{group.label}</h3>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          Total: {formatDurationShort(group.totalSeconds)}
                        </Badge>
                      </div>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs h-8 w-[80px]">Semana</TableHead>
                              <TableHead className="text-xs h-8">Data</TableHead>
                              <TableHead className="text-xs h-8">Início</TableHead>
                              <TableHead className="text-xs h-8">Fim</TableHead>
                              <TableHead className="text-xs h-8 text-right">Duração</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.timers.map((timer, idx) => (
                              <TableRow key={timer.id} className={idx % 2 === 0 ? "" : "bg-muted/30"}>
                                <TableCell className="text-xs py-2">
                                  <Badge variant="outline" className="text-[10px] font-medium">
                                    {timer.semana}ª
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground">
                                  {formatDate(timer.started_at)}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground">
                                  {formatTime(timer.started_at)}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground">
                                  {timer.stopped_at ? formatTime(timer.stopped_at) : "—"}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-right font-mono font-medium">
                                  {timer.duration_seconds ? formatDuration(timer.duration_seconds) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
