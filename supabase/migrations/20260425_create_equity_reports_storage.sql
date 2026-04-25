-- biotechtube/supabase/migrations/20260425_create_equity_reports_storage.sql
-- Private storage bucket for premium equity report PDFs and audio briefings.

insert into storage.buckets (id, name, public)
values ('equity-reports', 'equity-reports', false)
on conflict (id) do nothing;
