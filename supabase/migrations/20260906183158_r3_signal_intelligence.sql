-- R3 Signal Intelligence
-- Additive evidence -> observation -> signal infrastructure. Existing R1/R2
-- evidence and the intelligence_signals table remain the canonical foundations.

create table public.source_item_versions (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content_hash text not null,
  canonical_url text not null,
  title text not null,
  publication_date date,
  effective_date date,
  announcement_date date,
  change_classification text not null default 'unknown'
    check (change_classification in ('none','cosmetic','minor','material','unknown')),
  previous_version_id uuid references public.source_item_versions(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source_item_id, version_number),
  unique (source_item_id, content_hash)
);

insert into public.source_item_versions (
  source_item_id, version_number, content_hash, canonical_url, title,
  publication_date, effective_date, announcement_date, change_classification,
  metadata
)
select item.id, 1, coalesce(item.content_hash, encode(digest(item.item_key, 'sha256'), 'hex')),
  item.canonical_url, item.title, item.publication_date, item.effective_date,
  item.announcement_date, 'unknown', jsonb_build_object('backfilledBy', 'R3')
from public.source_items item
on conflict (source_item_id, content_hash) do nothing;

create table public.intelligence_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'organisation','brand','product','technology','vendor','executive','regulation'
  )),
  canonical_name text not null,
  canonical_key text not null unique,
  organisation_id uuid references public.organisations(id) on delete set null,
  geography text,
  identifiers jsonb not null default '{}',
  metadata jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index intelligence_entities_organisation_key
  on public.intelligence_entities (organisation_id)
  where organisation_id is not null and entity_type='organisation';

create table public.intelligence_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.intelligence_entities(id) on delete cascade,
  alias text not null,
  normalised_alias text generated always as (lower(regexp_replace(trim(alias), '\\s+', ' ', 'g'))) stored,
  geography text,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  unique (entity_id, normalised_alias)
);

insert into public.intelligence_entities (
  entity_type, canonical_name, canonical_key, organisation_id, geography, metadata
)
select 'organisation', organisation.name, 'organisation:' || organisation.slug,
  organisation.id, organisation.jurisdiction, jsonb_build_object('seededFrom', 'organisations')
from public.organisations organisation
on conflict (canonical_key) do update set
  canonical_name=excluded.canonical_name,
  organisation_id=excluded.organisation_id,
  geography=excluded.geography,
  updated_at=now();

insert into public.intelligence_entity_aliases (entity_id, alias, valid_from, valid_to)
select entity.id, alias.alias, alias.valid_from, alias.valid_to
from public.organisation_aliases alias
join public.intelligence_entities entity on entity.organisation_id=alias.organisation_id
on conflict (entity_id, normalised_alias) do nothing;

insert into public.intelligence_entity_aliases (entity_id, alias)
select entity.id, entity.canonical_name
from public.intelligence_entities entity
on conflict (entity_id, normalised_alias) do nothing;

create table public.signal_taxonomy (
  key text primary key,
  category text not null check (category in ('observation_type','event_type','theme','capability')),
  label text not null,
  description text,
  materiality_weight numeric(5,4) not null default 0.5 check (materiality_weight between 0 and 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.strategic_theme_configuration (
  theme_key text primary key,
  name text not null,
  description text,
  priority_weight numeric(5,4) not null default 0.5 check (priority_weight between 0 and 1),
  organisation_scope uuid[] not null default '{}',
  market_scope text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intelligence_entity_groups (
  id uuid primary key default gen_random_uuid(),
  group_key text not null unique,
  name text not null,
  group_type text not null check (group_type in (
    'direct_competitor','adjacent_competitor','international_benchmark',
    'technology_provider','regulator','industry_body'
  )),
  relevance_weight numeric(5,4) not null default 0.5 check (relevance_weight between 0 and 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intelligence_entity_group_members (
  group_id uuid not null references public.intelligence_entity_groups(id) on delete cascade,
  entity_id uuid not null references public.intelligence_entities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, entity_id)
);

create table public.signal_processing_runs (
  id uuid primary key default gen_random_uuid(),
  execution_key text not null unique,
  source_item_id uuid references public.source_items(id) on delete set null,
  document_version_id uuid references public.source_item_versions(id) on delete set null,
  stage text not null check (stage in (
    'evidence_ready','signal_eligibility','observation_extracting','entity_resolving',
    'observation_validating','signal_matching','signal_scoring','complete','failed','skipped'
  )),
  status text not null check (status in ('queued','running','completed','failed','skipped','needs_review')),
  eligibility_result jsonb not null default '{}',
  observations_extracted integer not null default 0 check (observations_extracted >= 0),
  observations_rejected integer not null default 0 check (observations_rejected >= 0),
  signals_created integer not null default 0 check (signals_created >= 0),
  signals_updated integer not null default 0 check (signals_updated >= 0),
  duplicates_suppressed integer not null default 0 check (duplicates_suppressed >= 0),
  unresolved_entities integer not null default 0 check (unresolved_entities >= 0),
  contradiction_count integer not null default 0 check (contradiction_count >= 0),
  model_calls integer not null default 0 check (model_calls >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(12,6),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  extraction_model text,
  extraction_version text,
  schema_version text,
  error_message text,
  metadata jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intelligence_observations (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  document_id uuid not null references public.source_items(id) on delete cascade,
  document_version_id uuid not null references public.source_item_versions(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  evidence_chunk_id bigint references public.source_chunks(id) on delete set null,
  processing_run_id uuid references public.signal_processing_runs(id) on delete set null,
  entity_id uuid references public.intelligence_entities(id) on delete set null,
  raw_entity_text text,
  entity_resolution_confidence numeric(5,4) check (entity_resolution_confidence between 0 and 1),
  observation_type text not null,
  event_type text,
  theme text,
  capability text,
  product text,
  market text,
  geography text,
  observation_text text not null,
  evidence_text text not null check (char_length(evidence_text) between 1 and 4000),
  evidence_section_label text,
  evidence_page_number integer check (evidence_page_number is null or evidence_page_number > 0),
  evidence_start integer,
  evidence_end integer,
  metric_name text,
  metric_value numeric,
  metric_unit text,
  metric_currency text,
  metric_period text,
  metric_scope text,
  previous_value numeric,
  direction text check (direction is null or direction in (
    'increasing','decreasing','new','expanding','contracting','stable','mixed','unknown'
  )),
  event_date date,
  published_at date,
  extracted_at timestamptz not null default now(),
  extraction_confidence numeric(5,4) not null check (extraction_confidence between 0 and 1),
  evidence_directness numeric(5,4) not null check (evidence_directness between 0 and 1),
  source_authority numeric(5,4) not null check (source_authority between 0 and 1),
  is_primary_source boolean not null default false,
  is_independent_source boolean not null default true,
  source_family_key text,
  model_version text not null,
  prompt_version text not null,
  extraction_version text not null,
  schema_version text not null,
  review_status text not null default 'candidate' check (review_status in (
    'candidate','accepted','rejected','needs_review'
  )),
  rejection_reason text,
  materiality_score numeric(5,4) check (materiality_score between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (evidence_start is null or evidence_start >= 0),
  check (evidence_end is null or evidence_start is null or evidence_end > evidence_start)
);

create table public.intelligence_observation_entities (
  observation_id uuid not null references public.intelligence_observations(id) on delete cascade,
  entity_id uuid not null references public.intelligence_entities(id) on delete cascade,
  relationship text not null default 'subject' check (relationship in ('primary','subject','counterparty','mentioned')),
  resolution_confidence numeric(5,4) check (resolution_confidence between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (observation_id, entity_id, relationship)
);

alter table public.intelligence_signals
  add column if not exists primary_entity_id uuid references public.intelligence_entities(id) on delete set null,
  add column if not exists entity_ids uuid[] not null default '{}',
  add column if not exists themes text[] not null default '{}',
  add column if not exists capabilities text[] not null default '{}',
  add column if not exists markets text[] not null default '{}',
  add column if not exists geographies text[] not null default '{}',
  add column if not exists products text[] not null default '{}',
  add column if not exists first_observed_at timestamptz,
  add column if not exists last_observed_at timestamptz,
  add column if not exists novelty numeric(5,4),
  add column if not exists confidence_score numeric(5,2),
  add column if not exists confidence_components jsonb not null default '{}',
  add column if not exists source_authority_score numeric(5,4),
  add column if not exists corroboration_count integer not null default 0,
  add column if not exists independent_source_count integer not null default 0,
  add column if not exists contradiction_count integer not null default 0,
  add column if not exists strategic_relevance numeric(5,4),
  add column if not exists relevance_components jsonb not null default '{}',
  add column if not exists momentum numeric(5,4),
  add column if not exists signal_score numeric(6,3),
  add column if not exists reasoning_summary text,
  add column if not exists supersedes_signal_id uuid references public.intelligence_signals(id) on delete set null,
  add column if not exists extraction_version text,
  add column if not exists lifecycle_status text,
  add column if not exists expires_at timestamptz,
  add column if not exists important boolean not null default false;

alter table public.intelligence_signals drop constraint if exists intelligence_signals_status_check;
alter table public.intelligence_signals add constraint intelligence_signals_status_check
  check (status in ('emerging','active','confirmed','mature','superseded','contradicted','expired','dismissed','resolved','rejected'));
alter table public.intelligence_signals drop constraint if exists intelligence_signals_direction_check;
alter table public.intelligence_signals add constraint intelligence_signals_direction_check
  check (direction is null or direction in ('new','up','unchanged','down','resolved','increasing','decreasing','expanding','contracting','stable','mixed','unknown'));
alter table public.intelligence_signals drop constraint if exists intelligence_signals_magnitude_check;
alter table public.intelligence_signals add constraint intelligence_signals_magnitude_check
  check (magnitude is null or magnitude in ('unknown','minimal','low','moderate','high','transformational'));
alter table public.intelligence_signals add constraint intelligence_signals_novelty_check
  check (novelty is null or novelty between 0 and 1);
alter table public.intelligence_signals add constraint intelligence_signals_confidence_score_check
  check (confidence_score is null or confidence_score between 0 and 100);
alter table public.intelligence_signals add constraint intelligence_signals_source_authority_score_check
  check (source_authority_score is null or source_authority_score between 0 and 1);
alter table public.intelligence_signals add constraint intelligence_signals_strategic_relevance_check
  check (strategic_relevance is null or strategic_relevance between 0 and 1);
alter table public.intelligence_signals add constraint intelligence_signals_momentum_check
  check (momentum is null or momentum between 0 and 1);
alter table public.intelligence_signals add constraint intelligence_signals_signal_score_check
  check (signal_score is null or signal_score between 0 and 100);
alter table public.intelligence_signals add constraint intelligence_signals_counts_check
  check (corroboration_count >= 0 and independent_source_count >= 0 and contradiction_count >= 0);

update public.intelligence_signals signal
set primary_entity_id=entity.id,
    entity_ids=array[entity.id],
    themes=case when signal.signal_family is null then '{}'::text[] else array[signal.signal_family] end,
    geographies=array[signal.geography],
    first_observed_at=coalesce(signal.created_at, signal.publication_date::timestamptz),
    last_observed_at=coalesce(signal.updated_at, signal.publication_date::timestamptz),
    novelty=coalesce(signal.novelty_score / 5.0, 0.5),
    confidence_score=case signal.confidence when 'high' then 80 when 'medium' then 60 when 'low' then 40 else 20 end,
    source_authority_score=signal.authority_score,
    strategic_relevance=coalesce(signal.impact_score / 5.0, signal.materiality_score / 5.0),
    signal_score=coalesce(signal.composite_score * 20, signal.materiality_score * 20),
    lifecycle_status=signal.status,
    extraction_version=coalesce(signal.extraction_version, 'legacy-pilot')
from public.intelligence_entities entity
where signal.organisation_id=entity.organisation_id;

create table public.intelligence_signal_observations (
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  relationship text not null check (relationship in ('supporting','corroborating','contextual','contradictory')),
  support_strength numeric(5,4) not null default 1 check (support_strength between 0 and 1),
  added_at timestamptz not null default now(),
  primary key (signal_id, observation_id)
);

create table public.intelligence_signal_revisions (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  change_reason text not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (signal_id, revision_number)
);

create table public.intelligence_signal_contradictions (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  contradiction_type text not null check (contradiction_type in ('direct','temporal','geographic','definition','mixed')),
  weight numeric(5,4) not null check (weight between 0 and 1),
  rationale text not null,
  resolution_status text not null default 'open' check (resolution_status in ('open','resolved','accepted_mixed','invalid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (signal_id, observation_id)
);

create table public.intelligence_signal_feedback (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feedback_type text not null check (feedback_type in (
    'useful','not_useful','incorrect','duplicate','important','wrong_entity','wrong_classification'
  )),
  note text,
  created_at timestamptz not null default now()
);

create table public.intelligence_signal_review_events (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references public.intelligence_signals(id) on delete set null,
  observation_id uuid references public.intelligence_observations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now(),
  check (signal_id is not null or observation_id is not null)
);

create table public.signal_evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null unique,
  source_category text not null,
  evidence_text text not null,
  expected jsonb not null,
  adversarial boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.signal_evaluation_results (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.signal_evaluation_cases(id) on delete cascade,
  run_key text not null,
  result jsonb not null,
  human_outcome text check (human_outcome is null or human_outcome in (
    'correct','partially_correct','incorrect','unsupported','duplicate','missed'
  )),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id, run_key)
);

insert into public.signal_taxonomy (key, category, label, materiality_weight)
select value, 'observation_type', initcap(replace(value, '_', ' ')),
  case when value in ('strategic_change','investment_priority','market_entry','market_exit','acquisition','merger','regulation_finalised','regulatory_enforcement','product_launch','technology_investment') then 0.9 else 0.65 end
from unnest(array[
  'strategic_priority','strategic_change','investment_priority','market_entry','market_exit','growth_target','transformation_programme',
  'product_launch','product_change','product_withdrawal','proposition_change','pricing_change','feature_launch','feature_change','customer_journey_change','digital_service_change',
  'technology_adoption','platform_change','ai_adoption','data_capability','automation','technology_investment','vendor_selection','implementation',
  'partnership','supplier_relationship','distribution_agreement','technology_relationship','ecosystem_relationship',
  'acquisition','disposal','merger','funding','financial_performance','cost_change','organisational_change',
  'executive_appointment','executive_departure','hiring_activity','capability_hiring','team_expansion','restructuring',
  'customer_growth','customer_decline','adoption_change','digital_adoption','customer_satisfaction','customer_complaint','engagement_change',
  'regulation_proposed','regulation_finalised','implementation_deadline','regulatory_guidance','regulatory_enforcement','supervisory_priority','regulatory_risk',
  'market_growth','market_decline','market_share_change','consumer_behaviour_change','technology_trend','distribution_change',
  'webpage_change','navigation_change','proposition_language_change','app_update','pricing_page_change','careers_change'
]) value
on conflict (key) do nothing;

insert into public.strategic_theme_configuration (theme_key, name, priority_weight)
select value, initcap(replace(value, '_', ' ')),
  case when value in ('digital_advice','ai','customer_experience','digital_distribution','data_personalisation','regulatory_change','wealth','pensions','protection','health') then 0.9 else 0.7 end
from unnest(array[
  'digital_advice','ai','customer_experience','customer_engagement','financial_wellness',
  'digital_distribution','self_service','data_personalisation','digital_transformation',
  'technology_modernisation','regulatory_change','open_finance','digital_acquisition',
  'automation','operating_efficiency','employer_propositions','wealth','pensions',
  'protection','health','embedded_conversational_distribution'
]) value
on conflict (theme_key) do nothing;

create index source_item_versions_item_idx on public.source_item_versions (source_item_id, version_number desc);
create index intelligence_entities_type_name_idx on public.intelligence_entities (entity_type, canonical_name);
create index intelligence_entity_aliases_lookup_idx on public.intelligence_entity_aliases (normalised_alias);
create index signal_processing_runs_queue_idx on public.signal_processing_runs (status, stage, created_at) where status in ('queued','running','needs_review');
create index signal_processing_runs_document_idx on public.signal_processing_runs (document_version_id, created_at desc);
create index intelligence_observations_document_idx on public.intelligence_observations (document_version_id, created_at desc);
create index intelligence_observations_entity_idx on public.intelligence_observations (entity_id, event_date desc nulls last);
create index intelligence_observations_type_idx on public.intelligence_observations (observation_type, event_date desc nulls last);
create index intelligence_observations_theme_idx on public.intelligence_observations (theme, event_date desc nulls last) where theme is not null;
create index intelligence_observations_review_idx on public.intelligence_observations (review_status, created_at desc);
create index intelligence_signal_observations_observation_idx on public.intelligence_signal_observations (observation_id, signal_id);
create index intelligence_signals_r3_rank_idx on public.intelligence_signals (signal_score desc, last_observed_at desc) where approved and status in ('emerging','active','confirmed','mature','contradicted');
create index intelligence_signals_r3_entity_idx on public.intelligence_signals using gin (entity_ids);
create index intelligence_signals_r3_themes_idx on public.intelligence_signals using gin (themes);
create index intelligence_signals_r3_geographies_idx on public.intelligence_signals using gin (geographies);
create index intelligence_signals_r3_status_idx on public.intelligence_signals (status, confidence_score desc, last_observed_at desc);
create index intelligence_signal_revisions_signal_idx on public.intelligence_signal_revisions (signal_id, revision_number desc);
create index intelligence_signal_contradictions_signal_idx on public.intelligence_signal_contradictions (signal_id, resolution_status);
create index intelligence_signal_feedback_signal_idx on public.intelligence_signal_feedback (signal_id, created_at desc);
create index intelligence_signal_review_events_signal_idx on public.intelligence_signal_review_events (signal_id, created_at desc);

create or replace function public.search_approved_intelligence_signals(
  search_query text,
  requested_entity_ids uuid[] default '{}',
  requested_themes text[] default '{}',
  requested_geographies text[] default '{}',
  minimum_confidence numeric default 30,
  minimum_relevance numeric default 0,
  published_after date default null,
  result_limit integer default 20
)
returns table (
  signal_id uuid,
  title text,
  summary text,
  signal_type text,
  status text,
  direction text,
  event_date date,
  first_observed_at timestamptz,
  last_observed_at timestamptz,
  confidence_score numeric,
  strategic_relevance numeric,
  novelty numeric,
  magnitude text,
  momentum numeric,
  signal_score numeric,
  entity_ids uuid[],
  themes text[],
  capabilities text[],
  geographies text[],
  corroboration_count integer,
  independent_source_count integer,
  contradiction_count integer,
  reasoning_summary text,
  relevance real
)
language sql stable security invoker set search_path=''
as $$
  with query as (
    select websearch_to_tsquery('english', left(trim(search_query), 1000)) value
  )
  select signal.id, signal.title, signal.summary, signal.signal_type, signal.status,
    signal.direction, signal.event_date, signal.first_observed_at, signal.last_observed_at,
    signal.confidence_score, signal.strategic_relevance, signal.novelty, signal.magnitude,
    signal.momentum, signal.signal_score, signal.entity_ids, signal.themes,
    signal.capabilities, signal.geographies, signal.corroboration_count,
    signal.independent_source_count, signal.contradiction_count, signal.reasoning_summary,
    (ts_rank_cd(to_tsvector('english', signal.title || ' ' || signal.summary || ' ' || array_to_string(signal.themes, ' ')), query.value)
      + coalesce(signal.signal_score, 0)::real / 500.0)::real relevance
  from public.intelligence_signals signal cross join query
  where signal.approved
    and signal.status in ('emerging','active','confirmed','mature','contradicted')
    and coalesce(signal.confidence_score, 0) >= minimum_confidence
    and coalesce(signal.strategic_relevance, 0) >= minimum_relevance
    and (cardinality(requested_entity_ids)=0 or signal.entity_ids && requested_entity_ids)
    and (cardinality(requested_themes)=0 or signal.themes && requested_themes)
    and (cardinality(requested_geographies)=0 or signal.geographies && requested_geographies)
    and (published_after is null or coalesce(signal.event_date, signal.publication_date) >= published_after)
    and (trim(search_query)='' or to_tsvector('english', signal.title || ' ' || signal.summary || ' ' || array_to_string(signal.themes, ' ')) @@ query.value)
  order by relevance desc, signal.signal_score desc nulls last, signal.last_observed_at desc nulls last
  limit least(greatest(result_limit, 1), 100);
$$;

alter table public.source_item_versions enable row level security;
alter table public.intelligence_entities enable row level security;
alter table public.intelligence_entity_aliases enable row level security;
alter table public.signal_taxonomy enable row level security;
alter table public.strategic_theme_configuration enable row level security;
alter table public.intelligence_entity_groups enable row level security;
alter table public.intelligence_entity_group_members enable row level security;
alter table public.signal_processing_runs enable row level security;
alter table public.intelligence_observations enable row level security;
alter table public.intelligence_observation_entities enable row level security;
alter table public.intelligence_signal_observations enable row level security;
alter table public.intelligence_signal_revisions enable row level security;
alter table public.intelligence_signal_contradictions enable row level security;
alter table public.intelligence_signal_feedback enable row level security;
alter table public.intelligence_signal_review_events enable row level security;
alter table public.signal_evaluation_cases enable row level security;
alter table public.signal_evaluation_results enable row level security;

create policy source_item_versions_read on public.source_item_versions for select to authenticated using (
  exists (select 1 from public.source_items item where item.id=source_item_id and (item.approved or (select public.is_admin())))
);
create policy intelligence_entities_read on public.intelligence_entities for select to authenticated using (active or (select public.is_admin()));
create policy intelligence_entity_aliases_read on public.intelligence_entity_aliases for select to authenticated using (
  exists (select 1 from public.intelligence_entities entity where entity.id=entity_id and (entity.active or (select public.is_admin())))
);
create policy signal_taxonomy_read on public.signal_taxonomy for select to authenticated using (active or (select public.is_admin()));
create policy strategic_theme_configuration_read on public.strategic_theme_configuration for select to authenticated using (active or (select public.is_admin()));
create policy intelligence_entity_groups_admin_read on public.intelligence_entity_groups for select to authenticated using ((select public.is_admin()));
create policy intelligence_entity_group_members_admin_read on public.intelligence_entity_group_members for select to authenticated using ((select public.is_admin()));
create policy signal_processing_runs_admin_read on public.signal_processing_runs for select to authenticated using ((select public.is_admin()));
create policy intelligence_observations_read on public.intelligence_observations for select to authenticated using (
  review_status='accepted' or (select public.is_admin())
);
create policy intelligence_observation_entities_read on public.intelligence_observation_entities for select to authenticated using (
  exists (select 1 from public.intelligence_observations observation where observation.id=observation_id and (observation.review_status='accepted' or (select public.is_admin())))
);
create policy intelligence_signal_observations_read on public.intelligence_signal_observations for select to authenticated using (
  exists (select 1 from public.intelligence_signals signal where signal.id=signal_id and (signal.approved or (select public.is_admin())))
);
create policy intelligence_signal_revisions_admin_read on public.intelligence_signal_revisions for select to authenticated using ((select public.is_admin()));
create policy intelligence_signal_contradictions_read on public.intelligence_signal_contradictions for select to authenticated using (
  exists (select 1 from public.intelligence_signals signal where signal.id=signal_id and (signal.approved or (select public.is_admin())))
);
create policy intelligence_signal_feedback_own_read on public.intelligence_signal_feedback for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));
create policy intelligence_signal_feedback_own_insert on public.intelligence_signal_feedback for insert to authenticated with check (user_id=(select auth.uid()));
create policy intelligence_signal_review_events_admin_read on public.intelligence_signal_review_events for select to authenticated using ((select public.is_admin()));
create policy signal_evaluation_cases_admin_read on public.signal_evaluation_cases for select to authenticated using ((select public.is_admin()));
create policy signal_evaluation_results_admin_read on public.signal_evaluation_results for select to authenticated using ((select public.is_admin()));

revoke all on table public.source_item_versions, public.intelligence_entities,
  public.intelligence_entity_aliases, public.signal_taxonomy,
  public.strategic_theme_configuration, public.intelligence_entity_groups,
  public.intelligence_entity_group_members, public.signal_processing_runs,
  public.intelligence_observations, public.intelligence_observation_entities,
  public.intelligence_signal_observations, public.intelligence_signal_revisions,
  public.intelligence_signal_contradictions, public.intelligence_signal_feedback,
  public.intelligence_signal_review_events, public.signal_evaluation_cases,
  public.signal_evaluation_results from public, anon, authenticated;

grant select on table public.source_item_versions, public.intelligence_entities,
  public.intelligence_entity_aliases, public.signal_taxonomy,
  public.strategic_theme_configuration, public.intelligence_observations,
  public.intelligence_observation_entities, public.intelligence_signal_observations,
  public.intelligence_signal_contradictions to authenticated;
grant select, insert on table public.intelligence_signal_feedback to authenticated;

grant select, insert, update, delete on table public.source_item_versions,
  public.intelligence_entities, public.intelligence_entity_aliases,
  public.signal_taxonomy, public.strategic_theme_configuration,
  public.intelligence_entity_groups, public.intelligence_entity_group_members,
  public.signal_processing_runs, public.intelligence_observations,
  public.intelligence_observation_entities, public.intelligence_signal_observations,
  public.intelligence_signal_revisions, public.intelligence_signal_contradictions,
  public.intelligence_signal_feedback, public.intelligence_signal_review_events,
  public.signal_evaluation_cases, public.signal_evaluation_results to service_role;

revoke all on function public.search_approved_intelligence_signals(text, uuid[], text[], text[], numeric, numeric, date, integer) from public, anon;
grant execute on function public.search_approved_intelligence_signals(text, uuid[], text[], text[], numeric, numeric, date, integer) to authenticated, service_role;

create trigger set_intelligence_entities_updated_at before update on public.intelligence_entities for each row execute function public.set_updated_at();
create trigger set_signal_taxonomy_updated_at before update on public.signal_taxonomy for each row execute function public.set_updated_at();
create trigger set_strategic_theme_configuration_updated_at before update on public.strategic_theme_configuration for each row execute function public.set_updated_at();
create trigger set_intelligence_entity_groups_updated_at before update on public.intelligence_entity_groups for each row execute function public.set_updated_at();
create trigger set_signal_processing_runs_updated_at before update on public.signal_processing_runs for each row execute function public.set_updated_at();
create trigger set_intelligence_observations_updated_at before update on public.intelligence_observations for each row execute function public.set_updated_at();
create trigger set_intelligence_signal_contradictions_updated_at before update on public.intelligence_signal_contradictions for each row execute function public.set_updated_at();

comment on table public.intelligence_observations is 'R3 source-grounded facts. Each row requires a source item version and exact evidence chunk.';
comment on table public.intelligence_signals is 'Canonical longitudinal market signals assembled from accepted, evidence-grounded observations.';
comment on function public.search_approved_intelligence_signals is 'Authenticated R3 signal retrieval. Signals complement and never replace underlying R1 evidence retrieval.';
