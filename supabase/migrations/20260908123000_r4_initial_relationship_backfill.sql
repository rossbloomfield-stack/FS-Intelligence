-- Seed the R4 graph from the small set of already accepted R3 observations.
-- This is deterministic, idempotent and preserves direct observation lineage.

with candidates as (
  select observation.id observation_id,observation.entity_id source_entity_id,
    case
      when observation.product is not null and observation.observation_type='product_withdrawal' then 'WITHDREW'
      when observation.product is not null and observation.observation_type in ('product_launch','product_change','feature_launch','feature_change','proposition_change','digital_service_change','customer_journey_change') then 'OFFERS'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('hiring_activity','capability_hiring','team_expansion','careers_change','transformation_programme') then 'DEVELOPING_CAPABILITY'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('investment_priority','technology_investment') then 'INVESTING_IN'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('strategic_priority','strategic_change') then 'PRIORITISES'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type='implementation' then 'HAS_CAPABILITY'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('technology_adoption','platform_change','ai_adoption','data_capability','automation','technology_relationship') then 'BUILDING_CAPABILITY'
      when observation.market is not null and observation.observation_type='market_entry' then 'ENTERED_MARKET'
      when observation.market is not null and observation.observation_type='market_exit' then 'EXITED_MARKET'
    end relationship_type,
    case
      when observation.product is not null then 'product'
      when observation.market is not null and observation.observation_type in ('market_entry','market_exit') then 'market'
      when observation.observation_type in ('investment_priority','technology_investment','strategic_priority','strategic_change') then 'strategic_theme'
      else 'capability'
    end target_entity_type,
    initcap(replace(replace(coalesce(observation.product,observation.market,observation.capability,observation.theme),'_',' '),'-',' ')) target_entity_name,
    case when observation.observation_type in ('hiring_activity','capability_hiring','team_expansion','careers_change','transformation_programme','technology_adoption','platform_change','ai_adoption','data_capability','automation','technology_relationship') then 'inferred' else 'explicit' end relationship_basis,
    observation.event_date,observation.published_at,observation.observation_text,
    observation.extraction_confidence,observation.evidence_directness,observation.source_authority,
    coalesce(observation.entity_resolution_confidence,0.65) entity_resolution_confidence
  from public.intelligence_observations observation
  where observation.review_status='accepted' and observation.entity_id is not null
), valid_candidates as (
  select * from candidates where relationship_type is not null and target_entity_name is not null
)
insert into public.intelligence_entities (
  entity_type,canonical_name,canonical_key,status,active,first_observed_at,last_observed_at,
  confidence_score,metadata
)
select distinct target_entity_type,target_entity_name,
  target_entity_type || ':' || trim(both '-' from regexp_replace(lower(target_entity_name),'[^a-z0-9]+','-','g')),
  'current',true,coalesce(event_date::timestamptz,published_at::timestamptz,now()),
  coalesce(event_date::timestamptz,published_at::timestamptz,now()),
  case when relationship_basis='explicit' then 0.9 else 0.68 end,
  jsonb_build_object('createdBy','r4.relationships.v1','backfill',true)
from valid_candidates
on conflict (canonical_key) do update set
  last_observed_at=greatest(public.intelligence_entities.last_observed_at,excluded.last_observed_at),
  updated_at=now();

with candidates as (
  select observation.id observation_id,observation.entity_id source_entity_id,
    case
      when observation.product is not null and observation.observation_type='product_withdrawal' then 'WITHDREW'
      when observation.product is not null and observation.observation_type in ('product_launch','product_change','feature_launch','feature_change','proposition_change','digital_service_change','customer_journey_change') then 'OFFERS'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('hiring_activity','capability_hiring','team_expansion','careers_change','transformation_programme') then 'DEVELOPING_CAPABILITY'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('investment_priority','technology_investment') then 'INVESTING_IN'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('strategic_priority','strategic_change') then 'PRIORITISES'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type='implementation' then 'HAS_CAPABILITY'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('technology_adoption','platform_change','ai_adoption','data_capability','automation','technology_relationship') then 'BUILDING_CAPABILITY'
      when observation.market is not null and observation.observation_type='market_entry' then 'ENTERED_MARKET'
      when observation.market is not null and observation.observation_type='market_exit' then 'EXITED_MARKET'
    end relationship_type,
    case
      when observation.product is not null then 'product'
      when observation.market is not null and observation.observation_type in ('market_entry','market_exit') then 'market'
      when observation.observation_type in ('investment_priority','technology_investment','strategic_priority','strategic_change') then 'strategic_theme'
      else 'capability'
    end target_entity_type,
    initcap(replace(replace(coalesce(observation.product,observation.market,observation.capability,observation.theme),'_',' '),'-',' ')) target_entity_name,
    case when observation.observation_type in ('hiring_activity','capability_hiring','team_expansion','careers_change','transformation_programme','technology_adoption','platform_change','ai_adoption','data_capability','automation','technology_relationship') then 'inferred' else 'explicit' end relationship_basis,
    observation.event_date,observation.published_at,observation.observation_text,
    observation.extraction_confidence::numeric extraction_confidence,
    observation.evidence_directness::numeric evidence_directness,
    observation.source_authority::numeric source_authority,
    coalesce(observation.entity_resolution_confidence,0.65)::numeric entity_resolution_confidence
  from public.intelligence_observations observation
  where observation.review_status='accepted' and observation.entity_id is not null
), resolved as (
  select candidate.*,target.id target_entity_id,
    least(1,greatest(0,
      candidate.evidence_directness*0.27 + candidate.source_authority*0.20 +
      candidate.extraction_confidence*0.16 + candidate.entity_resolution_confidence*0.15 +
      0.025 + case when candidate.relationship_basis='explicit' then 0.12 else 0.0744 end
    )) confidence_score
  from candidates candidate
  join public.intelligence_entities target on target.canonical_key=
    candidate.target_entity_type || ':' || trim(both '-' from regexp_replace(lower(candidate.target_entity_name),'[^a-z0-9]+','-','g'))
  where candidate.relationship_type is not null
), inserted as (
  insert into public.intelligence_relationships (
    stable_key,source_entity_id,relationship_type,target_entity_id,relationship_basis,
    confidence_score,confidence_components,first_observed_at,last_observed_at,
    valid_from,status,evidence_count,independent_source_count,extraction_model,
    prompt_version,schema_version,extraction_version,reasoning_summary,metadata
  )
  select 'r4:' || encode(digest(source_entity_id::text || ':' || relationship_type || ':' || target_entity_id::text,'sha256'),'hex'),
    source_entity_id,relationship_type,target_entity_id,relationship_basis,confidence_score,
    jsonb_build_object('evidenceDirectness',evidence_directness,'sourceAuthority',source_authority,
      'extractionConfidence',extraction_confidence,'entityConfidence',entity_resolution_confidence,
      'corroboration',0.25,'basisStrength',case when relationship_basis='explicit' then 1 else 0.62 end,
      'contradictionPenalty',0),
    coalesce(event_date::timestamptz,published_at::timestamptz,now()),
    coalesce(event_date::timestamptz,published_at::timestamptz,now()),event_date,
    case when confidence_score<0.58 then 'uncertain' when relationship_basis='inferred' or confidence_score<0.74 then 'emerging' else 'current' end,
    1,1,'deterministic-r4','not-applicable','r4.relationship-schema.v1','r4.relationships.v1',
    case when relationship_basis='explicit' then 'Explicit relationship grounded in an accepted observation.' else 'Inferred relationship grounded in an accepted observation; interpretation remains qualified.' end,
    jsonb_build_object('rationale',observation_text,'backfill',true)
  from resolved
  where source_entity_id<>target_entity_id
  on conflict (stable_key) do update set last_observed_at=greatest(public.intelligence_relationships.last_observed_at,excluded.last_observed_at),updated_at=now()
  returning id,stable_key
)
select count(*) from inserted;

with mappings as (
  select observation.id observation_id,observation.entity_id source_entity_id,
    case
      when observation.product is not null and observation.observation_type='product_withdrawal' then 'WITHDREW'
      when observation.product is not null and observation.observation_type in ('product_launch','product_change','feature_launch','feature_change','proposition_change','digital_service_change','customer_journey_change') then 'OFFERS'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('hiring_activity','capability_hiring','team_expansion','careers_change','transformation_programme') then 'DEVELOPING_CAPABILITY'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('investment_priority','technology_investment') then 'INVESTING_IN'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('strategic_priority','strategic_change') then 'PRIORITISES'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type='implementation' then 'HAS_CAPABILITY'
      when coalesce(observation.capability,observation.theme) is not null and observation.observation_type in ('technology_adoption','platform_change','ai_adoption','data_capability','automation','technology_relationship') then 'BUILDING_CAPABILITY'
      when observation.market is not null and observation.observation_type='market_entry' then 'ENTERED_MARKET'
      when observation.market is not null and observation.observation_type='market_exit' then 'EXITED_MARKET'
    end relationship_type,
    case when observation.product is not null then 'product' when observation.market is not null and observation.observation_type in ('market_entry','market_exit') then 'market' when observation.observation_type in ('investment_priority','technology_investment','strategic_priority','strategic_change') then 'strategic_theme' else 'capability' end target_entity_type,
    initcap(replace(replace(coalesce(observation.product,observation.market,observation.capability,observation.theme),'_',' '),'-',' ')) target_entity_name,
    observation.evidence_directness
  from public.intelligence_observations observation
  where observation.review_status='accepted' and observation.entity_id is not null
), resolved as (
  select mapping.*,target.id target_entity_id
  from mappings mapping
  join public.intelligence_entities target on target.canonical_key=mapping.target_entity_type || ':' || trim(both '-' from regexp_replace(lower(mapping.target_entity_name),'[^a-z0-9]+','-','g'))
  where mapping.relationship_type is not null
)
insert into public.intelligence_relationship_observations (relationship_id,observation_id,evidence_role,support_strength)
select relationship.id,resolved.observation_id,'supporting',resolved.evidence_directness
from resolved
join public.intelligence_relationships relationship on relationship.stable_key=
  'r4:' || encode(digest(resolved.source_entity_id::text || ':' || resolved.relationship_type || ':' || resolved.target_entity_id::text,'sha256'),'hex')
on conflict (relationship_id,observation_id) do nothing;

insert into public.intelligence_relationship_signals (relationship_id,signal_id)
select distinct relationship_observation.relationship_id,signal_observation.signal_id
from public.intelligence_relationship_observations relationship_observation
join public.intelligence_signal_observations signal_observation on signal_observation.observation_id=relationship_observation.observation_id
on conflict (relationship_id,signal_id) do nothing;

update public.intelligence_relationships relationship
set evidence_count=rollup.evidence_count,
    independent_source_count=rollup.independent_source_count,
    updated_at=now()
from (
  select lineage.relationship_id,count(*)::integer evidence_count,
    count(distinct observation.source_family_key)::integer independent_source_count
  from public.intelligence_relationship_observations lineage
  join public.intelligence_observations observation on observation.id=lineage.observation_id
  where lineage.evidence_role<>'contradictory'
  group by lineage.relationship_id
) rollup
where relationship.id=rollup.relationship_id;

insert into public.relationship_processing_runs (
  execution_key,observation_id,status,stage,candidates_extracted,relationships_created,
  relationships_updated,duplicates_suppressed,model_calls,duration_ms,metadata,
  started_at,completed_at
)
select 'r4.relationships.v1:' || observation.id::text,observation.id,'completed','complete',
  case when exists (select 1 from public.intelligence_relationship_observations lineage where lineage.observation_id=observation.id) then 1 else 0 end,
  case when exists (select 1 from public.intelligence_relationship_observations lineage where lineage.observation_id=observation.id) then 1 else 0 end,
  0,0,0,0,jsonb_build_object('release','R4','deterministic',true,'backfill',true),now(),now()
from public.intelligence_observations observation
where observation.review_status='accepted'
on conflict (execution_key) do nothing;
