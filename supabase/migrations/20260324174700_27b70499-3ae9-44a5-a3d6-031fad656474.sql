
ALTER TABLE public.checklist_timers 
  ADD COLUMN paused_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN accumulated_seconds integer NOT NULL DEFAULT 0;
