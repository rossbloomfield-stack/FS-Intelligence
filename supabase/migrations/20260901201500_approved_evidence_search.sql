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
  with query as (
    select websearch_to_tsquery('english', left(trim(search_query), 1000)) as value
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
    coalesce(item.evidence_classification, evidence.evidence_classification),
    chunk.content,
    chunk.section_label,
    chunk.page_number,
    ts_rank_cd(chunk.search_vector, query.value)::real
  from public.source_chunks as chunk
  join public.source_items as item on item.id = chunk.source_item_id
  join public.sources as evidence on evidence.id = item.evidence_source_id
  cross join query
  where trim(search_query) <> ''
    and item.approved
    and evidence.approved_public
    and chunk.search_vector @@ query.value
  order by
    ts_rank_cd(chunk.search_vector, query.value) desc,
    item.publication_date desc nulls last,
    chunk.id
  limit least(greatest(result_limit, 1), 30);
$$;

revoke all on function public.search_approved_source_chunks(text,integer) from public;
grant execute on function public.search_approved_source_chunks(text,integer) to authenticated;

comment on function public.search_approved_source_chunks(text,integer) is
  'Ranks approved, citation-ready evidence chunks. Registry catalogue rows are excluded.';
