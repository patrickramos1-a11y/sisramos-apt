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
  merged_weeks: number[] | null;
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
    const active = timers.find((t) => !t.stopped_at) || null;
    setActiveTimer(active);

    const durations: Record<number, number> = {};
    timers.forEach((t) => {
      if (t.stopped_at && t.duration_seconds) {
        durations[t.semana] = (durations[t.semana] || 0) + t.duration_seconds;
      }
    });
    setWeekDurations(durations);
  }, [mes, ano]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeTimer && !activeTimer.stopped_at) {
      if (activeTimer.paused_at) {
        setElapsedSeconds(activeTimer.accumulated_seconds);
      } else {
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

  useEffect(() => {
    fetchTimers();
  }, [fetchTimers]);

  useEffect(() => {
    const channel = supabase
      .channel("checklist-timers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_timers" },
        () => fetchTimers()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTimers]);

  const startTimer = useCallback(
    async (semana: number, mergedWeeks?: number[]) => {
      // Delete existing timer for this week (or merged weeks)
      const weeksToDelete = mergedWeeks && mergedWeeks.length >= 2 ? mergedWeeks : [semana];
      for (const w of weeksToDelete) {
        await supabase
          .from("checklist_timers")
          .delete()
          .eq("mes", mes)
          .eq("ano", ano)
          .eq("semana", w)
          .is("stopped_at", null);
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("checklist_timers").insert({
        mes,
        ano,
        semana,
        started_by: userData?.user?.id || null,
        accumulated_seconds: 0,
        merged_weeks: mergedWeeks && mergedWeeks.length >= 2 ? mergedWeeks : null,
      });

      if (error) {
        console.error("Error starting timer:", error);
        toast.error("Erro ao iniciar cronômetro");
      } else {
        const label = mergedWeeks && mergedWeeks.length >= 2
          ? `Semanas ${mergedWeeks.join(" e ")}`
          : `Semana ${semana}`;
        toast.success(`Cronômetro da ${label} iniciado!`);
      }
    },
    [mes, ano]
  );

  const pauseTimer = useCallback(async () => {
    if (!activeTimer || activeTimer.paused_at) return;

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

  const stopTimer = useCallback(async (mergedWeeksOverride?: number[]) => {
    if (!activeTimer) return;

    let totalDuration: number;
    if (activeTimer.paused_at) {
      totalDuration = activeTimer.accumulated_seconds;
    } else {
      const start = new Date(activeTimer.started_at).getTime();
      totalDuration = activeTimer.accumulated_seconds + Math.floor((Date.now() - start) / 1000);
    }

    // Stop the main timer
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
      return;
    }

    // If merged weeks, create duplicate records for the other weeks
    const weeks = mergedWeeksOverride || activeTimer.merged_weeks;
    if (weeks && weeks.length >= 2) {
      const otherWeeks = weeks.filter((w) => w !== activeTimer.semana);
      for (const w of otherWeeks) {
        // Delete any existing completed timer for this week first
        await supabase
          .from("checklist_timers")
          .delete()
          .eq("mes", mes)
          .eq("ano", ano)
          .eq("semana", w)
          .not("stopped_at", "is", null);

        await supabase.from("checklist_timers").insert({
          mes,
          ano,
          semana: w,
          started_at: activeTimer.started_at,
          stopped_at: new Date().toISOString(),
          duration_seconds: totalDuration,
          accumulated_seconds: totalDuration,
          started_by: activeTimer.started_by,
          merged_weeks: weeks,
        });
      }
    }

    toast.success("Cronômetro finalizado!");
  }, [activeTimer, mes, ano]);

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
