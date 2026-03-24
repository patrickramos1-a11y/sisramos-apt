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
  paused_at: string | null;
  accumulated_seconds: number;
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
      if (activeTimer.paused_at) {
        // Timer is paused — accumulated_seconds already has the full elapsed
        setElapsedSeconds(activeTimer.accumulated_seconds);
      } else {
        // Timer is running
        const calcElapsed = () => {
          const start = new Date(activeTimer.started_at).getTime();
          const now = Date.now();
          const runningSeconds = Math.floor((now - start) / 1000);
          setElapsedSeconds(activeTimer.accumulated_seconds + runningSeconds);
        };
        calcElapsed();
        intervalRef.current = setInterval(calcElapsed, 1000);
      }
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
        accumulated_seconds: 0,
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

  const pauseTimer = useCallback(async () => {
    if (!activeTimer || activeTimer.paused_at) return;

    // Calculate seconds elapsed in current running segment
    const start = new Date(activeTimer.started_at).getTime();
    const now = Date.now();
    const runningSeconds = Math.floor((now - start) / 1000);
    const newAccumulated = activeTimer.accumulated_seconds + runningSeconds;

    const { error } = await supabase
      .from("checklist_timers")
      .update({
        paused_at: new Date().toISOString(),
        accumulated_seconds: newAccumulated,
      })
      .eq("id", activeTimer.id);

    if (error) {
      console.error("Error pausing timer:", error);
      toast.error("Erro ao pausar cronômetro");
    } else {
      toast.success("Cronômetro pausado!");
    }
  }, [activeTimer]);

  const resumeTimer = useCallback(async () => {
    if (!activeTimer || !activeTimer.paused_at) return;

    // Reset started_at to now, keep accumulated_seconds
    const { error } = await supabase
      .from("checklist_timers")
      .update({
        started_at: new Date().toISOString(),
        paused_at: null,
      })
      .eq("id", activeTimer.id);

    if (error) {
      console.error("Error resuming timer:", error);
      toast.error("Erro ao retomar cronômetro");
    } else {
      toast.success("Cronômetro retomado!");
    }
  }, [activeTimer]);

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;

    let totalDuration: number;
    if (activeTimer.paused_at) {
      // Already paused — accumulated_seconds has the total
      const start = new Date(activeTimer.started_at).getTime();
      const pausedAt = new Date(activeTimer.paused_at).getTime();
      const lastSegment = Math.floor((pausedAt - start) / 1000);
      totalDuration = activeTimer.accumulated_seconds + lastSegment;
    } else {
      // Running — calculate current
      const start = new Date(activeTimer.started_at).getTime();
      totalDuration = activeTimer.accumulated_seconds + Math.floor((Date.now() - start) / 1000);
    }

    const { error } = await supabase
      .from("checklist_timers")
      .update({
        stopped_at: new Date().toISOString(),
        duration_seconds: totalDuration,
        paused_at: null,
      })
      .eq("id", activeTimer.id);

    if (error) {
      console.error("Error stopping timer:", error);
      toast.error("Erro ao parar cronômetro");
    } else {
      toast.success("Cronômetro finalizado!");
    }
  }, [activeTimer]);

  const isPaused = !!activeTimer && !activeTimer.stopped_at && !!activeTimer.paused_at;
  const isRunning = !!activeTimer && !activeTimer.stopped_at && !activeTimer.paused_at;

  return {
    isRunning,
    isPaused,
    isActive: isRunning || isPaused,
    activeWeek: activeTimer?.semana || null,
    elapsedSeconds,
    weekDurations,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };
}
