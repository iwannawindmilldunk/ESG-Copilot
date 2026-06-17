create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  stock_exchange text,
  stock_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  company_name text not null,
  report_year text not null,
  period_start date not null,
  period_end date not null,
  selected_standard_ids text[] not null default array['cn-exchange-lite'],
  owner_user_id uuid,
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'exported')),
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid,
  email text,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  file_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null,
  category text not null,
  storage_bucket text,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.parsed_documents (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  file_id text not null references public.uploaded_files(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  category text not null,
  parser_status text not null,
  parser_messages text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_chunks (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id text not null references public.parsed_documents(id) on delete cascade,
  file_id text not null references public.uploaded_files(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  category text not null,
  location_type text not null,
  location_label text not null,
  chunk_text text not null,
  table_context text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.standard_sources (
  id text primary key,
  standard_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.standard_clauses (
  id text primary key,
  standard_id text not null,
  source_id text,
  category text not null,
  clause_no text not null,
  chapter text not null,
  topic text not null,
  requirement text not null,
  applicability text not null,
  suggested_evidence text[] not null default '{}',
  suggested_metrics text[] not null default '{}',
  suggested_departments text[] not null default '{}',
  risk_level_if_missing text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.disclosure_items (
  id text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.report_sections (
  id text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.risk_findings (
  id text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.indicator_indexes (
  id text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (project_id, id)
);

alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.parsed_documents enable row level security;
alter table public.evidence_chunks enable row level security;
alter table public.standard_sources enable row level security;
alter table public.standard_clauses enable row level security;
alter table public.disclosure_items enable row level security;
alter table public.report_sections enable row level security;
alter table public.risk_findings enable row level security;
alter table public.indicator_indexes enable row level security;

drop policy if exists "service_role_full_access_companies" on public.companies;
drop policy if exists "service_role_full_access_projects" on public.projects;
drop policy if exists "service_role_full_access_project_members" on public.project_members;
drop policy if exists "service_role_full_access_uploaded_files" on public.uploaded_files;
drop policy if exists "service_role_full_access_parsed_documents" on public.parsed_documents;
drop policy if exists "service_role_full_access_evidence_chunks" on public.evidence_chunks;
drop policy if exists "service_role_full_access_standard_sources" on public.standard_sources;
drop policy if exists "service_role_full_access_standard_clauses" on public.standard_clauses;
drop policy if exists "service_role_full_access_disclosure_items" on public.disclosure_items;
drop policy if exists "service_role_full_access_report_sections" on public.report_sections;
drop policy if exists "service_role_full_access_risk_findings" on public.risk_findings;
drop policy if exists "service_role_full_access_indicator_indexes" on public.indicator_indexes;

create policy "service_role_full_access_companies" on public.companies for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_projects" on public.projects for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_project_members" on public.project_members for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_uploaded_files" on public.uploaded_files for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_parsed_documents" on public.parsed_documents for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_evidence_chunks" on public.evidence_chunks for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_standard_sources" on public.standard_sources for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_standard_clauses" on public.standard_clauses for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_disclosure_items" on public.disclosure_items for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_report_sections" on public.report_sections for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_risk_findings" on public.risk_findings for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role_full_access_indicator_indexes" on public.indicator_indexes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
