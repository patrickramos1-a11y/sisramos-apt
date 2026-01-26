-- Atualizar RLS de checklist_items para acesso público
DROP POLICY IF EXISTS "Gestores podem atualizar checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Gestores podem criar checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Gestores podem deletar checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Todos podem ver checklist items" ON public.checklist_items;

CREATE POLICY "Leitura pública de checklist_items"
ON public.checklist_items FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de checklist_items"
ON public.checklist_items FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de checklist_items"
ON public.checklist_items FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de checklist_items"
ON public.checklist_items FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de setores para acesso público
DROP POLICY IF EXISTS "Gestores e admin podem gerenciar setores" ON public.setores;
DROP POLICY IF EXISTS "Todos podem ver setores" ON public.setores;

CREATE POLICY "Leitura pública de setores"
ON public.setores FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de setores"
ON public.setores FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de setores"
ON public.setores FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de setores"
ON public.setores FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de month_settings para acesso público
DROP POLICY IF EXISTS "Gestores podem gerenciar configurações de meses" ON public.month_settings;
DROP POLICY IF EXISTS "Todos podem ver configurações de meses" ON public.month_settings;

CREATE POLICY "Leitura pública de month_settings"
ON public.month_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de month_settings"
ON public.month_settings FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de month_settings"
ON public.month_settings FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de month_settings"
ON public.month_settings FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de profiles para acesso público
DROP POLICY IF EXISTS "Permitir leitura pública de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON public.profiles;

CREATE POLICY "Leitura pública de profiles"
ON public.profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de profiles"
ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de profiles"
ON public.profiles FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de profiles"
ON public.profiles FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de user_roles para acesso público
DROP POLICY IF EXISTS "Apenas admin pode gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Permitir leitura pública de roles" ON public.user_roles;

CREATE POLICY "Leitura pública de user_roles"
ON public.user_roles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de user_roles"
ON public.user_roles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de user_roles"
ON public.user_roles FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de user_roles"
ON public.user_roles FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de notifications para acesso público
DROP POLICY IF EXISTS "Gestores podem criar notificações" ON public.notifications;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias notificações" ON public.notifications;

CREATE POLICY "Leitura pública de notifications"
ON public.notifications FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de notifications"
ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de notifications"
ON public.notifications FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de notifications"
ON public.notifications FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de notification_reads para acesso público
DROP POLICY IF EXISTS "Usuários podem desmarcar leitura" ON public.notification_reads;
DROP POLICY IF EXISTS "Usuários podem marcar como lida" ON public.notification_reads;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias leituras" ON public.notification_reads;

CREATE POLICY "Leitura pública de notification_reads"
ON public.notification_reads FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de notification_reads"
ON public.notification_reads FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de notification_reads"
ON public.notification_reads FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de notification_reads"
ON public.notification_reads FOR DELETE TO anon, authenticated USING (true);

-- Atualizar RLS de notification_dismissals para acesso público
DROP POLICY IF EXISTS "Usuários podem criar suas próprias dismissões" ON public.notification_dismissals;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias dismissões" ON public.notification_dismissals;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias dismissões" ON public.notification_dismissals;

CREATE POLICY "Leitura pública de notification_dismissals"
ON public.notification_dismissals FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inserção pública de notification_dismissals"
ON public.notification_dismissals FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualização pública de notification_dismissals"
ON public.notification_dismissals FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Exclusão pública de notification_dismissals"
ON public.notification_dismissals FOR DELETE TO anon, authenticated USING (true);