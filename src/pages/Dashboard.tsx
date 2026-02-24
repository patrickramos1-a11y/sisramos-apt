import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LayoutDashboard, Users, TrendingUp, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Components
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KPICard from "@/components/dashboard/KPICard";
import StatusDonutChart from "@/components/dashboard/StatusDonutChart";
import GestorStatusDonutChart from "@/components/dashboard/GestorStatusDonutChart";
import WeeklyStackedChart from "@/components/dashboard/WeeklyStackedChart";
import BottleneckChart from "@/components/dashboard/BottleneckChart";
import CriticalDemandsList from "@/components/dashboard/CriticalDemandsList";
import IndividualProgress from "@/components/dashboard/IndividualProgress";
import MonthlyEvolutionChart from "@/components/dashboard/MonthlyEvolutionChart";
import RepetitionCompletionChart from "@/components/dashboard/RepetitionCompletionChart";
import SectorPendingChart from "@/components/dashboard/SectorPendingChart";
import WeeklyUserChart from "@/components/dashboard/WeeklyUserChart";

// Hooks
import { useDashboardFilters, CrossFilter } from "@/hooks/useDashboardFilters";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  status_responsavel: StatusBolinha;
  status_gestor: StatusBolinha;
  semanas_repeticao: number;
  semana_limite: number[];
  prioritaria: boolean;
  muito_urgente: boolean;
  mes: number;
  ano: number;
}

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

interface Setor {
  id: string;
  nome: string;
  cor: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isGestorOrAdmin } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [allDemandas, setAllDemandas] = useState<Demanda[]>([]); // For historical data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("executivo");
  
  const {
    filters,
    crossFilter,
    updateFilter,
    clearFilters,
    applyCrossFilter,
    hasActiveFilters,
  } = useDashboardFilters();

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    // Build query based on filters
    let query = supabase
      .from("demandas")
      .select("*")
      .eq("ativa", true);

    // Colaboradores only see their own
    if (!isGestorOrAdmin) {
      query = query.eq("responsavel_id", user.id);
    }

    // Apply global filters
    if (filters.ano !== "all") {
      query = query.eq("ano", parseInt(filters.ano));
    }
    if (filters.mes !== "all") {
      query = query.eq("mes", parseInt(filters.mes));
    }
    if (filters.responsavel !== "all") {
      query = query.eq("responsavel_id", filters.responsavel);
    }
    if (filters.setor !== "all") {
      query = query.eq("setor_id", filters.setor);
    }
    if (filters.statusFeito !== "all") {
      query = query.eq("status_responsavel", filters.statusFeito as StatusBolinha);
    }
    if (filters.statusAprovado !== "all") {
      query = query.eq("status_gestor", filters.statusAprovado as StatusBolinha);
    }

    const { data: demandasData } = await query;
    
    let filteredData = demandasData || [];
    
    // Client-side filters
    if (filters.semana !== "all") {
      const semanaNum = parseInt(filters.semana);
      filteredData = filteredData.filter((d) => d.semana_limite?.includes(semanaNum));
    }
    if (filters.repeticao !== "all") {
      const repNum = parseInt(filters.repeticao);
      filteredData = filteredData.filter((d) => d.semanas_repeticao === repNum);
    }
    if (filters.urgente) {
      filteredData = filteredData.filter((d) => d.muito_urgente);
    }
    if (filters.prioridade) {
      filteredData = filteredData.filter((d) => d.prioritaria);
    }

    // Apply cross-filter
    if (crossFilter) {
      if (crossFilter.type === "status") {
        const statusMap: Record<string, StatusBolinha> = {
          feito: "executado",
          aprovado: "executado",
          pendente: "pendente",
          naoRealizado: "nao_realizado",
        };
        const status = statusMap[crossFilter.value];
        if (status) {
          if (crossFilter.value === "aprovado") {
            filteredData = filteredData.filter((d) => d.status_gestor === status);
          } else {
            filteredData = filteredData.filter((d) => d.status_responsavel === status);
          }
        }
      } else if (crossFilter.type === "semana") {
        const semana = parseInt(crossFilter.value);
        filteredData = filteredData.filter((d) => d.semana_limite?.includes(semana));
      } else if (crossFilter.type === "responsavel") {
        filteredData = filteredData.filter((d) => d.responsavel_id === crossFilter.value);
      } else if (crossFilter.type === "setor") {
        filteredData = filteredData.filter((d) => d.setor_id === crossFilter.value);
      }
    }

    setDemandas(filteredData);

    // Fetch all demandas for historical charts (without month/year filter)
    let allQuery = supabase.from("demandas").select("*").eq("ativa", true);
    if (!isGestorOrAdmin) {
      allQuery = allQuery.eq("responsavel_id", user.id);
    }
    const { data: allDemandasData } = await allQuery;
    setAllDemandas(allDemandasData || []);

    // Fetch profiles and setores
    const { data: profilesData } = await supabase.from("profiles").select("*");
    setProfiles(profilesData || []);

    const { data: setoresData } = await supabase.from("setores").select("*").order("nome");
    setSetores(setoresData || []);

    setIsLoading(false);
  }, [user, isGestorOrAdmin, filters, crossFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = demandas.length;
    const feito = demandas.filter((d) => d.status_responsavel === "executado").length;
    const aprovado = demandas.filter((d) => d.status_gestor === "executado").length;
    const pendente = demandas.filter((d) => d.status_responsavel === "pendente").length;
    const naoRealizado = demandas.filter((d) => d.status_responsavel === "nao_realizado").length;
    const urgente = demandas.filter((d) => d.muito_urgente).length;

    // Gestor statuses
    const gestorPendente = demandas.filter((d) => d.status_gestor === "pendente").length;
    const gestorRejeitado = demandas.filter((d) => d.status_gestor === "nao_realizado").length;

    return { total, feito, aprovado, pendente, naoRealizado, urgente, gestorPendente, gestorRejeitado };
  }, [demandas]);

  // Monthly evolution data for historical chart
  const monthlyEvolutionData = useMemo(() => {
    const monthData: Record<string, { mes: number; ano: number; total: number; concluidas: number }> = {};
    
    allDemandas.forEach((d) => {
      const key = `${d.ano}-${d.mes}`;
      if (!monthData[key]) {
        monthData[key] = { mes: d.mes, ano: d.ano, total: 0, concluidas: 0 };
      }
      monthData[key].total++;
      if (d.status_responsavel === "executado") {
        monthData[key].concluidas++;
      }
    });

    return Object.values(monthData).slice(-12); // Last 12 months
  }, [allDemandas]);

  // Current week calculation
  const currentWeek = useMemo(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return Math.min(5, Math.ceil(dayOfMonth / 7));
  }, []);

  // Handlers for drill-through navigation
  const handleNavigateToAPT = useCallback((filterParams?: Record<string, string>) => {
    const params = new URLSearchParams({ tab: "execucao", ...filterParams });
    navigate(`/apt?${params.toString()}`);
  }, [navigate]);

  const handleStatusClick = useCallback((status: string) => {
    if (crossFilter?.type === "status" && crossFilter.value === status) {
      applyCrossFilter(null);
    } else {
      applyCrossFilter({ type: "status", value: status });
    }
  }, [crossFilter, applyCrossFilter]);

  const handleKPIClick = useCallback((type: string) => {
    if (type === "total") {
      applyCrossFilter(null);
    } else {
      handleStatusClick(type);
    }
  }, [handleStatusClick, applyCrossFilter]);

  const handleResponsavelClick = useCallback((responsavelId: string) => {
    if (crossFilter?.type === "responsavel" && crossFilter.value === responsavelId) {
      applyCrossFilter(null);
    } else {
      applyCrossFilter({ type: "responsavel", value: responsavelId });
    }
  }, [crossFilter, applyCrossFilter]);

  const handleSetorClick = useCallback((setorId: string) => {
    if (crossFilter?.type === "setor" && crossFilter.value === setorId) {
      applyCrossFilter(null);
    } else {
      applyCrossFilter({ type: "setor", value: setorId });
    }
  }, [crossFilter, applyCrossFilter]);

  const handleWeekClick = useCallback((week: number) => {
    if (crossFilter?.type === "semana" && crossFilter.value === String(week)) {
      applyCrossFilter(null);
    } else {
      applyCrossFilter({ type: "semana", value: String(week) });
    }
  }, [crossFilter, applyCrossFilter]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Determine which dashboard to show based on role
  const showCollaboratorView = !isGestorOrAdmin;

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4 max-w-[1800px] mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard APT</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isGestorOrAdmin 
              ? "Visão analítica da performance da equipe"
              : `Acompanhe seu progresso, ${profile?.nome || "Colaborador"}`}
          </p>
        </div>

        {/* Global Filters */}
        <DashboardFilters
          profiles={profiles}
          setores={setores}
          filters={filters}
          crossFilter={crossFilter}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Tabs for different dashboards */}
        {isGestorOrAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="executivo" className="gap-2">
                <LayoutDashboard className="h-4 w-4 hidden sm:inline" />
                Executivo
              </TabsTrigger>
              <TabsTrigger value="operacional" className="gap-2">
                <Clock className="h-4 w-4 hidden sm:inline" />
                Momento APT
              </TabsTrigger>
              <TabsTrigger value="individual" className="gap-2">
                <Users className="h-4 w-4 hidden sm:inline" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <TrendingUp className="h-4 w-4 hidden sm:inline" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* DASHBOARD EXECUTIVO */}
            <TabsContent value="executivo" className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard
                  title="Total"
                  value={kpis.total}
                  onClick={() => handleKPIClick("total")}
                />
                <KPICard
                  title="Feito"
                  value={kpis.feito}
                  percentage={kpis.total > 0 ? Math.round((kpis.feito / kpis.total) * 100) : 0}
                  color="green"
                  onClick={() => handleKPIClick("feito")}
                  isActive={crossFilter?.type === "status" && crossFilter.value === "feito"}
                />
                <KPICard
                  title="Aprovado"
                  value={kpis.aprovado}
                  percentage={kpis.total > 0 ? Math.round((kpis.aprovado / kpis.total) * 100) : 0}
                  color="blue"
                  onClick={() => handleKPIClick("aprovado")}
                  isActive={crossFilter?.type === "status" && crossFilter.value === "aprovado"}
                />
                <KPICard
                  title="Pendente"
                  value={kpis.pendente}
                  percentage={kpis.total > 0 ? Math.round((kpis.pendente / kpis.total) * 100) : 0}
                  color="yellow"
                  onClick={() => handleKPIClick("pendente")}
                  isActive={crossFilter?.type === "status" && crossFilter.value === "pendente"}
                />
                <KPICard
                  title="Não Realizado"
                  value={kpis.naoRealizado}
                  percentage={kpis.total > 0 ? Math.round((kpis.naoRealizado / kpis.total) * 100) : 0}
                  color="red"
                  onClick={() => handleKPIClick("naoRealizado")}
                  isActive={crossFilter?.type === "status" && crossFilter.value === "naoRealizado"}
                />
                <KPICard
                  title="Urgentes"
                  value={kpis.urgente}
                  color="red"
                  onClick={() => updateFilter("urgente", !filters.urgente)}
                  isActive={filters.urgente}
                />
              </div>

              {/* Status Donuts - side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusDonutChart
                  data={{
                    feito: kpis.feito,
                    pendente: kpis.pendente,
                    naoRealizado: kpis.naoRealizado,
                  }}
                  onStatusClick={handleStatusClick}
                  activeStatus={crossFilter?.type === "status" ? crossFilter.value : null}
                />
                <GestorStatusDonutChart
                  data={{
                    aprovado: kpis.aprovado,
                    pendente: kpis.gestorPendente,
                    rejeitado: kpis.gestorRejeitado,
                  }}
                  onStatusClick={handleStatusClick}
                  activeStatus={crossFilter?.type === "status" ? crossFilter.value : null}
                />
              </div>

              {/* Weekly Stacked Chart */}
              <WeeklyStackedChart
                demandas={demandas}
                onWeekClick={handleWeekClick}
                activeWeek={crossFilter?.type === "semana" ? parseInt(crossFilter.value) : null}
              />

              {/* Bottleneck Chart */}
              <BottleneckChart
                demandas={demandas}
                profiles={profiles}
                onResponsavelClick={handleResponsavelClick}
                activeResponsavel={crossFilter?.type === "responsavel" ? crossFilter.value : null}
              />
            </TabsContent>

            {/* DASHBOARD OPERACIONAL - MOMENTO APT */}
            <TabsContent value="operacional" className="space-y-4">
              <WeeklyUserChart
                demandas={demandas}
                profiles={profiles}
                currentWeek={currentWeek}
              />
              <CriticalDemandsList
                demandas={demandas}
                profiles={profiles}
                currentWeek={currentWeek}
              />
            </TabsContent>

            {/* DASHBOARD INDIVIDUAL (for managers viewing individual) */}
            <TabsContent value="individual" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <IndividualProgress
                  totalDemandas={kpis.total}
                  completedDemandas={kpis.feito}
                  userName={profile?.nome || "Usuário"}
                />
                <WeeklyStackedChart
                  demandas={demandas}
                  onWeekClick={handleWeekClick}
                />
              </div>
              <CriticalDemandsList
                demandas={demandas}
                profiles={profiles}
                currentWeek={currentWeek}
              />
            </TabsContent>

            {/* DASHBOARD HISTÓRICO / GESTÃO */}
            <TabsContent value="historico" className="space-y-4">
              <MonthlyEvolutionChart data={monthlyEvolutionData} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RepetitionCompletionChart demandas={allDemandas} />
                <SectorPendingChart
                  demandas={demandas}
                  setores={setores}
                  onSetorClick={handleSetorClick}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* COLABORADOR VIEW */
          <div className="space-y-4">
            {/* Individual Progress */}
            <IndividualProgress
              totalDemandas={kpis.total}
              completedDemandas={kpis.feito}
              userName={profile?.nome || "Colaborador"}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WeeklyStackedChart
                demandas={demandas}
                onWeekClick={handleWeekClick}
              />
              <CriticalDemandsList
                demandas={demandas}
                profiles={profiles}
                currentWeek={currentWeek}
              />
            </div>

            {/* Monthly Evolution for personal tracking */}
            <MonthlyEvolutionChart data={monthlyEvolutionData} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
