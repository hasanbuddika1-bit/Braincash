
CREATE POLICY "anon_insert_notifications" ON notifications
  FOR INSERT TO anon WITH CHECK (true);
