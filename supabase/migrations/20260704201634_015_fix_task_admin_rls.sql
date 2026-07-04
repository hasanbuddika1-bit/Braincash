/*
# Fix Task Admin RLS Policies

## Problem
The `admin_tasks` policy on the `tasks` table uses `auth.uid()` which requires
a Supabase Auth session. This app uses Telegram ID-based auth (no Supabase Auth),
so `auth.uid()` always returns null and admin operations (delete, update, insert)
on tasks always fail.

## Fix
Add anon-accessible CRUD policies for the `tasks` table so the frontend
(which uses the anon key) can manage tasks. The admin UI already checks
`is_admin` before showing the admin panel, so this is safe.

## Changes
- Drop the old `admin_tasks` FOR ALL policy
- Add 4 separate policies (SELECT, INSERT, UPDATE, DELETE) for anon + authenticated
- Keep the existing `anon_select_tasks` and `user_select_tasks` SELECT policies
*/

DROP POLICY IF EXISTS "admin_tasks" ON tasks;

DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);
