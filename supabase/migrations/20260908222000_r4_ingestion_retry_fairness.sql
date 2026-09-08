-- Prevent one failing endpoint from starving the expanded R4 ingestion queue.
-- `attempt` starts at one, so failed rows are reclaimable only while below the
-- third and final execution attempt. A per-domain rank also spreads each batch
-- across independent source estates where alternatives are available.
create or replace function public.claim_source_ingestion_runs(p_limit integer default 5)
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
  with eligible as (
    select
      run.id,
      run.created_at,
      row_number() over (
        partition by coalesce(nullif(parent.canonical_domain, ''), target.source_id::text)
        order by run.created_at, run.id
      ) as domain_rank
    from public.source_ingestion_runs as run
    join public.source_connectors as connector on connector.id = run.connector_id
    join public.reference_targets as target on target.id = run.reference_target_id
    join public.sources as parent on parent.id = target.source_id
    where run.status in ('queued', 'failed')
      and (run.status = 'queued' or run.attempt < 3)
      and connector.enabled
      and connector.approved_for_fetch
      and connector.endpoint_verified
      and not connector.terms_review_required
      and target.enabled
      and target.approved_for_fetch
      and target.readiness_grade = 'A'
  ), claimable as (
    select run.id
    from public.source_ingestion_runs as run
    join eligible on eligible.id = run.id
    order by
      eligible.domain_rank,
      eligible.created_at,
      run.id
    for update of run skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 20))
  ), updated as (
    update public.source_ingestion_runs as run
    set status = 'running',
        attempt = case when run.status = 'failed' then run.attempt + 1 else run.attempt end,
        started_at = now(),
        completed_at = null,
        error_summary = null,
        metadata = run.metadata || jsonb_build_object(
          'claimedAt', now(),
          'release', 'R4',
          'claimPolicy', 'retry-fairness-v1'
        )
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
  'Claims a bounded, domain-diverse R4 ingestion batch and stops failed runs after three total execution attempts.';
