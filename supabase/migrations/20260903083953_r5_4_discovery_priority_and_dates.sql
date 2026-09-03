create or replace function public.claim_source_ingestion_runs(p_limit integer default 2)
returns table(id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'service role required';
  end if;

  return query
  with claimable as (
    select run.id
    from public.source_ingestion_runs as run
    join public.source_connectors as connector on connector.id = run.connector_id
    join public.reference_targets as target on target.id = run.reference_target_id
    where run.status in ('queued', 'failed')
      and run.attempt <= 3
      and connector.enabled
      and connector.approved_for_fetch
      and target.enabled
      and target.approved_for_fetch
    order by
      case when run.metadata->>'release' = 'R5.4' then 0 else 1 end,
      case when run.metadata->>'release' = 'R5.4' then run.metadata->>'discoveryDate' end desc nulls last,
      case
        when run.metadata->>'release' = 'R5.4'
          and run.metadata->>'candidateRank' ~ '^[0-9]+$'
        then (run.metadata->>'candidateRank')::integer
      end asc nulls last,
      case when run.metadata->>'release' = 'R5.4' then run.created_at end asc nulls last,
      run.created_at,
      run.id
    for update of run skip locked
    limit greatest(1, least(coalesce(p_limit, 2), 5))
  ), updated as (
    update public.source_ingestion_runs as run
    set status = 'running',
        attempt = case when run.status = 'failed' then run.attempt + 1 else run.attempt end,
        started_at = now(),
        completed_at = null,
        error_summary = null,
        metadata = run.metadata || jsonb_build_object('claimedAt', now())
    from claimable
    where run.id = claimable.id
    returning run.id
  )
  select updated.id from updated;
end;
$$;

revoke all on function public.claim_source_ingestion_runs(integer) from public, anon, authenticated;
grant execute on function public.claim_source_ingestion_runs(integer) to service_role;

comment on function public.claim_source_ingestion_runs(integer) is
  'Claims approved source targets, prioritising the latest R5.4 discovery date and candidate rank.';
