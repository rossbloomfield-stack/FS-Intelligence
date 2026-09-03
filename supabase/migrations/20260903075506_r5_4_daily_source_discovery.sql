alter table public.source_connectors
  add column if not exists discovery_enabled boolean not null default false,
  add column if not exists discovery_url text,
  add column if not exists discovery_include_paths text[] not null default '{}',
  add column if not exists discovery_exclude_terms text[] not null default '{}',
  add column if not exists discovery_max_items smallint not null default 6,
  add column if not exists discovery_last_attempted_at timestamptz,
  add column if not exists discovery_last_succeeded_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='source_connectors_discovery_max_items_check'
      and conrelid='public.source_connectors'::regclass
  ) then
    alter table public.source_connectors
      add constraint source_connectors_discovery_max_items_check
      check (discovery_max_items between 1 and 12);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='source_connectors_discovery_config_check'
      and conrelid='public.source_connectors'::regclass
  ) then
    alter table public.source_connectors
      add constraint source_connectors_discovery_config_check
      check (
        not discovery_enabled
        or (
          enabled
          and approved_for_fetch
          and endpoint_verified
          and not terms_review_required
          and discovery_url is not null
          and cardinality(discovery_include_paths)>0
        )
      );
  end if;
end $$;

create index if not exists source_connectors_discovery_due_idx
  on public.source_connectors (discovery_last_succeeded_at,id)
  where discovery_enabled;

create or replace function public.claim_source_discovery_runs(
  p_limit integer default 4,
  p_discovery_date date default current_date
)
returns table(id uuid,connector_id bigint)
language plpgsql
security invoker
set search_path=''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'service role required';
  end if;

  return query
  with due as (
    select connector.id
    from public.source_connectors as connector
    where connector.discovery_enabled
      and connector.enabled
      and connector.approved_for_fetch
      and connector.endpoint_verified
      and not connector.terms_review_required
      and connector.discovery_url is not null
      and not exists (
        select 1
        from public.source_ingestion_runs as existing
        where existing.execution_key='r5.4:discovery:' || connector.id::text || ':' || p_discovery_date::text
      )
    order by connector.discovery_last_succeeded_at nulls first,connector.id
    for update of connector skip locked
    limit greatest(1,least(coalesce(p_limit,4),8))
  ), inserted as (
    insert into public.source_ingestion_runs (
      execution_key,connector_id,run_type,status,started_at,metadata
    )
    select
      'r5.4:discovery:' || due.id::text || ':' || p_discovery_date::text,
      due.id,
      'connector',
      'running',
      now(),
      jsonb_build_object(
        'release','R5.4',
        'scope','daily official-source discovery',
        'discoveryDate',p_discovery_date,
        'approvalRequiredBeforeRetrieval',true
      )
    from due
    on conflict (execution_key) do nothing
    returning source_ingestion_runs.id,source_ingestion_runs.connector_id
  )
  select inserted.id,inserted.connector_id from inserted;
end;
$$;

revoke all on function public.claim_source_discovery_runs(integer,date) from public,anon,authenticated;
grant execute on function public.claim_source_discovery_runs(integer,date) to service_role;

create or replace function public.claim_source_ingestion_runs(p_limit integer default 2)
returns table(id uuid)
language plpgsql
security invoker
set search_path=''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'service role required';
  end if;

  return query
  with claimable as (
    select run.id
    from public.source_ingestion_runs as run
    join public.source_connectors as connector on connector.id=run.connector_id
    join public.reference_targets as target on target.id=run.reference_target_id
    where run.status in ('queued','failed')
      and run.attempt<=3
      and connector.enabled
      and connector.approved_for_fetch
      and target.enabled
      and target.approved_for_fetch
    order by
      case when run.metadata->>'release'='R5.4' then 0 else 1 end,
      case when run.metadata->>'release'='R5.4' then run.metadata->>'discoveryDate' end desc nulls last,
      case
        when run.metadata->>'release'='R5.4'
          and run.metadata->>'candidateRank' ~ '^[0-9]+$'
        then (run.metadata->>'candidateRank')::integer
      end asc nulls last,
      case when run.metadata->>'release'='R5.4' then run.created_at end asc nulls last,
      run.created_at,
      run.id
    for update of run skip locked
    limit greatest(1,least(coalesce(p_limit,2),5))
  ), updated as (
    update public.source_ingestion_runs as run
    set status='running',
        attempt=case when run.status='failed' then run.attempt+1 else run.attempt end,
        started_at=now(),
        completed_at=null,
        error_summary=null,
        metadata=run.metadata || jsonb_build_object('claimedAt',now())
    from claimable
    where run.id=claimable.id
    returning run.id
  )
  select updated.id from updated;
end;
$$;

revoke all on function public.claim_source_ingestion_runs(integer) from public,anon,authenticated;
grant execute on function public.claim_source_ingestion_runs(integer) to service_role;

with cohort(source_key,discovery_url,include_paths,exclude_terms,max_items) as (
  values
    (
      'SRC-0001',
      'https://www.centralbank.ie/feeds/news-media-feed',
      array['/news/article/']::text[],
      array['commemorative coin']::text[],
      8::smallint
    ),
    (
      'SRC-0167',
      'https://www.aib.ie/investorrelations/stock-exchange-announcements/2026',
      array['/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/']::text[],
      array['transaction in own shares','transactions in own shares','total voting rights','major shareholding','pdmr']::text[],
      5::smallint
    ),
    (
      'SRC-0168',
      'https://investorrelations.bankofireland.com/press-releases/stock-exchange-announcements/',
      array['investorrelations.bankofireland.com/app/uploads/2026.']::text[],
      array['transaction in own shares','total voting rights','director dealing','preference stock']::text[],
      5::smallint
    ),
    (
      'SRC-0192',
      'https://www.aviva.com/newsroom/news-releases/',
      array['/newsroom/news-and-research-overview/news-releases/2026/']::text[],
      array['photo gallery','podcast transcript']::text[],
      8::smallint
    )
)
update public.source_connectors as connector
set approved_for_fetch=true,
    enabled=true,
    discovery_enabled=true,
    discovery_url=cohort.discovery_url,
    discovery_include_paths=cohort.include_paths,
    discovery_exclude_terms=cohort.exclude_terms,
    discovery_max_items=cohort.max_items,
    updated_at=now()
from public.sources as source
join cohort on cohort.source_key=source.source_key
where connector.source_id=source.id
  and connector.endpoint_verified
  and not connector.terms_review_required;

update public.sources
set registry_active=true,updated_at=now()
where source_key in ('SRC-0001','SRC-0167','SRC-0168','SRC-0192');

comment on function public.claim_source_discovery_runs(integer,date) is
  'Claims one idempotent daily discovery run for each approved R5.4 official-source connector.';

comment on column public.source_connectors.discovery_enabled is
  'Separate permission for bounded recurring link discovery; requires a verified, fetch-approved connector.';
