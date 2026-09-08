-- R4 Market Knowledge Graph & Intelligence Coverage
-- Additive entity, relationship, provenance, coverage and controlled source-
-- expansion infrastructure. R1-R3 tables remain authoritative foundations.

alter table public.intelligence_entities
  drop constraint if exists intelligence_entities_entity_type_check;

alter table public.intelligence_entities
  add constraint intelligence_entities_entity_type_check check (entity_type in (
    'organisation','brand','business_unit','product','proposition','executive',
    'technology','vendor','partner','regulation','regulatory_body','market',
    'geography','strategic_theme','capability','distribution_channel'
  )),
  add column if not exists description text,
  add column if not exists parent_entity_id uuid references public.intelligence_entities(id) on delete set null,
  add column if not exists primary_geography text,
  add column if not exists markets text[] not null default '{}',
  add column if not exists website text,
  add column if not exists status text not null default 'current'
    check (status in ('current','historical','emerging','uncertain','superseded','inactive')),
  add column if not exists first_observed_at timestamptz,
  add column if not exists last_observed_at timestamptz,
  add column if not exists confidence_score numeric(5,4)
    check (confidence_score is null or confidence_score between 0 and 1);

update public.intelligence_entities entity
set primary_geography=coalesce(entity.primary_geography,entity.geography),
    first_observed_at=coalesce(entity.first_observed_at,entity.created_at),
    last_observed_at=coalesce(entity.last_observed_at,entity.updated_at),
    confidence_score=coalesce(entity.confidence_score,case when entity.organisation_id is not null then 1 else 0.75 end)
where entity.primary_geography is null
   or entity.first_observed_at is null
   or entity.last_observed_at is null
   or entity.confidence_score is null;

update public.intelligence_entities child
set parent_entity_id=parent.id,
    updated_at=now()
from public.organisations child_org
join public.organisations parent_org on parent_org.id=child_org.current_owner_id
join public.intelligence_entities parent on parent.organisation_id=parent_org.id
where child.organisation_id=child_org.id
  and child.parent_entity_id is distinct from parent.id;

create table public.intelligence_entity_type_configuration (
  entity_type text primary key,
  label text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.intelligence_entity_type_configuration (entity_type,label)
select key,initcap(replace(key,'_',' '))
from unnest(array[
  'organisation','brand','business_unit','product','proposition','executive',
  'technology','vendor','partner','regulation','regulatory_body','market',
  'geography','strategic_theme','capability','distribution_channel'
]) key
on conflict (entity_type) do nothing;

create table public.intelligence_relationship_types (
  relationship_type text primary key,
  category text not null check (category in ('corporate','product','technology','people','strategic','regulation','capability','distribution','market')),
  label text not null,
  inverse_relationship_type text,
  minimum_confidence numeric(5,4) not null default 0.62 check (minimum_confidence between 0 and 1),
  inferred_allowed boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.intelligence_relationship_types (relationship_type,category,label,inverse_relationship_type,inferred_allowed)
values
  ('OWNS','corporate','Owns','OWNED_BY',false),
  ('OWNED_BY','corporate','Owned by','OWNS',false),
  ('SUBSIDIARY_OF','corporate','Subsidiary of','OWNS',false),
  ('BRAND_OF','corporate','Brand of','OWNS',false),
  ('ACQUIRED','corporate','Acquired',null,false),
  ('MERGED_WITH','corporate','Merged with','MERGED_WITH',false),
  ('OFFERS','product','Offers','OFFERED_BY',false),
  ('OFFERED_BY','product','Offered by','OFFERS',false),
  ('PROVIDES','product','Provides','PROVIDED_BY',false),
  ('PROVIDED_BY','product','Provided by','PROVIDES',false),
  ('WITHDREW','product','Withdrew',null,false),
  ('TARGETS_SEGMENT','product','Targets segment',null,true),
  ('AVAILABLE_IN','product','Available in',null,false),
  ('USES_TECHNOLOGY','technology','Uses technology','USED_BY',false),
  ('USED_BY','technology','Used by','USES_TECHNOLOGY',false),
  ('SUPPLIED_BY','technology','Supplied by','SUPPLIES',false),
  ('SUPPLIES','technology','Supplies','SUPPLIED_BY',false),
  ('IMPLEMENTED_BY','technology','Implemented by','IMPLEMENTS_FOR',false),
  ('IMPLEMENTS_FOR','technology','Implements for','IMPLEMENTED_BY',false),
  ('PARTNERED_WITH','technology','Partnered with','PARTNERED_WITH',false),
  ('INTEGRATES_WITH','technology','Integrates with','INTEGRATES_WITH',false),
  ('WORKS_FOR','people','Works for','EMPLOYS',false),
  ('EMPLOYS','people','Employs','WORKS_FOR',false),
  ('LEADS','people','Leads','LED_BY',false),
  ('LED_BY','people','Led by','LEADS',false),
  ('APPOINTED_AS','people','Appointed as',null,false),
  ('LEFT','people','Left',null,false),
  ('INVESTING_IN','strategic','Investing in',null,true),
  ('PRIORITISES','strategic','Prioritises',null,true),
  ('BUILDING_CAPABILITY','strategic','Building capability',null,true),
  ('EXPANDING_IN','strategic','Expanding in',null,true),
  ('REDUCING_IN','strategic','Reducing in',null,true),
  ('REGULATED_BY','regulation','Regulated by','REGULATES',false),
  ('REGULATES','regulation','Regulates','REGULATED_BY',false),
  ('AFFECTED_BY','regulation','Affected by',null,true),
  ('SUBJECT_TO','regulation','Subject to',null,false),
  ('HAS_CAPABILITY','capability','Has capability',null,true),
  ('DEVELOPING_CAPABILITY','capability','Developing capability',null,true),
  ('LAUNCHED_CAPABILITY','capability','Launched capability',null,false),
  ('DISTRIBUTES_THROUGH','distribution','Distributes through',null,false),
  ('PARTNERS_WITH','distribution','Partners with','PARTNERS_WITH',false),
  ('OPERATES_IN','market','Operates in',null,false),
  ('ENTERED_MARKET','market','Entered market',null,false),
  ('EXITED_MARKET','market','Exited market',null,false)
on conflict (relationship_type) do nothing;

create table public.intelligence_relationships (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  source_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  relationship_type text not null references public.intelligence_relationship_types(relationship_type) on delete restrict,
  target_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  relationship_basis text not null check (relationship_basis in ('explicit','inferred')),
  confidence_score numeric(5,4) not null check (confidence_score between 0 and 1),
  confidence_components jsonb not null default '{}',
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  valid_from date,
  valid_to date,
  status text not null default 'current' check (status in ('current','historical','emerging','uncertain','superseded','rejected')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  independent_source_count integer not null default 0 check (independent_source_count >= 0),
  extraction_model text,
  prompt_version text,
  schema_version text,
  extraction_version text,
  reasoning_summary text,
  metadata jsonb not null default '{}',
  supersedes_relationship_id uuid references public.intelligence_relationships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_entity_id <> target_entity_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  check (last_observed_at >= first_observed_at)
);

create table public.intelligence_relationship_observations (
  relationship_id uuid not null references public.intelligence_relationships(id) on delete cascade,
  observation_id uuid not null references public.intelligence_observations(id) on delete restrict,
  evidence_role text not null default 'supporting' check (evidence_role in ('supporting','corroborating','contextual','contradictory')),
  support_strength numeric(5,4) not null default 1 check (support_strength between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (relationship_id,observation_id)
);

create table public.intelligence_relationship_signals (
  relationship_id uuid not null references public.intelligence_relationships(id) on delete cascade,
  signal_id uuid not null references public.intelligence_signals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (relationship_id,signal_id)
);

create table public.intelligence_relationship_revisions (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.intelligence_relationships(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  change_reason text not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (relationship_id,revision_number)
);

create table public.relationship_processing_runs (
  id uuid primary key default gen_random_uuid(),
  execution_key text not null unique,
  observation_id uuid not null references public.intelligence_observations(id) on delete cascade,
  status text not null check (status in ('queued','running','completed','failed','skipped','needs_review')),
  stage text not null check (stage in ('observation_ready','extracting','resolving','validating','matching','scoring','complete','failed','skipped')),
  candidates_extracted integer not null default 0 check (candidates_extracted >= 0),
  relationships_created integer not null default 0 check (relationships_created >= 0),
  relationships_updated integer not null default 0 check (relationships_updated >= 0),
  duplicates_suppressed integer not null default 0 check (duplicates_suppressed >= 0),
  unresolved_entities integer not null default 0 check (unresolved_entities >= 0),
  model_calls integer not null default 0 check (model_calls >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(12,6),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_message text,
  metadata jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intelligence_relationship_review_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.intelligence_relationships(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('confirm','reject','correct','expire','merge','restore')),
  previous_value jsonb,
  next_value jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table public.intelligence_entity_merges (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  target_entity_id uuid not null references public.intelligence_entities(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  check (source_entity_id <> target_entity_id)
);

create table public.source_acquisition_scores (
  source_id uuid primary key references public.sources(id) on delete cascade,
  strategic_relevance numeric(5,4) not null default 0.5 check (strategic_relevance between 0 and 1),
  authority numeric(5,4) not null default 0.5 check (authority between 0 and 1),
  entity_importance numeric(5,4) not null default 0.5 check (entity_importance between 0 and 1),
  historical_value numeric(5,4) not null default 0.5 check (historical_value between 0 and 1),
  update_frequency numeric(5,4) not null default 0.5 check (update_frequency between 0 and 1),
  uniqueness numeric(5,4) not null default 0.5 check (uniqueness between 0 and 1),
  signal_yield numeric(5,4) not null default 0 check (signal_yield between 0 and 1),
  retrieval_utilisation numeric(5,4) not null default 0 check (retrieval_utilisation between 0 and 1),
  acquisition_score numeric(5,4) generated always as (
    strategic_relevance*0.24 + authority*0.22 + entity_importance*0.16 +
    historical_value*0.12 + update_frequency*0.08 + uniqueness*0.08 +
    signal_yield*0.05 + retrieval_utilisation*0.05
  ) stored,
  updated_at timestamptz not null default now()
);

insert into public.source_acquisition_scores (
  source_id,strategic_relevance,authority,entity_importance,historical_value,update_frequency,uniqueness
)
select source.id,
  case when source.geography='Ireland' then 0.95 when source.geography in ('UK','EU','Europe') then 0.78 else 0.62 end,
  greatest(0.25,least(1,coalesce(source.source_weight,0.5))),
  case when source.priority in ('1','P1','High') then 0.9 else 0.6 end,
  case when exists (select 1 from public.reference_targets target where target.source_id=source.id and target.historical_backfill is not null) then 0.85 else 0.5 end,
  case when source.source_class in ('Official / regulatory','Data/API') then 0.8 else 0.65 end,
  case when source.primary_source then 0.85 else 0.55 end
from public.sources source
where source.registry_kind is distinct from 'document'
on conflict (source_id) do nothing;

create table public.source_yield_metrics (
  source_id uuid primary key references public.sources(id) on delete cascade,
  evidence_items integer not null default 0 check (evidence_items >= 0),
  accepted_observations integer not null default 0 check (accepted_observations >= 0),
  signals_generated integer not null default 0 check (signals_generated >= 0),
  high_relevance_signals integer not null default 0 check (high_relevance_signals >= 0),
  retrieval_uses integer not null default 0 check (retrieval_uses >= 0),
  citations_used integer not null default 0 check (citations_used >= 0),
  duplicate_percentage numeric(5,2) check (duplicate_percentage is null or duplicate_percentage between 0 and 100),
  extraction_cost_usd numeric(12,6),
  failure_count integer not null default 0 check (failure_count >= 0),
  calculated_at timestamptz not null default now()
);

create table public.intelligence_coverage_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  dimension_type text not null check (dimension_type in ('entity_type','geography','theme','authority','organisation','source_class','historical_depth')),
  dimension_key text not null,
  source_count integer not null default 0 check (source_count >= 0),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  observation_count integer not null default 0 check (observation_count >= 0),
  signal_count integer not null default 0 check (signal_count >= 0),
  relationship_count integer not null default 0 check (relationship_count >= 0),
  freshest_evidence_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (snapshot_date,dimension_type,dimension_key)
);

create table public.intelligence_coverage_gaps (
  id uuid primary key default gen_random_uuid(),
  gap_key text not null unique,
  entity_id uuid references public.intelligence_entities(id) on delete cascade,
  gap_type text not null check (gap_type in ('insufficient_sources','missing_annual_report','stale_product_monitoring','failing_careers_ingestion','stale_regulator','poor_primary_evidence','missing_technology_evidence')),
  severity text not null check (severity in ('critical','high','medium','low')),
  summary text not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'
);

alter table public.retrieval_diagnostics
  add column if not exists resolved_entity_ids uuid[] not null default '{}',
  add column if not exists aliases_matched jsonb not null default '[]',
  add column if not exists graph_paths jsonb not null default '[]',
  add column if not exists relationship_ids uuid[] not null default '{}',
  add column if not exists graph_relationship_count integer not null default 0,
  add column if not exists graph_entity_count integer not null default 0,
  add column if not exists graph_retrieval_duration_ms integer;

create index intelligence_entities_parent_idx on public.intelligence_entities (parent_entity_id) where parent_entity_id is not null;
create index intelligence_entities_status_type_idx on public.intelligence_entities (status,entity_type,canonical_name);
create index intelligence_relationships_source_idx on public.intelligence_relationships (source_entity_id,relationship_type,status,last_observed_at desc);
create index intelligence_relationships_target_idx on public.intelligence_relationships (target_entity_id,relationship_type,status,last_observed_at desc);
create index intelligence_relationships_current_rank_idx on public.intelligence_relationships (confidence_score desc,last_observed_at desc) where status in ('current','emerging','uncertain');
create index intelligence_relationship_observations_observation_idx on public.intelligence_relationship_observations (observation_id,relationship_id);
create index intelligence_relationship_signals_signal_idx on public.intelligence_relationship_signals (signal_id,relationship_id);
create index relationship_processing_runs_queue_idx on public.relationship_processing_runs (status,created_at) where status in ('queued','running','failed','needs_review');
create index relationship_processing_runs_observation_idx on public.relationship_processing_runs (observation_id,created_at desc);
create index intelligence_relationship_revisions_relationship_idx on public.intelligence_relationship_revisions (relationship_id,revision_number desc);
create index intelligence_relationship_review_relationship_idx on public.intelligence_relationship_review_events (relationship_id,created_at desc);
create index intelligence_coverage_snapshots_dimension_idx on public.intelligence_coverage_snapshots (dimension_type,dimension_key,snapshot_date desc);
create index intelligence_coverage_gaps_open_idx on public.intelligence_coverage_gaps (severity,detected_at desc) where resolved_at is null;
create index reference_targets_r4_backfill_idx on public.reference_targets (approved_for_fetch,enabled,readiness_grade,geography,reference_year desc) where readiness_grade='A';

create or replace function public.retrieve_intelligence_graph_neighbourhood(
  requested_entity_ids uuid[],
  requested_relationship_types text[] default '{}',
  as_of_date date default current_date,
  maximum_depth integer default 2,
  result_limit integer default 40
)
returns table (
  relationship_id uuid,
  source_entity_id uuid,
  source_entity_name text,
  source_entity_type text,
  relationship_type text,
  target_entity_id uuid,
  target_entity_name text,
  target_entity_type text,
  relationship_basis text,
  confidence_score numeric,
  status text,
  valid_from date,
  valid_to date,
  first_observed_at timestamptz,
  last_observed_at timestamptz,
  evidence_count integer,
  independent_source_count integer,
  reasoning_summary text,
  depth integer
)
language sql stable security invoker set search_path=''
as $$
  with recursive neighbourhood(entity_id,depth,path) as (
    select seed,0,array[seed]::uuid[]
    from unnest(coalesce(requested_entity_ids,'{}'::uuid[])) seed
    union all
    select
      case when edge.source_entity_id=neighbourhood.entity_id then edge.target_entity_id else edge.source_entity_id end,
      neighbourhood.depth+1,
      neighbourhood.path || case when edge.source_entity_id=neighbourhood.entity_id then edge.target_entity_id else edge.source_entity_id end
    from neighbourhood
    join public.intelligence_relationships edge
      on edge.source_entity_id=neighbourhood.entity_id or edge.target_entity_id=neighbourhood.entity_id
    where neighbourhood.depth < least(greatest(maximum_depth,1),2)
      and edge.status in ('current','emerging','uncertain')
      and edge.confidence_score >= 0.5
      and (cardinality(requested_relationship_types)=0 or edge.relationship_type=any(requested_relationship_types))
      and (edge.valid_from is null or edge.valid_from<=as_of_date)
      and (edge.valid_to is null or edge.valid_to>=as_of_date)
      and exists (
        select 1
        from public.intelligence_relationship_observations lineage
        join public.intelligence_observations observation on observation.id=lineage.observation_id
        where lineage.relationship_id=edge.id and observation.review_status='accepted'
      )
      and not (case when edge.source_entity_id=neighbourhood.entity_id then edge.target_entity_id else edge.source_entity_id end=any(neighbourhood.path))
  ), ranked as (
    select distinct on (edge.id)
      edge.id relationship_id,edge.source_entity_id,source.canonical_name source_entity_name,
      source.entity_type source_entity_type,edge.relationship_type,edge.target_entity_id,
      target.canonical_name target_entity_name,target.entity_type target_entity_type,
      edge.relationship_basis,edge.confidence_score,edge.status,edge.valid_from,edge.valid_to,
      edge.first_observed_at,edge.last_observed_at,edge.evidence_count,
      edge.independent_source_count,edge.reasoning_summary,neighbourhood.depth+1 depth
    from neighbourhood
    join public.intelligence_relationships edge
      on edge.source_entity_id=neighbourhood.entity_id or edge.target_entity_id=neighbourhood.entity_id
    join public.intelligence_entities source on source.id=edge.source_entity_id
    join public.intelligence_entities target on target.id=edge.target_entity_id
    where neighbourhood.depth < least(greatest(maximum_depth,1),2)
      and edge.status in ('current','emerging','uncertain')
      and edge.confidence_score >= 0.5
      and (cardinality(requested_relationship_types)=0 or edge.relationship_type=any(requested_relationship_types))
      and (edge.valid_from is null or edge.valid_from<=as_of_date)
      and (edge.valid_to is null or edge.valid_to>=as_of_date)
      and exists (
        select 1
        from public.intelligence_relationship_observations lineage
        join public.intelligence_observations observation on observation.id=lineage.observation_id
        where lineage.relationship_id=edge.id and observation.review_status='accepted'
      )
    order by edge.id,neighbourhood.depth,edge.confidence_score desc
  )
  select * from ranked
  order by depth,confidence_score desc,last_observed_at desc
  limit least(greatest(result_limit,1),100);
$$;

create or replace function public.queue_r4_source_backfill(p_limit integer default 20)
returns table(id uuid)
language plpgsql security invoker set search_path=''
as $$
begin
  if current_user not in ('service_role','postgres') then raise exception 'service role required'; end if;
  return query
  with candidates as (
    select target.id target_id,connector.id connector_id,target.reference_key
    from public.reference_targets target
    join public.source_connectors connector on connector.source_id=target.source_id
    join public.sources source on source.id=target.source_id
    left join public.source_acquisition_scores score on score.source_id=source.id
    where target.readiness_grade='A'
      and target.enabled and target.approved_for_fetch
      and connector.enabled and connector.approved_for_fetch
      and connector.endpoint_verified and not connector.terms_review_required
      and not exists (select 1 from public.source_items item where item.reference_target_id=target.id)
      and not exists (select 1 from public.source_ingestion_runs existing where existing.reference_target_id=target.id and existing.status in ('queued','running','completed'))
    order by
      case target.geography when 'Ireland' then 0 when 'EU' then 1 when 'UK' then 2 when 'Europe' then 3 else 4 end,
      score.acquisition_score desc nulls last,target.reference_year desc nulls last,target.id
    limit least(greatest(coalesce(p_limit,20),1),50)
    for update of target skip locked
  ), inserted as (
    insert into public.source_ingestion_runs (execution_key,connector_id,reference_target_id,run_type,status,metadata)
    select 'r4:backfill:' || candidates.reference_key,candidates.connector_id,candidates.target_id,'backfill','queued',
      jsonb_build_object('release','R4','scope','verified Grade-A knowledge-graph expansion','approvalRequiredBeforeRetrieval',true)
    from candidates
    on conflict (execution_key) do nothing
    returning public.source_ingestion_runs.id
  )
  select inserted.id from inserted;
end;
$$;

revoke all on function public.retrieve_intelligence_graph_neighbourhood(uuid[],text[],date,integer,integer) from public,anon;
grant execute on function public.retrieve_intelligence_graph_neighbourhood(uuid[],text[],date,integer,integer) to authenticated,service_role;
revoke all on function public.queue_r4_source_backfill(integer) from public,anon,authenticated;
grant execute on function public.queue_r4_source_backfill(integer) to service_role;

alter table public.intelligence_entity_type_configuration enable row level security;
alter table public.intelligence_relationship_types enable row level security;
alter table public.intelligence_relationships enable row level security;
alter table public.intelligence_relationship_observations enable row level security;
alter table public.intelligence_relationship_signals enable row level security;
alter table public.intelligence_relationship_revisions enable row level security;
alter table public.relationship_processing_runs enable row level security;
alter table public.intelligence_relationship_review_events enable row level security;
alter table public.intelligence_entity_merges enable row level security;
alter table public.source_acquisition_scores enable row level security;
alter table public.source_yield_metrics enable row level security;
alter table public.intelligence_coverage_snapshots enable row level security;
alter table public.intelligence_coverage_gaps enable row level security;

create policy intelligence_entity_type_configuration_read on public.intelligence_entity_type_configuration for select to authenticated using (active or (select public.is_admin()));
create policy intelligence_relationship_types_read on public.intelligence_relationship_types for select to authenticated using (active or (select public.is_admin()));
create policy intelligence_relationships_read on public.intelligence_relationships for select to authenticated using (
  (status in ('current','emerging','uncertain') and exists (
    select 1 from public.intelligence_relationship_observations lineage
    join public.intelligence_observations observation on observation.id=lineage.observation_id
    where lineage.relationship_id=intelligence_relationships.id and observation.review_status='accepted'
  )) or (select public.is_admin())
);
create policy intelligence_relationship_observations_read on public.intelligence_relationship_observations for select to authenticated using (
  exists (select 1 from public.intelligence_relationships relationship where relationship.id=relationship_id and (relationship.status in ('current','emerging','uncertain') or (select public.is_admin())))
);
create policy intelligence_relationship_signals_read on public.intelligence_relationship_signals for select to authenticated using (
  exists (select 1 from public.intelligence_relationships relationship where relationship.id=relationship_id and (relationship.status in ('current','emerging','uncertain') or (select public.is_admin())))
);
create policy intelligence_relationship_revisions_admin_read on public.intelligence_relationship_revisions for select to authenticated using ((select public.is_admin()));
create policy relationship_processing_runs_admin_read on public.relationship_processing_runs for select to authenticated using ((select public.is_admin()));
create policy intelligence_relationship_review_admin_read on public.intelligence_relationship_review_events for select to authenticated using ((select public.is_admin()));
create policy intelligence_entity_merges_admin_read on public.intelligence_entity_merges for select to authenticated using ((select public.is_admin()));
create policy source_acquisition_scores_admin_read on public.source_acquisition_scores for select to authenticated using ((select public.is_admin()));
create policy source_yield_metrics_admin_read on public.source_yield_metrics for select to authenticated using ((select public.is_admin()));
create policy intelligence_coverage_snapshots_admin_read on public.intelligence_coverage_snapshots for select to authenticated using ((select public.is_admin()));
create policy intelligence_coverage_gaps_admin_read on public.intelligence_coverage_gaps for select to authenticated using ((select public.is_admin()));

grant select on public.intelligence_entity_type_configuration,public.intelligence_relationship_types,
  public.intelligence_relationships,public.intelligence_relationship_observations,
  public.intelligence_relationship_signals,public.intelligence_relationship_revisions,
  public.relationship_processing_runs,public.intelligence_relationship_review_events,
  public.intelligence_entity_merges,public.source_acquisition_scores,
  public.source_yield_metrics,public.intelligence_coverage_snapshots,
  public.intelligence_coverage_gaps to authenticated;

-- Activate only targets already classified Grade A whose connector was
-- independently verified and has no outstanding terms review. Evidence remains
-- unavailable to retrieval until the existing human review function approves it.
update public.source_connectors connector
set approved_for_fetch=true,enabled=true,updated_at=now()
where connector.endpoint_verified
  and not connector.terms_review_required
  and exists (
    select 1 from public.reference_targets target
    where target.source_id=connector.source_id and target.readiness_grade='A'
  );

update public.reference_targets target
set approved_for_fetch=true,enabled=true,blocked_reason=null,updated_at=now()
from public.source_connectors connector
where connector.source_id=target.source_id
  and target.readiness_grade='A'
  and connector.enabled and connector.approved_for_fetch
  and connector.endpoint_verified and not connector.terms_review_required;

update public.sources source
set registry_active=true,updated_at=now()
where exists (
  select 1 from public.source_connectors connector
  where connector.source_id=source.id and connector.enabled and connector.approved_for_fetch
);

select public.queue_r4_source_backfill(40);

comment on table public.intelligence_relationships is 'R4 evidence-grounded, versionable market-knowledge-graph edges.';
comment on function public.retrieve_intelligence_graph_neighbourhood(uuid[],text[],date,integer,integer) is 'Bounded, RLS-protected graph retrieval with accepted-observation provenance.';
comment on function public.queue_r4_source_backfill(integer) is 'Queues a controlled batch from verified, terms-cleared Grade-A source targets; evidence still requires human approval.';
