drop function if exists public.search_approved_source_chunks(text,integer);

create function public.search_approved_source_chunks(
  search_query text,
  result_limit integer default 18
)
returns table (
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
  chunk_content text,
  section_label text,
  page_number integer,
  organisation_names text[],
  relevance real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select distinct lower(term) as term
    from regexp_split_to_table(left(trim(search_query),1000),'[^[:alnum:]]+') as term
    where char_length(term) >= 3
      and lower(term) not in (
        'about','after','before','could','does','doing','from','have','into','irish',
        'most','should','that','their','the','this','what','which','with','would','your'
      )
    limit 36
  ), query as (
    select to_tsquery('english',string_agg(quote_literal(term), ' | ')) as value
    from terms
  ), ranked as (
    select
      item.id as source_item_id,
      evidence.id as evidence_source_id,
      item.title,
      evidence.publisher,
      item.canonical_url as url,
      item.publication_date,
      evidence.source_type,
      evidence.primary_source,
      evidence.credibility_tier,
      coalesce(item.evidence_classification,evidence.evidence_classification) as evidence_classification,
      chunk.content as chunk_content,
      chunk.section_label,
      chunk.page_number,
      coalesce(linked.organisation_names,'{}'::text[]) as organisation_names,
      ts_rank_cd(chunk.search_vector,query.value)::real as relevance,
      chunk.id
    from public.source_chunks as chunk
    join public.source_items as item on item.id=chunk.source_item_id
    join public.sources as evidence on evidence.id=item.evidence_source_id
    cross join query
    left join lateral (
      select array_agg(distinct organisation.name order by organisation.name) as organisation_names
      from public.source_item_organisations as link
      join public.organisations as organisation on organisation.id=link.organisation_id
      where link.source_item_id=item.id
    ) as linked on true
    where query.value is not null
      and item.approved
      and evidence.approved_public
      and chunk.search_vector @@ query.value
  )
  select
    source_item_id,evidence_source_id,title,publisher,url,publication_date,source_type,
    primary_source,credibility_tier,evidence_classification,chunk_content,section_label,
    page_number,organisation_names,relevance
  from ranked
  order by
    relevance desc,
    primary_source desc,
    credibility_tier asc nulls last,
    publication_date desc nulls last,
    id
  limit least(greatest(result_limit,1),60);
$$;

revoke all on function public.search_approved_source_chunks(text,integer) from public;
grant execute on function public.search_approved_source_chunks(text,integer) to authenticated;

comment on function public.search_approved_source_chunks(text,integer) is
  'R5.2 passage-level search across approved citation-ready evidence. Returns linked organisations and up to 60 ranked passages; registry catalogue rows remain excluded.';
