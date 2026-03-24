

## Plano: Adicionar Gráficos de Cronômetro na aba "Momento APT" do Dashboard

### Objetivo
Adicionar gráficos de histórico do cronômetro de reuniões diretamente na aba "Momento APT" do Dashboard, com:
1. KPIs de reuniões (total, tempo médio, mais rápida, mais longa)
2. Gráfico de barras: duração total por mês
3. Gráfico de linhas: comparativo semanal (tempo de cada semana ao longo dos meses)
4. Gráfico de linhas: evolução mensal do tempo total

### Alterações

**1. Criar componente `src/components/dashboard/MeetingTimerCharts.tsx`**
- Componente dedicado que busca dados da tabela `checklist_timers` (registros finalizados)
- Reutiliza a mesma lógica de cálculo já presente em `ChecklistTimerHistory.tsx`, mas sem o Dialog wrapper
- Inclui:
  - Cards KPI (Total Reuniões, Tempo Médio, Mais Rápida, Mais Longa)
  - BarChart: duração total por mês
  - LineChart: evolução comparativa das semanas ao longo dos meses (5 linhas, uma por semana)
  - LineChart: tempo total mensal como linha de tendência

**2. Atualizar `src/pages/Dashboard.tsx`**
- Importar o novo `MeetingTimerCharts`
- Adicioná-lo na aba "operacional" (Momento APT), abaixo dos componentes existentes (WeeklyUserChart e CriticalDemandsList)

### Detalhes Técnicos
- Query: `checklist_timers` com `stopped_at IS NOT NULL`, ordenado por ano/mês/semana
- Cores das semanas seguem o padrão já definido em `ChecklistTimerHistory` (WEEK_COLORS)
- Gráficos usam `ChartContainer` + `recharts` (LineChart, BarChart) consistentes com o resto do dashboard
- Componente auto-contido: faz seu próprio fetch sem depender de props do Dashboard

