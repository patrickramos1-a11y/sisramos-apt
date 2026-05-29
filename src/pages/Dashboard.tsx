import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LayoutDashboard, Users, TrendingUp, Clock, Timer } from "lucide-react";
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
import MeetingTimerCharts from "@/components/dashboard/MeetingTimerCharts";

// Hooks
import { useDashboardFilters, CrossFilter } from "@/hooks/useDashboardFilters";
import { AptTag, uniqueTags } from "@/lib/tags";

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
  tags?: AptTag[];
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
  const [availableTags, setAvailableTags] = useState<AptTag[]>([]);
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
      .select("*, demanda_tags(tag:tags(id,nome,slug,cor))")
      .eq("ativa", true);

    // Colaboradores only see their own
    if (!isGestorOrAdmin) {
      query = query.eq("responsavel_id", user.id);
    }

    // Apply global filters via Supabase .in() for arrays
    if (filters.anos.length > 0) {
      query = query.in("ano", filters.anos.map(Number));
    }
    if (filters.meses.length > 0) {
      query = query.in("mes", filters.meses.map(Number));
    }
    if (filters.responsaveis.length > 0) {
      query = query.in("responsavel_id", filters.responsaveis);
    }
    if (filters.setores.length > 0) {
      query = query.in("setor_id", filters.setores);
    }
    if (filters.statusFeito.length > 0) {
      query = query.in("status_responsavel", filters.statusFeito as StatusBolinha[]);
    }
    if (filters.statusAprovado.length > 0) {
      query = query.in("status_gestor", filters.statusAprovado as StatusBolinha[]);
    }

    let { data: demandasData, error: demandasError } = await query;

    if (demandasError && /demanda_tags|tags/i.test(demandasError.message)) {
      let fallbackQuery = supabase.from("demandas").select("*").eq("ativa", true);
      if (!isGestorOrAdmin) fallbackQuery = fallbackQuery.eq("responsavel_id", user.id);
      if (filters.anos.length > 0) fallbackQuery = fallbackQuery.in("ano", filters.anos.map(Number));
      if (filters.meses.length > 0) fallbackQuery = fallbackQuery.in("mes", filters.meses.map(Number));
      if (filters.responsaveis.length > 0) fallbackQuery = fallbackQuery.in("responsavel_id", filters.responsaveis);
      if (filters.setores.length > 0) fallbackQuery = fallbackQuery.in("setor_id", filters.setores);
      if (filters.statusFeito.length > 0) fallbackQuery = fallbackQuery.in("status_responsavel", filters.statusFeito as StatusBolinha[]);
      if (filters.statusAprovado.length > 0) fallbackQuery = fallbackQuery.in("status_gestor", filters.statusAprovado as StatusBolinha[]);
      const fallback = await fallbackQuery;
      demandasData = fallback.data;
      demandasError = fallback.error;
    }
    
    let filteredData = ((demandasData || []) as any[]).map((demanda) => ({
      ...demanda,
      tags: (demanda.demanda_tags || []).map((item: any) => item.tag).filter(Boolean),
    })) as Demanda[];
    setAvailableTags(uniqueTags(filteredData.flatMap((demanda) => demanda.tags || [])));
    
    // Client-side filters
    if (filters.semanas.length > 0) {
      const semanaNums = filters.semanas.map(Number);
      filteredData = filteredData.filter((d) => d.semana_limite?.some((s) => semanaNums.includes(s)));
    }
    if (filters.repeticoes.length > 0) {
      const repNums = filters.repeticoes.map(Number);
      filteredData = filteredData.filter((d) => repNums.includes(d.semanas_repeticao));
    }
    if (filters.urgente) {
      filteredData = filteredData.filter((d) => d.muito_urgente);
    }
    if (filters.prioridade) {
      filteredData = filteredData.filter((d) => d.prioritaria);
    }
    if (filters.tags.length > 0) {
      const selected = new Set(filters.tags);
      filteredData = filteredData.filter((d) => (d.tags || []).some((tag) => selected.has(tag.id)));
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

  return (
    <AppLayout>
      <div className="p-2 md:p-4 lg:p-6 space-y-4 max-w-[1800px] mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">Dashboard APT</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">
            {isGestorOrAdmin 
              ? "Visão analítica da performance da equipe"
              : `Acompanhe seu progresso, ${profile?.nome || "Colaborador"}`}
          </p>
        </div>

        {/* Global Filters */}
        <DashboardFilters
          profiles={profiles}
          setores={setores}
          tags={availableTags}
          filters={filters}
          crossFilter={crossFilter}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Tabs for different dashboards */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 lg:w-auto lg:inline-grid h-auto snap-x snap-mandatory">
              <TabsTrigger value="executivo" className="gap-1.5 text-xs sm:text-sm py-2.5 snap-start whitespace-nowrap min-h-[40px]">
                <LayoutDashboard className="h-4 w-4 hidden sm:inline" />
                <span className="hidden sm:inline">Executivo</span>
                <span className="sm:hidden">Exec.</span>
              </TabsTrigger>
              <TabsTrigger value="operacional" className="gap-1.5 text-xs sm:text-sm py-2.5 snap-start whitespace-nowrap min-h-[40px]">
                <Clock className="h-4 w-4 hidden sm:inline" />
                <span className="hidden sm:inline">Momento APT</span>
                <span className="sm:hidden">APT</span>
              </TabsTrigger>
              <TabsTrigger value="duracao" className="gap-1.5 text-xs sm:text-sm py-2.5 snap-start whitespace-nowrap min-h-[40px]">
                <Timer className="h-4 w-4 hidden sm:inline" />
                <span className="hidden sm:inline">Duração</span>
                <span className="sm:hidden">Duração</span>
              </TabsTrigger>
              <TabsTrigger value="individual" className="gap-1.5 text-xs sm:text-sm py-2.5 snap-start whitespace-nowrap min-h-[40px]">
                <Users className="h-4 w-4 hidden sm:inline" />
                <span className="hidden sm:inline">Individual</span>
                <span className="sm:hidden">Indiv.</span>
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm py-2.5 snap-start whitespace-nowrap min-h-[40px]">
                <TrendingUp className="h-4 w-4 hidden sm:inline" />
                <span className="hidden sm:inline">Histórico</span>
                <span className="sm:hidden">Hist.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* DASHBOARD EXECUTIVO */}
          <TabsContent value="executivo" className="space-y-4">
            {/* KPI Cards */}
            <div className={`grid grid-cols-2 md:grid-cols-3 ${isGestorOrAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
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
              {isGestorOrAdmin && (
                <KPICard
                  title="Aprovado"
                  value={kpis.aprovado}
                  percentage={kpis.total > 0 ? Math.round((kpis.aprovado / kpis.total) * 100) : 0}
                  color="blue"
                  onClick={() => handleKPIClick("aprovado")}
                  isActive={crossFilter?.type === "status" && crossFilter.value === "aprovado"}
                />
              )}
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

            {/* Bottleneck Chart - only for managers */}
            {isGestorOrAdmin && (
              <BottleneckChart
                demandas={demandas}
                profiles={profiles}
                onResponsavelClick={handleResponsavelClick}
                activeResponsavel={crossFilter?.type === "responsavel" ? crossFilter.value : null}
              />
            )}
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

          {/* DASHBOARD DURAÇÃO */}
          <TabsContent value="duracao" className="space-y-4">
            <MeetingTimerCharts />
          </TabsContent>

          {/* DASHBOARD INDIVIDUAL */}
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
      </div>
    </AppLayout>
  );
}
