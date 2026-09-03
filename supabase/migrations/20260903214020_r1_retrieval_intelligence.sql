-- R1 Retrieval Intelligence
-- Additive hybrid retrieval, private diagnostics and a model-labelled embedding index.

create table if not exists public.retrieval_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  query_hash text not null,
  original_query text not null,
  parsed_intent text not null,
  query_plan jsonb not null default '{}',
  decomposed_queries jsonb not null default '[]',
  semantic_candidate_count integer not null default 0 check (semantic_candidate_count >= 0),
  lexical_candidate_count integer not null default 0 check (lexical_candidate_count >= 0),
  merged_candidate_count integer not null default 0 check (merged_candidate_count >= 0),
  duplicates_removed integer not null default 0 check (duplicates_removed >= 0),
  reranked_candidate_count integer not null default 0 check (reranked_candidate_count >= 0),
  selected_evidence_count integer not null default 0 check (selected_evidence_count >= 0),
  unique_document_count integer not null default 0 check (unique_document_count >= 0),
  unique_domain_count integer not null default 0 check (unique_domain_count >= 0),
  max_document_concentration numeric(6,5),
  median_evidence_age_days numeric(12,2),
  citation_utilisation numeric(6,5),
  retrieval_duration_ms integer not null default 0 check (retrieval_duration_ms >= 0),
  generation_duration_ms integer check (generation_duration_ms is null or generation_duration_ms >= 0),
  embedding_model text,
  semantic_status text not null default 'not_attempted' check (semantic_status in ('not_attempted','available','unavailable','failed')),
  evidence_coverage text not null check (evidence_coverage in ('strong','adequate','limited','insufficient')),
  selected_evidence jsonb not null default '[]',
  reranking_scores jsonb not null default '[]',
  final_citations uuid[] not null default '{}',
  retrieval_config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.retrieval_diagnostics enable row level security;

create policy retrieval_diagnostics_admin_read
  on public.retrieval_diagnostics for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.retrieval_diagnostics from public, anon, authenticated;
grant select on table public.retrieval_diagnostics to authenticated;
grant select, insert, update, delete on table public.retrieval_diagnostics to service_role;

create index if not exists retrieval_diagnostics_created_idx
  on public.retrieval_diagnostics (created_at desc);
create index if not exists retrieval_diagnostics_conversation_idx
  on public.retrieval_diagnostics (conversation_id, created_at desc)
  where conversation_id is not null;
create index if not exists retrieval_diagnostics_intent_idx
  on public.retrieval_diagnostics (parsed_intent, created_at desc);

create trigger set_retrieval_diagnostics_updated_at
  before update on public.retrieval_diagnostics
  for each row execute function public.set_updated_at();

create index if not exists source_chunks_embedding_1536_hnsw_idx
  on public.source_chunks
  using hnsw ((embedding::extensions.vector(1536)) extensions.vector_cosine_ops)
  where embedding is not null
    and embedding_model = 'text-embedding-3-small'
    and embedding_dimensions = 1536;

create or replace function public.search_approved_source_chunks_lexical(
  search_query text,
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
    from regexp_split_to_table(left(trim(search_query), 1000), '[^[:alnum:]]+') as term
    where char_length(term) >= 2
      and lower(term) not in (
        'about','after','an','are','as','at','be','before','by','could','does','doing',
        'for','from','have','how','in','into','is','it','of','on','or','the','this','to',
        'irish','most','should','that','their','what','which','with','would','your'
      )
    limit 48
  ), query as (
    select to_tsquery('english', string_agg(quote_literal(term), ' | ')) as value
    from terms
  ), ranked as (
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
      coalesce(linked.organisation_names, '{}'::text[]) as organisation_names,
      (
        ts_rank_cd(chunk.search_vector, query.value)
        + case when to_tsvector('english', coalesce(item.title, '')) @@ query.value then 0.18 else 0 end
        + case when to_tsvector('english', coalesce(evidence.publisher, '')) @@ query.value then 0.10 else 0 end
      )::real as relevance
    from public.source_chunks as chunk
    join public.source_items as item on item.id = chunk.source_item_id
    join public.sources as evidence on evidence.id = item.evidence_source_id
    cross join query
    left join lateral (
      select array_agg(distinct organisation.name order by organisation.name) as organisation_names
      from public.source_item_organisations as link
      join public.organisations as organisation on organisation.id = link.organisation_id
      where link.source_item_id = item.id
    ) as linked on true
    where query.value is not null
      and item.approved
      and evidence.approved_public
      and (
        chunk.search_vector @@ query.value
        or to_tsvector('english', coalesce(item.title, '')) @@ query.value
        or to_tsvector('english', coalesce(evidence.publisher, '')) @@ query.value
      )
  )
  select * from ranked
  order by relevance desc, primary_source desc, credibility_tier asc nulls last,
    publication_date desc nulls last, chunk_id
  limit least(greatest(result_limit, 1), 100);
$$;

create or replace function public.search_approved_source_chunks_semantic(
  query_embedding extensions.vector(1536),
  query_embedding_model text default 'text-embedding-3-small',
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
  organisation_names text[],
  relevance real
)
language sql
stable
security invoker
set search_path = ''
as $$
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
    coalesce(linked.organisation_names, '{}'::text[]) as organisation_names,
    greatest(
      0,
      1 - (
        (chunk.embedding::extensions.vector(1536))
        operator(extensions.<=>)
        query_embedding
      )
    )::real as relevance
  from public.source_chunks as chunk
  join public.source_items as item on item.id = chunk.source_item_id
  join public.sources as evidence on evidence.id = item.evidence_source_id
  left join lateral (
    select array_agg(distinct organisation.name order by organisation.name) as organisation_names
    from public.source_item_organisations as link
    join public.organisations as organisation on organisation.id = link.organisation_id
    where link.source_item_id = item.id
  ) as linked on true
  where item.approved
    and evidence.approved_public
    and chunk.embedding is not null
    and chunk.embedding_model = query_embedding_model
    and chunk.embedding_dimensions = 1536
  order by
    (chunk.embedding::extensions.vector(1536))
      operator(extensions.<=>)
      query_embedding,
    chunk.id
  limit least(greatest(result_limit, 1), 100);
$$;

create or replace function public.get_approved_source_chunks_missing_embedding(
  requested_model text default 'text-embedding-3-small',
  requested_dimensions integer default 1536,
  result_limit integer default 50
)
returns table (
  chunk_id bigint,
  title text,
  section_label text,
  content text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select chunk.id, item.title, chunk.section_label, chunk.content
  from public.source_chunks as chunk
  join public.source_items as item on item.id = chunk.source_item_id
  join public.sources as evidence on evidence.id = item.evidence_source_id
  where item.approved
    and evidence.approved_public
    and (
      chunk.embedding is null
      or chunk.embedding_model is distinct from requested_model
      or chunk.embedding_dimensions is distinct from requested_dimensions
    )
  order by item.publication_date desc nulls last, chunk.id
  limit least(greatest(result_limit, 1), 100);
$$;

revoke all on function public.search_approved_source_chunks_lexical(text, integer) from public, anon;
revoke all on function public.search_approved_source_chunks_semantic(extensions.vector, text, integer) from public, anon;
revoke all on function public.get_approved_source_chunks_missing_embedding(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_approved_source_chunks_lexical(text, integer) to authenticated;
grant execute on function public.search_approved_source_chunks_semantic(extensions.vector, text, integer) to authenticated;
grant execute on function public.get_approved_source_chunks_missing_embedding(text, integer, integer) to service_role;

comment on table public.retrieval_diagnostics is
  'Private R1 retrieval telemetry. Only administrators can read it; server-side service role writes it.';
comment on function public.search_approved_source_chunks_lexical(text, integer) is
  'R1 approved-evidence lexical candidate search. Returns passage-level metadata for application-side fusion and reranking.';
comment on function public.search_approved_source_chunks_semantic(extensions.vector, text, integer) is
  'R1 approved-evidence semantic candidate search over model-labelled 1536-dimensional embeddings.';
comment on function public.get_approved_source_chunks_missing_embedding(text, integer, integer) is
  'Service-role-only bounded worklist for embedding approved R1 evidence passages.';
