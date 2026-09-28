-- Organisation-scoped evidence retrieval for current company-strategy questions.
-- This is additive: the general R1 lexical/semantic RPCs remain unchanged.

create or replace function public.search_approved_company_strategy_chunks(
  search_query text,
  requested_organisation_ids uuid[],
  requested_strategy_facet text default null,
  result_limit integer default 40
)
returns table (
  chunk_id bigint,
  source_item_id uuid,
  evidence_source_id uuid,
  title text,
  publisher text,
  url text,
  publication_date date,
  source_type text,
  primary_source boolean,
  credibility_tier smallint,
  evidence_classification text,
  canonical_domain text,
  source_class text,
  categorisation text,
  geography text,
  source_weight real,
  chunk_content text,
  section_label text,
  page_number integer,
  content_hash text,
  organisation_ids uuid[],
  organisation_names text[],
  signal_type text,
  strategy_facet text,
  relevance real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select distinct lower(term) as term
    from regexp_split_to_table(left(trim(search_query), 1000), '[^[:alnum:]]+') as term
    where char_length(term) >= 2
      and lower(term) not in (
        'about','after','an','are','as','at','be','before','by','could','does','doing',
        'for','from','have','how','in','into','is','it','of','on','or','the','this','to',
        'irish','most','should','that','their','what','which','with','would','your'
      )
    limit 64
  ), query as (
    select to_tsquery('english', string_agg(quote_literal(term), ' | ')) as value
    from terms
  ), classified as (
    select
      chunk.id as chunk_id,
      item.id as source_item_id,
      evidence.id as evidence_source_id,
      item.title,
      evidence.publisher,
      item.canonical_url as url,
      item.publication_date,
      evidence.source_type,
      evidence.primary_source,
      evidence.credibility_tier,
      coalesce(item.evidence_classification, evidence.evidence_classification) as evidence_classification,
      evidence.canonical_domain,
      evidence.source_class,
      evidence.categorisation,
      evidence.geography,
      coalesce(evidence.source_weight, 0)::real as source_weight,
      chunk.content as chunk_content,
      chunk.section_label,
      chunk.page_number,
      chunk.content_hash,
      coalesce(linked.organisation_ids, '{}'::uuid[]) as organisation_ids,
      coalesce(linked.organisation_names, '{}'::text[]) as organisation_names,
      evidence.signal_type,
      case
        when evidence.signal_type = 'soft'
          or concat_ws(' ', evidence.source_class, evidence.categorisation, item.title, chunk.section_label)
            ~* '(career|vacanc|hiring|job|appointment|leadership|interview|webpage|website change|app update)'
          then 'soft_signal'
        when not evidence.primary_source
          or concat_ws(' ', evidence.source_class, evidence.source_type, evidence.categorisation)
            ~* '(media|news|research|analyst|industry|commentary)'
          then 'independent_context'
        when concat_ws(' ', item.title, evidence.source_class, evidence.source_type, chunk.section_label, chunk.content)
          ~* '(annual report|interim report|investor|strategic priorit|our strategy|strategy is|strategic pillar|ambition|outlook|capital allocation|key risk)'
          then 'declared_strategy'
        else 'recent_execution'
      end as strategy_facet,
      (
        ts_rank_cd(chunk.search_vector, query.value)
        + case when to_tsvector('english', coalesce(item.title, '')) @@ query.value then 0.18 else 0 end
        + case when to_tsvector('english', coalesce(evidence.publisher, '')) @@ query.value then 0.10 else 0 end
        + case when linked.organisation_ids && requested_organisation_ids then 0.25 else 0 end
      )::real as relevance
    from public.source_chunks as chunk
    join public.source_items as item on item.id = chunk.source_item_id
    join public.sources as evidence on evidence.id = item.evidence_source_id
    cross join query
    left join lateral (
      select
        array_agg(distinct organisation.id order by organisation.id) as organisation_ids,
        array_agg(distinct organisation.name order by organisation.name) as organisation_names
      from public.source_item_organisations as link
      join public.organisations as organisation on organisation.id = link.organisation_id
      where link.source_item_id = item.id
    ) as linked on true
    where query.value is not null
      and cardinality(requested_organisation_ids) > 0
      and item.approved
      and evidence.approved_public
      and linked.organisation_ids && requested_organisation_ids
      and (
        chunk.search_vector @@ query.value
        or to_tsvector('english', coalesce(item.title, '')) @@ query.value
        or to_tsvector('english', coalesce(evidence.publisher, '')) @@ query.value
      )
  )
  select classified.*
  from classified
  where requested_strategy_facet is null
    or classified.strategy_facet = requested_strategy_facet
  order by relevance desc, primary_source desc, credibility_tier asc nulls last,
    publication_date desc nulls last, chunk_id
  limit least(greatest(result_limit, 1), 100);
$$;

comment on function public.search_approved_company_strategy_chunks(text, uuid[], text, integer)
  is 'Organisation-scoped lexical retrieval for declared strategy, recent execution, independent context and directional soft signals.';

revoke all on function public.search_approved_company_strategy_chunks(text, uuid[], text, integer)
  from public, anon;
grant execute on function public.search_approved_company_strategy_chunks(text, uuid[], text, integer)
  to authenticated, service_role;
