import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimerRow {
  id: string;
  mes: number;
  ano: number;
  semana: number;
  started_at: string;
  stopped_at: string | null;
  duration_seconds: number | null;
  started_by: string | null;
  created_at: string;
}

interface UseChecklistTimerParams {
  mes: number;
  ano: number;
}

export function useChecklistTimer({ mes, ano }: UseChecklistTimerParams) {
  const [activeTimer, setActiveTimer] = useState<TimerRow | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [weekDurations, setWeekDurations] = useState<Record<number, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTimers = useCallback(async () => {
    // Fetch all timers for this month
    const { data, error } = await supabase
      .from("checklist_timers")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano);

    if (error) {
      console.error("Error fetching timers:", error);
      return;
    }

    const timers = (data || []) as TimerRow[];
    
    // Find active timer (no stopped_at)
    const active = timers.find((t) => !t.stopped_at) || null;
    setActiveTimer(active);

    // Build week durations map from completed timers
    const durations: Record<number, number> = {};
    timers.forEach((t) => {
      if (t.stopped_at && t.duration_seconds) {
        durations[t.semana] = (durations[t.semana] || 0) + t.duration_seconds;
      }
    });
    setWeekDurations(durations);
  }, [mes, ano]);

  // Calculate elapsed from active timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeTimer && !activeTimer.stopped_at) {
      const calcElapsed = () => {
        const start = new Date(activeTimer.started_at).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      };
      calcElapsed();
      intervalRef.current = setInterval(calcElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer]);

  // Initial fetch
  useEffect(() => {
    fetchTimers();
  }, [fetchTimers]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("checklist-timers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_timers" },
        () => {
          fetchTimers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTimers]);

  const startTimer = useCallback(
    async (semana: number) => {
      // Delete existing timer for this week if any (to allow restart)
      await supabase
        .from("checklist_timers")
        .delete()
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("semana", semana);

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("checklist_timers").insert({
        mes,
        ano,
        semana,
        started_by: userData?.user?.id || null,
      });

      if (error) {
        console.error("Error starting timer:", error);
        toast.error("Erro ao iniciar cronômetro");
      } else {
        toast.success(`Cronômetro da semana ${semana} iniciado!`);
      }
    },
    [mes, ano]
  );

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;

    const start = new Date(activeTimer.started_at).getTime();
    const duration = Math.floor((Date.now() - start) / 1000);

    const { error } = await supabase
      .from("checklist_timers")
      .update({
        stopped_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq("id", activeTimer.id);

    if (error) {
      console.error("Error stopping timer:", error);
      toast.error("Erro ao parar cronômetro");
    } else {
      toast.success("Cronômetro finalizado!");
    }
  }, [activeTimer]);

  return {
    isRunning: !!activeTimer && !activeTimer.stopped_at,
    activeWeek: activeTimer?.semana || null,
    elapsedSeconds,
    weekDurations,
    startTimer,
    stopTimer,
  };
}
