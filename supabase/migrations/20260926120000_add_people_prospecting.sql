create table if not exists public.decision_makers (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
full_name text not null, job_title text, company_name text not null, location text, linkedin_url text,
professional_email text, professional_phone text, company_website text, source_urls jsonb not null default '[]'::jsonb,
evidence text, confidence text not null default 'medium', target_service text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.linkedin_leads (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
full_name text not null, job_title text, company_name text not null, location text, headline text, linkedin_url text,
company_url text, industry text, seniority text, professional_email text, professional_phone text, company_email text, company_phone text,
source_urls jsonb not null default '[]'::jsonb, evidence text, confidence text not null default 'medium', target_service text,
source_type text not null default 'public_web', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists decision_makers_user_idx on public.decision_makers(user_id);
create index if not exists linkedin_leads_user_idx on public.linkedin_leads(user_id);
create index if not exists decision_makers_linkedin_idx on public.decision_makers(linkedin_url);
create index if not exists linkedin_leads_profile_idx on public.linkedin_leads(linkedin_url);
alter table public.decision_makers enable row level security;
alter table public.linkedin_leads enable row level security;
drop policy if exists decision_makers_owner on public.decision_makers;
create policy decision_makers_owner on public.decision_makers for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists linkedin_leads_owner on public.linkedin_leads;
create policy linkedin_leads_owner on public.linkedin_leads for all using (auth.uid()=user_id) with check (auth.uid()=user_id);