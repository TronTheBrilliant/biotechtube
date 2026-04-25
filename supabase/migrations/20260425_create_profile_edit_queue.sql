-- Phase 4 of DeepSeek V4 upgrade: queues for AI-drafted profile edits + generic audit trail.
-- Applied to project niblhjhtkqazfegktnok on 2026-04-25 via Supabase MCP.

create table if not exists profile_edit_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  source_type text not null,          -- 'rss', 'fda', 'ct_gov', 'sec', 'funding_round'
  source_id text,                     -- foreign id from the source table
  proposed_changes jsonb not null,    -- partial update for `companies` / `pipelines`
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  reasoning text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','applied','auto_applied','superseded')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profile_edit_queue_status_created_idx
  on profile_edit_queue (status, created_at desc);

create index if not exists profile_edit_queue_company_idx
  on profile_edit_queue (company_id, created_at desc);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,               -- 'auto_update', 'admin_edit', 'merge', 'reject'
  before_jsonb jsonb,
  after_jsonb jsonb,
  source text,                        -- e.g. 'auto-update-cron:rss:<rss_item_id>'
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists audit_log_table_record_idx
  on audit_log (table_name, record_id, created_at desc);

create index if not exists audit_log_action_created_idx
  on audit_log (action, created_at desc);

-- RLS: service role bypasses; restrict reads to admin-only via API layer (no public select policy).
alter table profile_edit_queue enable row level security;
alter table audit_log enable row level security;
