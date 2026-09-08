-- Queue enough verified Grade-A source targets for the dedicated corpus worker.
-- Fetching remains bounded separately to twenty workflows per worker cycle.
create or replace function public.queue_r4_source_backfill(p_limit integer default 100)
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
      and not exists (
        select 1 from public.source_ingestion_runs existing
        where existing.reference_target_id=target.id
          and existing.status in ('queued','running','completed','partial','blocked')
      )
    order by
      case target.geography when 'Ireland' then 0 when 'EU' then 1 when 'UK' then 2 when 'Europe' then 3 else 4 end,
      score.acquisition_score desc nulls last,target.reference_year desc nulls last,target.id
    limit least(greatest(coalesce(p_limit,100),1),200)
    for update of target skip locked
  ), inserted as (
    insert into public.source_ingestion_runs (execution_key,connector_id,reference_target_id,run_type,status,metadata)
    select 'r4:backfill:' || candidates.reference_key,candidates.connector_id,candidates.target_id,'backfill','queued',
      jsonb_build_object(
        'release','R4',
        'scope','verified Grade-A knowledge-graph expansion',
        'approvalRequiredBeforeRetrieval',true,
        'queuePolicy','corpus-throughput-v1'
      )
    from candidates
    on conflict (execution_key) do nothing
    returning public.source_ingestion_runs.id
  )
  select inserted.id from inserted;
end;
$$;

revoke all on function public.queue_r4_source_backfill(integer) from public,anon,authenticated;
grant execute on function public.queue_r4_source_backfill(integer) to service_role;

comment on function public.queue_r4_source_backfill(integer) is
  'Queues up to 200 verified Grade-A targets for bounded, domain-diverse corpus processing.';
