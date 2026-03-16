
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

CREATE POLICY "Authenticated users can view timers"
  ON public.checklist_timers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestor/admin can manage timers"
  ON public.checklist_timers FOR ALL TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_timers;
