import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBacklogStats, useBacklogItems, STATUS_LABELS, BacklogStatus } from "@/hooks/useBacklog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Lightbulb, 
  Search, 
  CheckCircle2, 
  Clock, 
  Code, 
  TestTube, 
  PackageCheck, 
  Rocket, 
  BadgeCheck, 
  Archive,
  AlertCircle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const STATUS_COLORS: Record<BacklogStatus, string> = {
  ideia: "#9CA3AF",
  em_analise: "#60A5FA",
  refinado: "#34D399",
  aguardando_recursos: "#FBBF24",
  em_implementacao: "#A78BFA",
  em_testes: "#F472B6",
  implementado: "#2DD4BF",
  lancado: "#22C55E",
  validado: "#10B981",
  arquivado: "#6B7280"
};

const STATUS_ICONS: Record<BacklogStatus, React.ReactNode> = {
  ideia: <Lightbulb className="h-4 w-4" />,
  em_analise: <Search className="h-4 w-4" />,
  refinado: <CheckCircle2 className="h-4 w-4" />,
  aguardando_recursos: <Clock className="h-4 w-4" />,
  em_implementacao: <Code className="h-4 w-4" />,
  em_testes: <TestTube className="h-4 w-4" />,
  implementado: <PackageCheck className="h-4 w-4" />,
  lancado: <Rocket className="h-4 w-4" />,
  validado: <BadgeCheck className="h-4 w-4" />,
  arquivado: <Archive className="h-4 w-4" />
};

export default function BacklogPainel() {
  const { data: stats, isLoading: isLoadingStats } = useBacklogStats();
  const { data: recentItems, isLoading: isLoadingItems } = useBacklogItems();

  if (isLoadingStats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const summaryCards = [
    { label: "Total de Itens", value: stats?.total || 0, icon: <Lightbulb className="h-5 w-5" />, color: "text-blue-500" },
    { label: "Aguardando Recursos", value: stats?.aguardando_recursos || 0, icon: <Clock className="h-5 w-5" />, color: "text-yellow-500" },
    { label: "Em Implementação", value: stats?.em_implementacao || 0, icon: <Code className="h-5 w-5" />, color: "text-purple-500" },
    { label: "Implementados", value: stats?.implementados || 0, icon: <PackageCheck className="h-5 w-5" />, color: "text-cyan-500" },
    { label: "Lançados", value: stats?.lancados || 0, icon: <Rocket className="h-5 w-5" />, color: "text-green-500" },
    { label: "Validados", value: stats?.validados || 0, icon: <BadgeCheck className="h-5 w-5" />, color: "text-emerald-500" },
  ];

  const pieData = stats?.por_status
    ? Object.entries(stats.por_status)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: STATUS_LABELS[status as BacklogStatus],
          value: count,
          color: STATUS_COLORS[status as BacklogStatus]
        }))
    : [];

  const barData = stats?.por_status
    ? Object.entries(stats.por_status)
        .map(([status, count]) => ({
          status: STATUS_LABELS[status as BacklogStatus].split(" ")[0],
          quantidade: count,
          fill: STATUS_COLORS[status as BacklogStatus]
        }))
    : [];

  const urgentItems = recentItems?.filter(item => 
    item.prioridade === "alta" && 
    !["validado", "arquivado"].includes(item.status)
  ).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={card.color}>{card.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dependentes de Créditos Alert */}
      {stats && stats.dependentes_creditos > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              Itens Dependentes de Créditos/Recursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.dependentes_creditos} {stats.dependentes_creditos === 1 ? "item" : "itens"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantidade por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.some(d => d.quantidade > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Urgent Items */}
      {urgentItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Itens de Alta Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentItems.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">#{item.numero}</span>
                    <span className="font-medium">{item.titulo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: `${STATUS_COLORS[item.status]}20`,
                        color: STATUS_COLORS[item.status]
                      }}
                    >
                      {STATUS_ICONS[item.status]}
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
