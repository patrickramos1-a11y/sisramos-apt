DROP POLICY "Gestors and admins can manage momento_apt_settings" ON momento_apt_settings;
CREATE POLICY "Inserção pública" ON momento_apt_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública" ON momento_apt_settings FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública" ON momento_apt_settings FOR DELETE USING (true);