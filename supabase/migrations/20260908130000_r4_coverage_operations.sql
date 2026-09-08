create or replace function public.refresh_r4_operational_metrics()
returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  refreshed_sources integer;
  open_gaps integer;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service role required'; end if;

  with source_rollup as (
    select source.id source_id,
      count(distinct item.id)::integer evidence_items,
      count(distinct observation.id) filter (where observation.review_status='accepted')::integer accepted_observations,
      count(distinct signal_link.signal_id)::integer signals_generated,
      count(distinct signal_link.signal_id) filter (where signal.strategic_relevance>=0.7)::integer high_relevance_signals,
      count(distinct failure.id)::integer failure_count,
      null::numeric extraction_cost_usd
    from public.sources source
    left join public.source_items item on item.parent_source_id=source.id
    left join public.intelligence_observations observation on observation.document_id=item.id
    left join public.intelligence_signal_observations signal_link on signal_link.observation_id=observation.id
    left join public.intelligence_signals signal on signal.id=signal_link.signal_id
    left join public.source_ingestion_runs run on run.reference_target_id=item.reference_target_id
    left join public.source_ingestion_failures failure on failure.run_id=run.id
    where source.registry_kind is distinct from 'document'
    group by source.id
  )
  insert into public.source_yield_metrics (
    source_id,evidence_items,accepted_observations,signals_generated,
    high_relevance_signals,extraction_cost_usd,failure_count,calculated_at
  )
  select source_id,evidence_items,accepted_observations,signals_generated,
    high_relevance_signals,extraction_cost_usd,failure_count,now()
  from source_rollup
  on conflict (source_id) do update set
    evidence_items=excluded.evidence_items,
    accepted_observations=excluded.accepted_observations,
    signals_generated=excluded.signals_generated,
    high_relevance_signals=excluded.high_relevance_signals,
    extraction_cost_usd=excluded.extraction_cost_usd,
    failure_count=excluded.failure_count,
    calculated_at=excluded.calculated_at;
  get diagnostics refreshed_sources = row_count;

  update public.source_acquisition_scores score
  set signal_yield=least(1,metrics.signals_generated::numeric/greatest(metrics.evidence_items,1)),
      updated_at=now()
  from public.source_yield_metrics metrics
  where metrics.source_id=score.source_id;

  update public.intelligence_coverage_gaps set resolved_at=now()
  where resolved_at is null and gap_type in ('insufficient_sources','missing_technology_evidence');

  insert into public.intelligence_coverage_gaps (gap_key,entity_id,gap_type,severity,summary,metadata)
  select 'r4:insufficient-sources:' || entity.id::text,entity.id,'insufficient_sources',
    case when organisation.is_irish then 'high' else 'medium' end,
    entity.canonical_name || ' has no accepted observation in the current intelligence base.',
    jsonb_build_object('calculatedAt',now(),'organisationId',organisation.id)
  from public.intelligence_entities entity
  join public.organisations organisation on organisation.id=entity.organisation_id
  where entity.active and organisation.active
    and not exists (
      select 1 from public.intelligence_observations observation
      where observation.entity_id=entity.id and observation.review_status='accepted'
    )
  on conflict (gap_key) do update set resolved_at=null,detected_at=now(),summary=excluded.summary,metadata=excluded.metadata;

  insert into public.intelligence_coverage_gaps (gap_key,entity_id,gap_type,severity,summary,metadata)
  select 'r4:technology-evidence:' || entity.id::text,entity.id,'missing_technology_evidence','medium',
    entity.canonical_name || ' has no current, evidence-grounded technology or capability relationship.',
    jsonb_build_object('calculatedAt',now(),'organisationId',organisation.id)
  from public.intelligence_entities entity
  join public.organisations organisation on organisation.id=entity.organisation_id
  where entity.active and organisation.active and organisation.is_irish
    and not exists (
      select 1 from public.intelligence_relationships relationship
      join public.intelligence_relationship_observations lineage on lineage.relationship_id=relationship.id
      where (relationship.source_entity_id=entity.id or relationship.target_entity_id=entity.id)
        and relationship.relationship_type in ('USES_TECHNOLOGY','SUPPLIED_BY','IMPLEMENTED_BY','BUILDING_CAPABILITY','HAS_CAPABILITY','DEVELOPING_CAPABILITY','INVESTING_IN')
        and relationship.status in ('current','emerging','uncertain')
    )
  on conflict (gap_key) do update set resolved_at=null,detected_at=now(),summary=excluded.summary,metadata=excluded.metadata;

  insert into public.intelligence_coverage_snapshots (
    snapshot_date,dimension_type,dimension_key,source_count,evidence_count,
    observation_count,signal_count,relationship_count,freshest_evidence_at,metadata
  )
  select current_date,'geography',coalesce(source.geography,'Not classified'),
    count(distinct source.id)::integer,count(distinct item.id)::integer,
    count(distinct observation.id)::integer,count(distinct signal_link.signal_id)::integer,
    count(distinct relationship.id)::integer,max(item.last_verified_at),
    jsonb_build_object('release','R4')
  from public.sources source
  left join public.source_items item on item.parent_source_id=source.id and item.approved
  left join public.intelligence_observations observation on observation.document_id=item.id and observation.review_status='accepted'
  left join public.intelligence_signal_observations signal_link on signal_link.observation_id=observation.id
  left join public.intelligence_relationship_observations relationship_link on relationship_link.observation_id=observation.id
  left join public.intelligence_relationships relationship on relationship.id=relationship_link.relationship_id
  where source.registry_kind is distinct from 'document'
  group by coalesce(source.geography,'Not classified')
  on conflict (snapshot_date,dimension_type,dimension_key) do update set
    source_count=excluded.source_count,evidence_count=excluded.evidence_count,
    observation_count=excluded.observation_count,signal_count=excluded.signal_count,
    relationship_count=excluded.relationship_count,freshest_evidence_at=excluded.freshest_evidence_at,
    metadata=excluded.metadata;

  select count(*) into open_gaps from public.intelligence_coverage_gaps where resolved_at is null;
  return jsonb_build_object('sourcesRefreshed',refreshed_sources,'openGaps',open_gaps,'refreshedAt',now());
end;
$$;

revoke all on function public.refresh_r4_operational_metrics() from public,anon,authenticated;
grant execute on function public.refresh_r4_operational_metrics() to service_role;

select public.refresh_r4_operational_metrics();

comment on function public.refresh_r4_operational_metrics() is 'Refreshes R4 source-yield, coverage snapshots and evidence-gap alerts from accepted production intelligence.';
