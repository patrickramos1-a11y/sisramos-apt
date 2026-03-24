
DROP POLICY "Authenticated users can view timers" ON public.checklist_timers;
DROP POLICY "Gestor/admin can manage timers" ON public.checklist_timers;

CREATE POLICY "Leitura pública de checklist_timers" ON public.checklist_timers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserção pública de checklist_timers" ON public.checklist_timers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualização pública de checklist_timers" ON public.checklist_timers FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Exclusão pública de checklist_timers" ON public.checklist_timers FOR DELETE TO anon, authenticated USING (true);
