-- biotechtube/supabase/migrations/20260425_create_equity_reports.sql
-- Premium equity research reports — the paid product.
-- DISTINCT from company_reports (free profile-enrichment data).
-- See docs/superpowers/specs/2026-04-25-ai-research-reports-design.md

create table if not exists equity_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade not null,
  generated_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  expires_at timestamptz,
  pdf_url text,
  audio_url text,
  mechanism_svg text,
  content_jsonb jsonb not null,
  enrichment_jsonb jsonb,
  cost_cents int not null default 0,
  generation_seconds int,
  model_version text not null default 'deepseek-v4-pro'
);
create index if not exists idx_equity_reports_company_generated
  on equity_reports (company_id, generated_at desc);

create table if not exists equity_report_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  buyer_email text not null,
  equity_report_id uuid references equity_reports(id) on delete set null,
  company_id uuid references companies(id) on delete cascade not null,
  tier text not null check (tier in ('snapshot', 'living', 'institutional')),
  angle text not null default 'general'
    check (angle in ('long', 'short', 'vc', 'bd', 'scientist', 'general')),
  stripe_session_id text unique not null,
  stripe_payment_intent_id text,
  amount_cents int not null,
  paid_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'angle_pending', 'ready', 'failed', 'refunded')),
  generation_attempts int not null default 0,
  generation_started_at timestamptz,
  download_count int not null default 0,
  last_downloaded_at timestamptz,
  refunded_at timestamptz,
  live_access_expires_at timestamptz,
  alerts_opted_in boolean not null default false,
  day14_refresh_sent_at timestamptz
);
create index if not exists idx_erp_user on equity_report_purchases (user_id);
create index if not exists idx_erp_email on equity_report_purchases (buyer_email);
create index if not exists idx_erp_status on equity_report_purchases (status);
create index if not exists idx_erp_session on equity_report_purchases (stripe_session_id);
create index if not exists idx_erp_company on equity_report_purchases (company_id);

create table if not exists equity_report_chats (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references equity_report_purchases(id) on delete cascade not null,
  messages jsonb not null default '[]'::jsonb,
  message_count int not null default 0,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
create index if not exists idx_erc_purchase on equity_report_chats (purchase_id);

create table if not exists equity_report_events (
  id uuid primary key default gen_random_uuid(),
  equity_report_id uuid references equity_reports(id) on delete cascade not null,
  event_type text not null check (event_type in ('news', 'funding', 'trial_status', 'sec_filing')),
  event_summary text,
  source_url text,
  detected_at timestamptz not null default now(),
  is_material boolean not null default false
);
create index if not exists idx_ere_report_detected
  on equity_report_events (equity_report_id, detected_at desc);

-- RLS: most reads happen via service-role API routes which bypass RLS.
-- Client-direct reads are only for the buyer's own dashboard.

alter table equity_reports enable row level security;
-- No client policy — equity_reports is server-only.

alter table equity_report_purchases enable row level security;
create policy "buyer can read own purchases"
  on equity_report_purchases for select
  to authenticated
  using (user_id = auth.uid());

alter table equity_report_chats enable row level security;
create policy "buyer can read own chats"
  on equity_report_chats for select
  to authenticated
  using (
    purchase_id in (
      select id from equity_report_purchases where user_id = auth.uid()
    )
  );

alter table equity_report_events enable row level security;
-- No client policy — events are server-only.
