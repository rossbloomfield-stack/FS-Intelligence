-- R3 signals are retrieval aids only when accepted, source-grounded observation
-- lineage exists. Legacy pilot signals remain available to administrators.

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
    and exists (
      select 1
      from public.intelligence_signal_observations link
      join public.intelligence_observations observation on observation.id=link.observation_id
      where link.signal_id=signal.id and observation.review_status='accepted'
    )
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

revoke all on function public.search_approved_intelligence_signals(text, uuid[], text[], text[], numeric, numeric, date, integer) from public, anon;
grant execute on function public.search_approved_intelligence_signals(text, uuid[], text[], text[], numeric, numeric, date, integer) to authenticated, service_role;
