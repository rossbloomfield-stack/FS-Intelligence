create extension if not exists vector with schema extensions;

alter table public.sources add column if not exists source_key text;
alter table public.sources add column if not exists registry_kind text not null default 'document';
alter table public.sources add column if not exists canonical_domain text;
alter table public.sources add column if not exists source_class text;
alter table public.sources add column if not exists categorisation text;
alter table public.sources add column if not exists signal_type text;
alter table public.sources add column if not exists geography text;
alter table public.sources add column if not exists priority text;
alter table public.sources add column if not exists source_weight numeric(4,3);
alter table public.sources add column if not exists registry_status text not null default 'catalogued';
alter table public.sources add column if not exists registry_active boolean not null default false;
alter table public.sources add column if not exists access_licensing_note text;
alter table public.sources add column if not exists storage_policy text;
alter table public.sources add column if not exists implementation_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_registry_kind_check'
      and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources add constraint sources_registry_kind_check
      check (registry_kind in ('document','parent_source'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_signal_type_check'
      and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources add constraint sources_signal_type_check
      check (signal_type is null or signal_type in ('hard','soft'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_priority_check'
      and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources add constraint sources_priority_check
      check (priority is null or priority in ('P0','P1','P2','P3'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_weight_check'
      and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources add constraint sources_weight_check
      check (source_weight is null or source_weight between 0 and 1);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_registry_status_check'
      and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources add constraint sources_registry_status_check
      check (registry_status in ('catalogued','approved','disabled'));
  end if;
end $$;

create unique index if not exists sources_source_key_key on public.sources (source_key);
create index if not exists sources_registry_lookup_idx on public.sources (registry_kind,registry_status,priority) where registry_kind='parent_source';
create index if not exists sources_registry_category_idx on public.sources (categorisation,geography) where registry_active;

create table public.source_connectors (
  id bigint generated always as identity primary key,
  source_id uuid not null unique references public.sources(id) on delete cascade,
  ingestion_route text not null,
  primary_endpoint_url text not null,
  api_docs_url text,
  reporting_archive_url text,
  endpoint_status text not null,
  candidate_sitemap_url text,
  robots_url text,
  expected_formats text[] not null default '{}',
  recommended_cadence text not null,
  historical_backfill text,
  parser_strategy text not null,
  deduplication_key text not null,
  endpoint_verified boolean not null default false,
  terms_review_required boolean not null default true,
  approved_for_fetch boolean not null default false,
  enabled boolean not null default false,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_attempted_at timestamptz,
  last_succeeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not enabled or approved_for_fetch)
);

create table public.reference_targets (
  id bigint generated always as identity primary key,
  reference_key text not null unique,
  source_id uuid not null references public.sources(id) on delete cascade,
  title text not null,
  url text not null,
  content_type text not null,
  date_catalogued date,
  categorisation text not null,
  signal_type text not null check (signal_type in ('hard','soft')),
  geography text not null,
  priority text not null check (priority in ('P0','P1','P2','P3')),
  reference_year integer,
  reference_stream text not null,
  record_type text not null,
  resolution_status text not null,
  ingestion_url text not null,
  fetch_method text not null,
  target_discovery_rule text,
  connector_source_class text,
  endpoint_status text,
  expected_formats text[] not null default '{}',
  parser_strategy text,
  recommended_cadence text,
  historical_backfill text,
  access_licensing_note text,
  storage_policy text,
  ingestion_readiness text not null,
  readiness_grade text not null check (readiness_grade in ('A','B','C')),
  readiness_reason text,
  deduplication_key text not null,
  reference_weight numeric(4,3) not null check (reference_weight between 0 and 1),
  publication_date_required boolean not null default true,
  effective_date_required boolean not null default false,
  approved_for_fetch boolean not null default false,
  enabled boolean not null default false,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not enabled or approved_for_fetch),
  check (readiness_grade <> 'C' or not approved_for_fetch)
);

create table public.source_registry_imports (
  id bigint generated always as identity primary key,
  import_key text not null unique,
  workbook_name text not null,
  workbook_sha256 text not null,
  status text not null check (status in ('running','completed','failed')),
  dry_run boolean not null default true,
  source_count integer not null default 0 check (source_count >= 0),
  target_count integer not null default 0 check (target_count >= 0),
  ready_count integer not null default 0 check (ready_count >= 0),
  discovery_count integer not null default 0 check (discovery_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  validation_errors jsonb not null default '[]',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  parent_source_id uuid not null references public.sources(id) on delete cascade,
  reference_target_id bigint references public.reference_targets(id) on delete set null,
  evidence_source_id uuid references public.sources(id) on delete set null,
  item_key text not null unique,
  canonical_url text not null,
  title text not null,
  content_type text not null,
  publication_date date,
  effective_date date,
  announcement_date date,
  factual_summary text,
  extracted_facts jsonb not null default '[]',
  raw_storage_path text,
  content_hash text,
  fetch_status text not null default 'discovered' check (fetch_status in ('discovered','fetched','parsed','rejected','failed')),
  rejection_reason text,
  evidence_classification text,
  approved boolean not null default false,
  fetched_at timestamptz,
  last_verified_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_chunks (
  id bigint generated always as identity primary key,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 12000),
  content_hash text not null,
  token_count integer check (token_count is null or token_count >= 0),
  page_number integer check (page_number is null or page_number > 0),
  section_label text,
  claim_type text,
  embedding extensions.vector,
  embedding_model text,
  embedding_dimensions integer check (embedding_dimensions is null or embedding_dimensions > 0),
  search_vector tsvector generated always as (
    to_tsvector('english',coalesce(section_label,'') || ' ' || content)
  ) stored,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source_item_id,chunk_index),
  unique (source_item_id,content_hash)
);

create table public.source_item_organisations (
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  relationship text not null default 'mentioned' check (relationship in ('publisher','subject','mentioned','counterparty')),
  primary key (source_item_id,organisation_id,relationship)
);

create table public.intelligence_signals (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  title text not null,
  summary text not null,
  categorisation text not null,
  signal_type text not null check (signal_type in ('hard','soft')),
  geography text not null,
  organisation_id uuid references public.organisations(id) on delete set null,
  event_date date,
  publication_date date not null,
  effective_date date,
  materiality_score smallint check (materiality_score between 1 and 5),
  confidence public.intelligence_confidence not null default 'insufficient',
  analyst_interpretation text,
  ireland_read_across text,
  status text not null default 'active' check (status in ('active','resolved','rejected')),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intelligence_signal_sources (
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  support_strength text not null check (support_strength in ('direct','corroborating','contextual','counter')),
  claim_supported text not null,
  primary key (signal_id,source_item_id,claim_supported)
);

create table public.source_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  execution_key text not null unique,
  connector_id bigint references public.source_connectors(id) on delete set null,
  reference_target_id bigint references public.reference_targets(id) on delete set null,
  run_type text not null check (run_type in ('connector','target','backfill','verification')),
  status text not null check (status in ('queued','running','completed','partial','failed','blocked')),
  attempt integer not null default 1 check (attempt > 0),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  parsed_count integer not null default 0 check (parsed_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  bytes_fetched bigint not null default 0 check (bytes_fetched >= 0),
  estimated_cost_eur numeric(12,4),
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.source_ingestion_failures (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.source_ingestion_runs(id) on delete cascade,
  source_url text,
  stage text not null,
  error_code text,
  error_message text not null,
  retryable boolean not null default false,
  created_at timestamptz not null default now()
);

create index source_connectors_fetch_idx on public.source_connectors (enabled,approved_for_fetch,recommended_cadence) where enabled;
create index reference_targets_source_idx on public.reference_targets (source_id,readiness_grade,enabled);
create index reference_targets_fetch_idx on public.reference_targets (enabled,priority,reference_year) where enabled;
create index reference_targets_ingestion_url_idx on public.reference_targets (ingestion_url);
create index source_items_parent_idx on public.source_items (parent_source_id,publication_date desc);
create index source_items_target_idx on public.source_items (reference_target_id) where reference_target_id is not null;
create index source_items_evidence_source_idx on public.source_items (evidence_source_id) where evidence_source_id is not null;
create index source_items_approved_idx on public.source_items (publication_date desc,parent_source_id) where approved;
create index source_items_metadata_gin on public.source_items using gin (metadata jsonb_path_ops);
create index source_chunks_item_idx on public.source_chunks (source_item_id,chunk_index);
create index source_chunks_search_idx on public.source_chunks using gin (search_vector);
create index source_item_organisations_org_idx on public.source_item_organisations (organisation_id,source_item_id);
create index intelligence_signals_current_idx on public.intelligence_signals (status,publication_date desc,materiality_score desc) where approved;
create index intelligence_signals_org_idx on public.intelligence_signals (organisation_id,publication_date desc) where organisation_id is not null and approved;
create index intelligence_signal_sources_item_idx on public.intelligence_signal_sources (source_item_id,signal_id);
create index source_ingestion_runs_connector_idx on public.source_ingestion_runs (connector_id,created_at desc) where connector_id is not null;
create index source_ingestion_runs_target_idx on public.source_ingestion_runs (reference_target_id,created_at desc) where reference_target_id is not null;
create index source_ingestion_runs_status_idx on public.source_ingestion_runs (status,created_at desc);
create index source_ingestion_failures_run_idx on public.source_ingestion_failures (run_id,created_at);

alter table public.source_connectors enable row level security;
alter table public.reference_targets enable row level security;
alter table public.source_registry_imports enable row level security;
alter table public.source_items enable row level security;
alter table public.source_chunks enable row level security;
alter table public.source_item_organisations enable row level security;
alter table public.intelligence_signals enable row level security;
alter table public.intelligence_signal_sources enable row level security;
alter table public.source_ingestion_runs enable row level security;
alter table public.source_ingestion_failures enable row level security;

create policy source_connectors_admin_read on public.source_connectors for select to authenticated using ((select public.is_admin()));
create policy source_connectors_admin_insert on public.source_connectors for insert to authenticated with check ((select public.is_admin()));
create policy source_connectors_admin_update on public.source_connectors for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_connectors_admin_delete on public.source_connectors for delete to authenticated using ((select public.is_admin()));
create policy reference_targets_admin_read on public.reference_targets for select to authenticated using ((select public.is_admin()));
create policy reference_targets_admin_insert on public.reference_targets for insert to authenticated with check ((select public.is_admin()));
create policy reference_targets_admin_update on public.reference_targets for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy reference_targets_admin_delete on public.reference_targets for delete to authenticated using ((select public.is_admin()));
create policy source_registry_imports_admin_read on public.source_registry_imports for select to authenticated using ((select public.is_admin()));
create policy source_registry_imports_admin_insert on public.source_registry_imports for insert to authenticated with check ((select public.is_admin()));
create policy source_registry_imports_admin_update on public.source_registry_imports for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_registry_imports_admin_delete on public.source_registry_imports for delete to authenticated using ((select public.is_admin()));
create policy source_items_read on public.source_items for select to authenticated using (approved or (select public.is_admin()));
create policy source_items_admin_insert on public.source_items for insert to authenticated with check ((select public.is_admin()));
create policy source_items_admin_update on public.source_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_items_admin_delete on public.source_items for delete to authenticated using ((select public.is_admin()));
create policy source_chunks_read on public.source_chunks for select to authenticated using (
  exists (select 1 from public.source_items item where item.id=source_item_id and (item.approved or (select public.is_admin())))
);
create policy source_chunks_admin_insert on public.source_chunks for insert to authenticated with check ((select public.is_admin()));
create policy source_chunks_admin_update on public.source_chunks for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_chunks_admin_delete on public.source_chunks for delete to authenticated using ((select public.is_admin()));
create policy source_item_organisations_read on public.source_item_organisations for select to authenticated using (
  exists (select 1 from public.source_items item where item.id=source_item_id and (item.approved or (select public.is_admin())))
);
create policy source_item_organisations_admin_insert on public.source_item_organisations for insert to authenticated with check ((select public.is_admin()));
create policy source_item_organisations_admin_update on public.source_item_organisations for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_item_organisations_admin_delete on public.source_item_organisations for delete to authenticated using ((select public.is_admin()));
create policy intelligence_signals_read on public.intelligence_signals for select to authenticated using (approved or (select public.is_admin()));
create policy intelligence_signals_admin_insert on public.intelligence_signals for insert to authenticated with check ((select public.is_admin()));
create policy intelligence_signals_admin_update on public.intelligence_signals for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy intelligence_signals_admin_delete on public.intelligence_signals for delete to authenticated using ((select public.is_admin()));
create policy intelligence_signal_sources_read on public.intelligence_signal_sources for select to authenticated using (
  exists (select 1 from public.intelligence_signals signal where signal.id=signal_id and (signal.approved or (select public.is_admin())))
);
create policy intelligence_signal_sources_admin_insert on public.intelligence_signal_sources for insert to authenticated with check ((select public.is_admin()));
create policy intelligence_signal_sources_admin_update on public.intelligence_signal_sources for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy intelligence_signal_sources_admin_delete on public.intelligence_signal_sources for delete to authenticated using ((select public.is_admin()));
create policy source_ingestion_runs_admin_read on public.source_ingestion_runs for select to authenticated using ((select public.is_admin()));
create policy source_ingestion_runs_admin_insert on public.source_ingestion_runs for insert to authenticated with check ((select public.is_admin()));
create policy source_ingestion_runs_admin_update on public.source_ingestion_runs for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_ingestion_runs_admin_delete on public.source_ingestion_runs for delete to authenticated using ((select public.is_admin()));
create policy source_ingestion_failures_admin_read on public.source_ingestion_failures for select to authenticated using ((select public.is_admin()));
create policy source_ingestion_failures_admin_insert on public.source_ingestion_failures for insert to authenticated with check ((select public.is_admin()));
create policy source_ingestion_failures_admin_update on public.source_ingestion_failures for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy source_ingestion_failures_admin_delete on public.source_ingestion_failures for delete to authenticated using ((select public.is_admin()));

create trigger set_source_connectors_updated_at before update on public.source_connectors for each row execute function public.set_updated_at();
create trigger set_reference_targets_updated_at before update on public.reference_targets for each row execute function public.set_updated_at();
create trigger set_source_items_updated_at before update on public.source_items for each row execute function public.set_updated_at();
create trigger set_intelligence_signals_updated_at before update on public.intelligence_signals for each row execute function public.set_updated_at();

grant select on public.source_connectors,public.reference_targets,public.source_registry_imports,
  public.source_items,public.source_chunks,public.source_item_organisations,
  public.intelligence_signals,public.intelligence_signal_sources,
  public.source_ingestion_runs,public.source_ingestion_failures to authenticated;
grant insert,update,delete on public.source_connectors,public.reference_targets,public.source_registry_imports,
  public.source_items,public.source_chunks,public.source_item_organisations,
  public.intelligence_signals,public.intelligence_signal_sources,
  public.source_ingestion_runs,public.source_ingestion_failures to authenticated;
grant usage,select on sequence public.source_connectors_id_seq,public.reference_targets_id_seq,
  public.source_registry_imports_id_seq,public.source_chunks_id_seq,public.source_ingestion_failures_id_seq to authenticated;
