alter table public.source_ingestion_runs
  add column if not exists workflow_run_id text;

create index if not exists source_ingestion_runs_queue_idx
  on public.source_ingestion_runs (created_at, id)
  where status in ('queued', 'failed') and attempt <= 3;

create index if not exists source_ingestion_runs_workflow_idx
  on public.source_ingestion_runs (workflow_run_id)
  where workflow_run_id is not null;

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
    order by run.created_at, run.id
    for update of run skip locked
    limit greatest(1, least(coalesce(p_limit, 2), 5))
  ), updated as (
    update public.source_ingestion_runs as run
    set status = 'running',
        attempt = case when run.status = 'failed' then run.attempt + 1 else run.attempt end,
        started_at = now(),
        completed_at = null,
        error_summary = null,
        metadata = run.metadata || jsonb_build_object(
          'claimedAt', now(),
          'release', 'R5.3'
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

create or replace function public.review_source_item(
  p_item_id uuid,
  p_decision text,
  p_reason text default null,
  p_publication_date date default null
)
returns table(review_status text, evidence_source_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.source_items%rowtype;
  parent public.sources%rowtype;
  target public.reference_targets%rowtype;
  evidence_id uuid;
  effective_publication_date date;
begin
  if not (select public.is_admin()) then
    raise exception 'administrator required';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'decision must be approve or reject';
  end if;

  select * into item
  from public.source_items
  where source_items.id = p_item_id
  for update;

  if not found then
    raise exception 'source item not found';
  end if;

  select * into parent from public.sources where sources.id = item.parent_source_id;
  if item.reference_target_id is not null then
    select * into target
    from public.reference_targets
    where reference_targets.id = item.reference_target_id;
  end if;

  if p_decision = 'reject' then
    update public.source_items
    set approved = false,
        fetch_status = 'rejected',
        rejection_reason = coalesce(nullif(trim(p_reason), ''), 'Rejected during evidence review'),
        last_verified_at = now()
    where source_items.id = p_item_id;

    insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values (
      (select auth.uid()),
      'source_item_rejected',
      'source_item',
      p_item_id,
      jsonb_build_object('reason', coalesce(p_reason, ''), 'release', 'R5.3')
    );

    return query select 'rejected'::text, null::uuid;
    return;
  end if;

  if item.fetch_status <> 'parsed' then
    raise exception 'only parsed source items can be approved';
  end if;

  if not exists (
    select 1 from public.source_chunks where source_item_id = p_item_id
  ) then
    raise exception 'source item has no evidence passages';
  end if;

  effective_publication_date := coalesce(p_publication_date, item.publication_date);
  if item.reference_target_id is not null
     and target.publication_date_required
     and effective_publication_date is null then
    raise exception 'publication date is required before approval';
  end if;

  select sources.id into evidence_id
  from public.sources
  where sources.canonical_url = item.canonical_url;

  if evidence_id is not null and exists (
    select 1 from public.sources where sources.id = evidence_id and registry_kind <> 'document'
  ) then
    raise exception 'a parent registry source already uses this canonical URL';
  end if;

  if evidence_id is null then
    insert into public.sources (
      url, canonical_url, title, publisher, source_type, publication_date,
      primary_source, credibility_tier, evidence_classification, notes,
      approved_public, registry_kind, canonical_domain, source_class,
      categorisation, signal_type, geography, priority, source_weight,
      registry_status, registry_active, access_licensing_note, storage_policy,
      implementation_notes
    ) values (
      item.canonical_url,
      item.canonical_url,
      item.title,
      parent.title,
      lower(replace(item.content_type, ' ', '_')),
      effective_publication_date,
      true,
      parent.credibility_tier,
      coalesce(item.evidence_classification, 'primary_company_source'),
      'Official evidence reviewed for the market-intelligence corpus.',
      true,
      'document',
      parent.canonical_domain,
      parent.source_class,
      parent.categorisation,
      parent.signal_type,
      parent.geography,
      parent.priority,
      parent.source_weight,
      'approved',
      true,
      parent.access_licensing_note,
      parent.storage_policy,
      'Approved through the R5.3 evidence review workflow.'
    ) returning sources.id into evidence_id;
  else
    update public.sources
    set title = item.title,
        publication_date = effective_publication_date,
        approved_public = true,
        registry_status = 'approved',
        registry_active = true,
        updated_at = now()
    where sources.id = evidence_id;
  end if;

  update public.source_items
  set approved = true,
      evidence_source_id = evidence_id,
      publication_date = effective_publication_date,
      rejection_reason = null,
      last_verified_at = now()
  where source_items.id = p_item_id;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'source_item_approved',
    'source_item',
    p_item_id,
    jsonb_build_object('evidenceSourceId', evidence_id, 'release', 'R5.3')
  );

  return query select 'approved'::text, evidence_id;
end;
$$;

revoke all on function public.review_source_item(uuid, text, text, date) from public, anon;
grant execute on function public.review_source_item(uuid, text, text, date) to authenticated;

comment on function public.claim_source_ingestion_runs(integer) is
  'Atomically claims a bounded set of explicitly fetch-approved ingestion runs for the R5.3 worker.';

comment on function public.review_source_item(uuid, text, text, date) is
  'Human approval gate that promotes a parsed item into citation-ready evidence or records rejection.';
