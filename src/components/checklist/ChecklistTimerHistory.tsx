import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Clock, TrendingUp, TrendingDown, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

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

  const stats = useMemo(() => {
    const completed = timers.filter((t) => t.duration_seconds);
    if (completed.length === 0) {
      return { total: 0, avg: 0, min: 0, max: 0, count: 0 };
    }

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

  // Group by month for the table
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, { label: string; timers: TimerRecord[]; totalSeconds: number }> = {};

    timers.forEach((t) => {
      const key = `${t.ano}-${String(t.mes).padStart(2, "0")}`;
      if (!groups[key]) {
        groups[key] = {
          label: `${MONTH_NAMES[t.mes - 1]} ${t.ano}`,
          timers: [],
          totalSeconds: 0,
        };
      }
      groups[key].timers.push(t);
      groups[key].totalSeconds += t.duration_seconds || 0;
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({ key, ...val }));
  }, [timers]);

  const kpiCards = [
    {
      label: "Total de Reuniões",
      value: String(stats.count),
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Tempo Médio",
      value: stats.avg > 0 ? formatDurationShort(stats.avg) : "—",
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Mais Rápida",
      value: stats.min > 0 ? formatDurationShort(stats.min) : "—",
      icon: TrendingDown,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Mais Longa",
      value: stats.max > 0 ? formatDurationShort(stats.max) : "—",
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Histórico</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Reuniões
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(85vh-80px)]">
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

            {/* Grouped tables */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : groupedByMonth.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Clock className="h-8 w-8 opacity-40" />
                <p className="text-sm">Nenhuma reunião registrada ainda.</p>
              </div>
            ) : (
              groupedByMonth.map((group) => (
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
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
