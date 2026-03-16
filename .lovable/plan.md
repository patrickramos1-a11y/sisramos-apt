

# Cronômetro Real-Time para Checklist Semanal

## Resumo
Criar um cronômetro compartilhado em tempo real na página de Checklist. O gestor/admin escolhe uma semana e inicia o cronômetro. Todos os usuários conectados veem a mesma contagem. O timer persiste no banco de dados, sobrevivendo a refresh/desconexão. Ao finalizar, o tempo total é exibido no card da semana correspondente.

## Mudanças

### 1. Nova tabela `checklist_timers` (Migration)
```sql
CREATE TABLE public.checklist_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  semana integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  duration_seconds integer,
  started_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(mes, ano, semana)
);

ALTER TABLE public.checklist_timers ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view timers"
  ON public.checklist_timers FOR SELECT TO authenticated USING (true);

-- Only gestor/admin can insert/update/delete
CREATE POLICY "Gestor/admin can manage timers"
  ON public.checklist_timers FOR ALL TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_timers;
```

### 2. Hook `useChecklistTimer.ts`
- Busca o timer ativo (where `stopped_at IS NULL` e mês/ano atuais) ao montar
- Subscribes ao canal Realtime `checklist_timers` para receber mudanças instantaneamente
- Calcula o elapsed time via `Date.now() - started_at` com `setInterval` local a cada segundo
- Funções: `startTimer(semana)`, `stopTimer()` — start insere row, stop faz update com `stopped_at` e `duration_seconds`
- Retorna: `isRunning`, `activeWeek`, `elapsedSeconds`, `weekDurations` (mapa semana→duração para timers finalizados)

### 3. Componente `ChecklistTimer.tsx`
- Barra fixa/sticky no topo da área de checklist
- Antes de iniciar: botão "Iniciar Cronômetro" com select de semana (1-5)
- Durante execução: display do tempo (HH:MM:SS) com animação pulsante, indicação da semana, botão "Parar"
- Apenas gestor/admin pode iniciar/parar; colaboradores veem o timer em modo somente leitura
- Confirmação via AlertDialog ao parar

### 4. Atualizar `ChecklistSummaryCard.tsx`
- Nova prop `duration` (seconds ou null)
- Quando há duração registrada, exibir badge com o tempo formatado (ex: "1h 23min") abaixo da barra de progresso
- Ícone de relógio ao lado do tempo

### 5. Integrar na página `Checklist.tsx`
- Usar o hook `useChecklistTimer` com mês/ano atuais
- Renderizar `ChecklistTimer` acima dos cards de semana
- Passar `weekDurations[semana]` para cada `ChecklistSummaryCard`

## Fluxo
1. Gestor clica "Iniciar Cronômetro", seleciona semana 2 → row inserida com `started_at=now()`
2. Todos os clientes recebem via Realtime → timer aparece para todos
3. Refresh/reconexão → hook busca timer ativo do banco, calcula elapsed desde `started_at`
4. Gestor clica "Parar" → row atualizada com `stopped_at` e `duration_seconds`
5. Card da semana 2 passa a mostrar "1h 23min" como duração da reunião

