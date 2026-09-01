-- Bounded, manually verified annual-report pilot. These five documents were
-- checked against official company domains on 2026-09-01. Only short factual
-- summaries are retained; raw reports are not copied into the database.

with documents(canonical_url,title,publisher,publication_date,geography) as (
  values
    ('https://aib.ie/content/dam/frontdoor/investorrelations/docs/resultscentre/annualreport/2025/aib-group-plc-afr-report-2025.pdf','AIB Group plc Annual Financial Report 2025','AIB Group plc','2026-03-03'::date,'Ireland'),
    ('https://investorrelations.bankofireland.com/app/uploads/Annual-Report-HoldCo-2025-WEB.pdf','Bank of Ireland Annual Report 2025','Bank of Ireland Group plc','2026-03-02'::date,'Ireland'),
    ('https://www.greatwestlifeco.com/content/dam/lifeco/documents/investor-relations/reports/2026/annual/lifeco-2025-annual-report.pdf','Great-West Lifeco Annual Report 2025','Great-West Lifeco Inc.',null::date,'Global'),
    ('https://www.zurich.com/-/media-assets/project/zurich/dotcom/investor-relations/docs/financial-reports/2025/annual-report-2025-en.pdf','Zurich Insurance Group Annual Report 2025','Zurich Insurance Group Ltd','2026-03-05'::date,'Global'),
    ('https://static.aviva.io/content/dam/aviva-corporate/documents/investors/pdfs/reports/2025/annual-report-and-accounts-2025.pdf','Aviva plc Annual Report and Accounts 2025','Aviva plc','2026-03-05'::date,'UK and Ireland')
)
insert into public.sources (
  url,canonical_url,title,publisher,source_type,publication_date,primary_source,
  credibility_tier,evidence_classification,notes,approved_public,registry_kind,
  categorisation,signal_type,geography,priority,source_weight,registry_status,registry_active
)
select
  canonical_url,canonical_url,title,publisher,'company_results',publication_date,true,
  1,'primary_company','Official 2025 annual report; bounded evidence pilot verified on 2026-09-01.',true,'document',
  'Company strategy and results','hard',geography,'P1',1,'approved',true
from documents
on conflict (canonical_url) do update set
  title=excluded.title,
  publisher=excluded.publisher,
  publication_date=excluded.publication_date,
  source_type=excluded.source_type,
  primary_source=excluded.primary_source,
  credibility_tier=excluded.credibility_tier,
  evidence_classification=excluded.evidence_classification,
  notes=excluded.notes,
  approved_public=excluded.approved_public,
  registry_kind=excluded.registry_kind,
  categorisation=excluded.categorisation,
  signal_type=excluded.signal_type,
  geography=excluded.geography,
  priority=excluded.priority,
  source_weight=excluded.source_weight,
  registry_status=excluded.registry_status,
  registry_active=excluded.registry_active,
  updated_at=now();

with pilot(item_key,source_key,reference_key,canonical_url,title,publication_date,summary) as (
  values
    ('annual-report:SRC-0167:2025','SRC-0167','REF-02658','https://aib.ie/content/dam/frontdoor/investorrelations/docs/resultscentre/annualreport/2025/aib-group-plc-afr-report-2025.pdf','AIB Group plc Annual Financial Report 2025','2026-03-03'::date,'AIB reports on its 2025 performance, customer strategy, digital channels, AI adoption and operational resilience.'),
    ('annual-report:SRC-0168:2025','SRC-0168','REF-02674','https://investorrelations.bankofireland.com/app/uploads/Annual-Report-HoldCo-2025-WEB.pdf','Bank of Ireland Annual Report 2025','2026-03-02'::date,'Bank of Ireland sets out 2025 performance and its Strategy 2028 priorities across relationships, simplification and resilience.'),
    ('annual-report:SRC-0155:2025','SRC-0155','REF-02466','https://www.greatwestlifeco.com/content/dam/lifeco/documents/investor-relations/reports/2026/annual/lifeco-2025-annual-report.pdf','Great-West Lifeco Annual Report 2025',null::date,'Great-West Lifeco reports on its global insurance, retirement and wealth businesses, including Irish Life and its asset-management strategy.'),
    ('annual-report:SRC-0202:2025','SRC-0202','REF-03218','https://www.zurich.com/-/media-assets/project/zurich/dotcom/investor-relations/docs/financial-reports/2025/annual-report-2025-en.pdf','Zurich Insurance Group Annual Report 2025','2026-03-05'::date,'Zurich reports on 2025 performance and its 2025-2027 priorities across Specialty, Middle Market and Life Protection.'),
    ('annual-report:SRC-0192:2025','SRC-0192','REF-03058','https://static.aviva.io/content/dam/aviva-corporate/documents/investors/pdfs/reports/2025/annual-report-and-accounts-2025.pdf','Aviva plc Annual Report and Accounts 2025','2026-03-05'::date,'Aviva reports on 2025 performance, capital-light growth and its diversified businesses in the UK, Canada and Ireland.')
)
insert into public.source_items (
  parent_source_id,reference_target_id,evidence_source_id,item_key,canonical_url,title,
  content_type,publication_date,factual_summary,fetch_status,evidence_classification,
  approved,last_verified_at,metadata
)
select
  parent.id,target.id,evidence.id,pilot.item_key,pilot.canonical_url,pilot.title,
  'application/pdf',pilot.publication_date,pilot.summary,'parsed','primary_company',
  true,'2026-09-01T00:00:00Z'::timestamptz,
  jsonb_build_object('ingestion_mode','bounded_curated_pilot','raw_document_stored',false,'reporting_period','2025','verification','official_company_domain')
from pilot
join public.sources parent on parent.source_key=pilot.source_key
join public.reference_targets target on target.reference_key=pilot.reference_key
join public.sources evidence on evidence.canonical_url=pilot.canonical_url
on conflict (item_key) do update set
  parent_source_id=excluded.parent_source_id,
  reference_target_id=excluded.reference_target_id,
  evidence_source_id=excluded.evidence_source_id,
  canonical_url=excluded.canonical_url,
  title=excluded.title,
  publication_date=excluded.publication_date,
  factual_summary=excluded.factual_summary,
  fetch_status=excluded.fetch_status,
  evidence_classification=excluded.evidence_classification,
  approved=excluded.approved,
  last_verified_at=excluded.last_verified_at,
  metadata=excluded.metadata,
  updated_at=now();

with evidence(item_key,chunk_index,content,page_number,section_label,claim_type) as (
  values
    ('annual-report:SRC-0167:2025',0,'AIB reported that its AI-powered digital assistant supported 1.33 million customers across 56 journeys in 2025; 79.5% chose to proceed after being informed that it was a virtual assistant.',15,'Customer first','digital_capability'),
    ('annual-report:SRC-0167:2025',1,'AIB launched the AIB Life Hub, a regular-savings investment platform, inside its mobile app and plans a next-generation mobile app for 2026.',15,'Customer first','product_strategy'),
    ('annual-report:SRC-0168:2025',0,'Bank of Ireland Strategy 2028 prioritises stronger relationships, a simpler business and a resilient company, supported by investment in digital, data, people and customer insight.',16,'Our new Group Strategy','company_strategy'),
    ('annual-report:SRC-0168:2025',1,'Bank of Ireland set a target to grow Wealth assets under management from EUR 60 billion in 2025 to more than EUR 75 billion by 2028 and plans mobile-first sales and service supported by AI-enabled operations.',17,'Stronger relationships','wealth_strategy'),
    ('annual-report:SRC-0155:2025',0,'Great-West Lifeco reported approximately 40 million customer relationships and CAD 3.3 trillion in total client assets at 31 December 2025. It identifies Irish Life as its life assurance, pensions and investment-management business in Ireland.',2,'Company overview','company_profile'),
    ('annual-report:SRC-0155:2025',1,'Great-West Lifeco describes digital and AI, customer relationships, disciplined capital allocation, cost competitiveness and talent as strategic priorities.',2,'Strategic imperatives','company_strategy'),
    ('annual-report:SRC-0155:2025',2,'Keyridge brings together Irish Life Investment Managers, Setanta and Canada Life Asset Management external funds, with about 300 investment professionals and more than CAD 250 billion in assets under management.',9,'Asset management','wealth_strategy'),
    ('annual-report:SRC-0202:2025',0,'Zurich reported 2025 business operating profit of USD 8.9 billion and net income attributable to shareholders of USD 6.8 billion.',null,'2025 financial highlights','financial_performance'),
    ('annual-report:SRC-0202:2025',1,'Zurich focuses its 2025-2027 structural-growth priorities on Specialty, Middle Market and Life Protection. Life contributes around a quarter of Group business operating profit and Zurich targets 8% annual Life Protection premium growth from 2025 to 2027.',null,'Executing on 2025-2027 priorities','company_strategy'),
    ('annual-report:SRC-0192:2025',0,'Aviva reported 2025 operating profit of GBP 2,203 million and IFRS return on equity of 17.5%.',null,'2025 highlights','financial_performance'),
    ('annual-report:SRC-0192:2025',1,'Aviva reported that 68% of 2025 operating profit came from capital-light businesses including Direct Line and described its position as a diversified insurer with major businesses in the UK, Canada and Ireland.',null,'Strategic progress','company_strategy')
)
insert into public.source_chunks (
  source_item_id,chunk_index,content,content_hash,page_number,section_label,claim_type,metadata
)
select
  item.id,evidence.chunk_index,evidence.content,
  md5(evidence.content),evidence.page_number,evidence.section_label,evidence.claim_type,
  jsonb_build_object('extraction','human_verified_factual_summary','verified_at','2026-09-01')
from evidence
join public.source_items item on item.item_key=evidence.item_key
on conflict (source_item_id,chunk_index) do update set
  content=excluded.content,
  content_hash=excluded.content_hash,
  page_number=excluded.page_number,
  section_label=excluded.section_label,
  claim_type=excluded.claim_type,
  metadata=excluded.metadata;

with links(item_key,organisation_slug,relationship) as (
  values
    ('annual-report:SRC-0167:2025','aib','publisher'),
    ('annual-report:SRC-0168:2025','bank-of-ireland','publisher'),
    ('annual-report:SRC-0155:2025','irish-life','subject'),
    ('annual-report:SRC-0202:2025','zurich-ireland','mentioned'),
    ('annual-report:SRC-0202:2025','zurich-life','mentioned'),
    ('annual-report:SRC-0192:2025','aviva-ireland','mentioned')
)
insert into public.source_item_organisations (source_item_id,organisation_id,relationship)
select item.id,organisation.id,links.relationship
from links
join public.source_items item on item.item_key=links.item_key
join public.organisations organisation on organisation.slug=links.organisation_slug
on conflict do nothing;

-- Fetching remains disabled. These rows record a completed, bounded verification
-- run; they do not activate the catalogue or schedule a backfill.
insert into public.source_ingestion_runs (
  execution_key,run_type,status,discovered_count,fetched_count,parsed_count,rejected_count,error_count,
  started_at,completed_at,metadata
)
values (
  'annual-report-pilot:2025:v1','verification','completed',5,5,5,0,0,
  '2026-09-01T00:00:00Z','2026-09-01T00:00:00Z',
  jsonb_build_object('scope','AIB, Bank of Ireland, Great-West Lifeco, Zurich, Aviva','raw_documents_stored',false,'approved_chunks',11)
)
on conflict (execution_key) do update set
  status=excluded.status,
  discovered_count=excluded.discovered_count,
  fetched_count=excluded.fetched_count,
  parsed_count=excluded.parsed_count,
  rejected_count=excluded.rejected_count,
  error_count=excluded.error_count,
  completed_at=excluded.completed_at,
  metadata=excluded.metadata;
