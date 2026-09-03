create or replace function public.search_approved_source_chunks(
  search_query text,
  result_limit integer default 12
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
      and lower(term) not in ('about','after','before','could','does','doing','from','have','into','irish','most','should','that','their','the','this','what','which','with','would','your')
    limit 24
  ), query as (
    select to_tsquery('english',string_agg(quote_literal(term), ' | ')) as value
    from terms
  )
  select
    item.id,
    evidence.id,
    item.title,
    evidence.publisher,
    item.canonical_url,
    item.publication_date,
    evidence.source_type,
    evidence.primary_source,
    evidence.credibility_tier,
    coalesce(item.evidence_classification,evidence.evidence_classification),
    chunk.content,
    chunk.section_label,
    chunk.page_number,
    ts_rank_cd(chunk.search_vector,query.value)::real
  from public.source_chunks as chunk
  join public.source_items as item on item.id=chunk.source_item_id
  join public.sources as evidence on evidence.id=item.evidence_source_id
  cross join query
  where query.value is not null
    and item.approved
    and evidence.approved_public
    and chunk.search_vector @@ query.value
  order by
    ts_rank_cd(chunk.search_vector,query.value) desc,
    item.publication_date desc nulls last,
    chunk.id
  limit least(greatest(result_limit,1),30);
$$;
