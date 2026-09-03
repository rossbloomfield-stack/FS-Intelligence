-- R5.2 deliberately activates only the existing annual-report pilot cohort.
-- Every selected endpoint is marked verified and terms_review_required=false in
-- the controlled workbook import. Discovery remains bounded to 2025 reporting
-- targets and does not approve any discovered item for conversational use.

with cohort(source_key) as (
  values
    ('SRC-0155'), -- Great-West Lifeco
    ('SRC-0156'), -- Zurich Ireland / group statutory reporting
    ('SRC-0167'), -- AIB
    ('SRC-0168'), -- Bank of Ireland
    ('SRC-0192')  -- Aviva UK
)
update public.source_connectors as connector
set approved_for_fetch=true,
    enabled=true,
    updated_at=now()
from public.sources as source
join cohort on cohort.source_key=source.source_key
where connector.source_id=source.id
  and connector.endpoint_verified
  and not connector.terms_review_required;

with cohort(source_key) as (
  values ('SRC-0155'),('SRC-0156'),('SRC-0167'),('SRC-0168'),('SRC-0192')
)
update public.reference_targets as target
set approved_for_fetch=true,
    enabled=true,
    blocked_reason=null,
    updated_at=now()
from public.sources as source
join cohort on cohort.source_key=source.source_key
join public.source_connectors as connector on connector.source_id=source.id
where target.source_id=source.id
  and target.readiness_grade='A'
  and target.reference_year=2025
  and connector.endpoint_verified
  and connector.approved_for_fetch
  and connector.enabled
  and not connector.terms_review_required
  and (
    lower(target.title) like '%annual report%'
    or lower(target.title) like '%results presentation%'
    or lower(target.title) like '%results / earnings release%'
    or lower(target.title) like '%regulatory / capital disclosures%'
  );

update public.sources
set registry_active=true,
    updated_at=now()
where source_key in ('SRC-0155','SRC-0156','SRC-0167','SRC-0168','SRC-0192');

insert into public.source_ingestion_runs (
  execution_key,connector_id,reference_target_id,run_type,status,metadata
)
select
  'r5.2:verification:' || target.reference_key,
  connector.id,
  target.id,
  'verification',
  'queued',
  jsonb_build_object(
    'release','R5.2',
    'scope','verified 2025 reporting cohort',
    'approvalRequiredBeforeRetrieval',true
  )
from public.reference_targets as target
join public.source_connectors as connector on connector.source_id=target.source_id
where target.enabled
  and target.approved_for_fetch
  and target.reference_year=2025
  and exists (
    select 1
    from public.sources as source
    where source.id=target.source_id
      and source.source_key in ('SRC-0155','SRC-0156','SRC-0167','SRC-0168','SRC-0192')
  )
on conflict (execution_key) do nothing;

-- Ten previously reviewed, approved document records pre-date source_items.
-- Promote their existing factual notes into the passage pipeline so full-text
-- retrieval and corpus counts reflect all approved production evidence. This
-- does not add unreviewed source text or approve a registry catalogue row.
with parent_map(publisher_pattern,parent_source_key) as (
  values
    ('AIB%','SRC-0167'),
    ('Bank of Ireland%','SRC-0168'),
    ('Central Bank of Ireland%','SRC-0001'),
    ('European Union%','SRC-0083'),
    ('Irish Life%','SRC-0151'),
    ('Zurich Ireland%','SRC-0156')
), approved_documents as (
  select
    evidence.*,
    parent.id as parent_source_id
  from public.sources as evidence
  join parent_map on evidence.publisher like parent_map.publisher_pattern
  join public.sources as parent on parent.source_key=parent_map.parent_source_key
  where evidence.registry_kind='document'
    and evidence.approved_public
    and evidence.notes is not null
    and not exists (
      select 1 from public.source_items as existing
      where existing.evidence_source_id=evidence.id
    )
)
insert into public.source_items (
  parent_source_id,evidence_source_id,item_key,canonical_url,title,content_type,
  publication_date,factual_summary,extracted_facts,content_hash,fetch_status,
  evidence_classification,approved,fetched_at,last_verified_at,metadata
)
select
  parent_source_id,
  id,
  'r5.2:approved-source:' || id::text,
  url,
  title,
  case when lower(url) like '%.pdf%' then 'application/pdf' else 'text/html' end,
  publication_date,
  notes,
  '[]'::jsonb,
  md5(notes),
  'parsed',
  evidence_classification,
  true,
  now(),
  now(),
  jsonb_build_object('release','R5.2','origin','previously approved source note')
from approved_documents
on conflict (item_key) do nothing;

insert into public.source_chunks (
  source_item_id,chunk_index,content,content_hash,token_count,section_label,
  claim_type,metadata
)
select
  item.id,
  0,
  item.factual_summary,
  md5(item.factual_summary),
  greatest(1,array_length(regexp_split_to_array(item.factual_summary,'\s+'),1)),
  'Approved evidence summary',
  'factual_summary',
  jsonb_build_object('release','R5.2','boundedExtract',true)
from public.source_items as item
where item.item_key like 'r5.2:approved-source:%'
  and item.approved
  and item.factual_summary is not null
  and not exists (
    select 1 from public.source_chunks as existing
    where existing.source_item_id=item.id and existing.chunk_index=0
  );
