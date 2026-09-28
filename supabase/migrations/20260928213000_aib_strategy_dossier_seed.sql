-- AIB strategy dossier seed
--
-- A bounded, human-verified evidence set for the company-strategy use case.
-- The migration is additive and replay-safe. It deliberately links only the
-- canonical 2025 annual-report item; the duplicate www URL remains unapproved
-- and is not counted as independent corroboration.

-- RTÉ is an independent publisher, so retain a distinct parent source rather
-- than placing its article under the AIB source registry entry.
insert into public.sources (
  source_key,url,canonical_url,title,publisher,source_type,primary_source,
  credibility_tier,evidence_classification,notes,approved_public,registry_kind,
  canonical_domain,source_class,categorisation,signal_type,geography,priority,
  source_weight,registry_status,registry_active,access_licensing_note,
  storage_policy,implementation_notes
)
values (
  'SRC-AIBDOSSIER-RTE',
  'https://www.rte.ie/news/business/',
  'https://www.rte.ie/news/business/',
  'RTÉ Business',
  'RTÉ News',
  'News / media',
  false,
  2,
  'source_registry',
  'Independent Irish business-news source used for corroborating context.',
  false,
  'parent_source',
  'www.rte.ie',
  'News / media',
  'Company performance and strategy',
  'hard',
  'Ireland',
  'P1',
  0.850,
  'approved',
  true,
  'Public article metadata and short factual summaries only.',
  'Store metadata and short factual evidence passages; link to the original.',
  'Bounded AIB strategy-dossier source; no broad crawling is activated.'
)
on conflict (canonical_url) do update set
  title=excluded.title,
  publisher=excluded.publisher,
  source_type=excluded.source_type,
  primary_source=excluded.primary_source,
  credibility_tier=excluded.credibility_tier,
  evidence_classification=excluded.evidence_classification,
  notes=excluded.notes,
  registry_kind=excluded.registry_kind,
  canonical_domain=excluded.canonical_domain,
  source_class=excluded.source_class,
  categorisation=excluded.categorisation,
  signal_type=excluded.signal_type,
  geography=excluded.geography,
  priority=excluded.priority,
  source_weight=excluded.source_weight,
  registry_status=excluded.registry_status,
  registry_active=excluded.registry_active,
  access_licensing_note=excluded.access_licensing_note,
  storage_policy=excluded.storage_policy,
  implementation_notes=excluded.implementation_notes,
  updated_at=now();

-- Exact evidence URLs. Official results and careers material are Tier 1
-- primary evidence. RTÉ is Tier 2 independent corroboration.
with documents(
  canonical_url,title,publisher,source_type,publication_date,primary_source,
  credibility_tier,evidence_classification,source_class,categorisation,
  signal_type,priority,source_weight,canonical_domain,notes
) as (
  values
    (
      'https://www.aib.ie/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/aib-group-plc-q1-2026-trading-update.pdf',
      'AIB Group plc Q1 2026 Trading Update',
      'AIB Group plc','company_results','2026-04-30'::date,true,1,
      'primary_company','Financial-services provider','Company strategy and results',
      'hard','P0',1.000,'www.aib.ie',
      'Official unaudited Q1 2026 trading update.'
    ),
    (
      'https://www.aib.ie/investorrelations/financial-information/results-centre/2026-financial-results',
      'AIB Group plc 2026 Half-Year Financial Results',
      'AIB Group plc','company_results','2026-07-30'::date,true,1,
      'primary_company','Financial-services provider','Company strategy and results',
      'hard','P0',1.000,'www.aib.ie',
      'Official AIB half-year results page.'
    ),
    (
      'https://www.rte.ie/news/business/2026/0730/1585739-aib-half-year-results/',
      'AIB reports half year profits of €939m, with new lending up 10%',
      'RTÉ News','news','2026-07-30'::date,false,2,
      'independent_news','News / media','Company performance and strategy',
      'hard','P1',0.850,'www.rte.ie',
      'Independent report of AIB first-half 2026 results and management commentary.'
    ),
    (
      'https://jobs.aib.ie/aib/job/Dublin-Databricks-Platform-Lead-IE/1371044557/',
      'Databricks Platform Lead',
      'Allied Irish Bank','company_careers','2026-09-02'::date,true,1,
      'primary_company_careers','Company careers','Talent and capability signals',
      'soft','P1',0.800,'jobs.aib.ie',
      'Dated official AIB vacancy; directional hiring evidence only.'
    ),
    (
      'https://jobs.aib.ie/aib/job/Dublin-Enterprise-Delivery-Graduate-Programme-2027-IE/1373068157/',
      'Enterprise Delivery Graduate Programme 2027',
      'Allied Irish Bank','company_careers','2026-09-24'::date,true,1,
      'primary_company_careers','Company careers','Talent and capability signals',
      'soft','P1',0.800,'jobs.aib.ie',
      'Dated official AIB graduate vacancy; directional hiring evidence only.'
    )
)
insert into public.sources (
  url,canonical_url,title,publisher,source_type,publication_date,primary_source,
  credibility_tier,evidence_classification,notes,approved_public,registry_kind,
  canonical_domain,source_class,categorisation,signal_type,geography,priority,
  source_weight,registry_status,registry_active,access_licensing_note,
  storage_policy,implementation_notes
)
select
  document.canonical_url,document.canonical_url,document.title,document.publisher,
  document.source_type,document.publication_date,document.primary_source,
  document.credibility_tier,document.evidence_classification,document.notes,
  true,'document',document.canonical_domain,document.source_class,
  document.categorisation,document.signal_type,'Ireland',document.priority,
  document.source_weight,'approved',true,
  'Public source; retain only metadata and short factual evidence passages.',
  'Store metadata and short factual evidence passages; link to the original.',
  'Human-verified for the bounded AIB strategy dossier on 2026-09-28.'
from documents document
on conflict (canonical_url) do update set
  title=excluded.title,
  publisher=excluded.publisher,
  source_type=excluded.source_type,
  publication_date=excluded.publication_date,
  primary_source=excluded.primary_source,
  credibility_tier=excluded.credibility_tier,
  evidence_classification=excluded.evidence_classification,
  notes=excluded.notes,
  approved_public=excluded.approved_public,
  registry_kind=excluded.registry_kind,
  canonical_domain=excluded.canonical_domain,
  source_class=excluded.source_class,
  categorisation=excluded.categorisation,
  signal_type=excluded.signal_type,
  geography=excluded.geography,
  priority=excluded.priority,
  source_weight=excluded.source_weight,
  registry_status=excluded.registry_status,
  registry_active=excluded.registry_active,
  access_licensing_note=excluded.access_licensing_note,
  storage_policy=excluded.storage_policy,
  implementation_notes=excluded.implementation_notes,
  updated_at=now();

-- Promote the already-parsed official Q1 and H1 items using the deterministic
-- publication dates printed in the Q1 PDF and on the H1 results page.
with verified(
  item_key,canonical_url,title,content_type,publication_date,effective_date,
  summary,extracted_facts
) as (
  values
    (
      'r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',
      'https://www.aib.ie/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/aib-group-plc-q1-2026-trading-update.pdf',
      'AIB Group plc - Q1 2026 Trading Update','application/pdf',
      '2026-04-30'::date,'2026-03-31'::date,
      'AIB reported continued delivery in the final year of its 2024-2026 strategic cycle and reiterated its 2026 guidance.',
      '[{"fact":"strategic_cycle","value":"final year of 2024-2026 cycle"},{"fact":"new_lending","value":3.6,"unit":"EUR billion","period":"Q1 2026"}]'::jsonb
    ),
    (
      'r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20',
      'https://www.aib.ie/investorrelations/financial-information/results-centre/2026-financial-results',
      '2026 Financial Results','text/html',
      '2026-07-30'::date,'2026-06-30'::date,
      'AIB reported first-half 2026 profit after tax of €939 million and continued momentum in executing its strategy.',
      '[{"fact":"profit_after_tax","value":939,"unit":"EUR million","period":"H1 2026"}]'::jsonb
    )
)
insert into public.source_items (
  parent_source_id,evidence_source_id,item_key,canonical_url,title,content_type,
  publication_date,effective_date,factual_summary,extracted_facts,content_hash,
  fetch_status,evidence_classification,approved,last_verified_at,metadata
)
select
  parent.id,evidence.id,verified.item_key,verified.canonical_url,verified.title,
  verified.content_type,verified.publication_date,verified.effective_date,
  verified.summary,verified.extracted_facts,
  encode(digest(verified.item_key || '|' || verified.summary,'sha256'),'hex'),
  'parsed','primary_company',true,'2026-09-28T00:00:00Z'::timestamptz,
  jsonb_build_object(
    'approvalRequiredBeforeRetrieval',false,
    'approvalPolicy','human_verified_aib_dossier_v1',
    'publicationDateSource','official_document_or_results_page',
    'verifiedAt','2026-09-28',
    'ingestion_mode','bounded_human_verified',
    'raw_document_stored',false
  )
from verified
join public.sources parent on parent.source_key='SRC-0167'
join public.sources evidence on evidence.canonical_url=verified.canonical_url
on conflict (item_key) do update set
  parent_source_id=excluded.parent_source_id,
  evidence_source_id=excluded.evidence_source_id,
  canonical_url=excluded.canonical_url,
  title=excluded.title,
  content_type=excluded.content_type,
  publication_date=excluded.publication_date,
  effective_date=excluded.effective_date,
  factual_summary=excluded.factual_summary,
  extracted_facts=excluded.extracted_facts,
  fetch_status=excluded.fetch_status,
  evidence_classification=excluded.evidence_classification,
  approved=excluded.approved,
  rejection_reason=null,
  last_verified_at=excluded.last_verified_at,
  metadata=public.source_items.metadata || excluded.metadata,
  updated_at=now();

-- Add the independent report and two official careers records as bounded
-- items. The job records remain soft signals and do not assert deployed
-- technology, investment amounts or business outcomes.
with items(
  item_key,parent_source_key,canonical_url,title,publication_date,effective_date,
  factual_summary,evidence_classification,extracted_facts
) as (
  values
    (
      'aib-dossier:rte:h1-2026','SRC-AIBDOSSIER-RTE',
      'https://www.rte.ie/news/business/2026/0730/1585739-aib-half-year-results/',
      'AIB reports half year profits of €939m, with new lending up 10%',
      '2026-07-30'::date,'2026-06-30'::date,
      'RTÉ reported AIB first-half 2026 profit after tax of €939 million and new lending growth of 10%.',
      'independent_news',
      '[{"fact":"profit_after_tax","value":939,"unit":"EUR million","period":"H1 2026"},{"fact":"new_lending_growth","value":10,"unit":"percent","period":"H1 2026"}]'::jsonb
    ),
    (
      'aib-dossier:careers:databricks-platform-lead:2026-09-02','SRC-0167',
      'https://jobs.aib.ie/aib/job/Dublin-Databricks-Platform-Lead-IE/1371044557/',
      'Databricks Platform Lead','2026-09-02'::date,'2026-09-02'::date,
      'AIB advertised a platform-lead role for cloud data and analytics infrastructure supporting modern analytics and AI use cases.',
      'primary_company_careers',
      '[{"fact":"job_posting","role":"Databricks Platform Lead","date":"2026-09-02"}]'::jsonb
    ),
    (
      'aib-dossier:careers:enterprise-delivery-graduate:2026-09-24','SRC-0167',
      'https://jobs.aib.ie/aib/job/Dublin-Enterprise-Delivery-Graduate-Programme-2027-IE/1373068157/',
      'Enterprise Delivery Graduate Programme 2027','2026-09-24'::date,'2026-09-24'::date,
      'AIB advertised an enterprise-delivery graduate programme covering automation, AI, transformation, engineering, cyber, cloud, data and resilience.',
      'primary_company_careers',
      '[{"fact":"job_posting","role":"Enterprise Delivery Graduate Programme 2027","date":"2026-09-24"}]'::jsonb
    )
)
insert into public.source_items (
  parent_source_id,evidence_source_id,item_key,canonical_url,title,content_type,
  publication_date,effective_date,factual_summary,extracted_facts,content_hash,
  fetch_status,evidence_classification,approved,last_verified_at,metadata
)
select
  parent.id,evidence.id,item.item_key,item.canonical_url,item.title,'text/html',
  item.publication_date,item.effective_date,item.factual_summary,item.extracted_facts,
  encode(digest(item.item_key || '|' || item.factual_summary,'sha256'),'hex'),
  'parsed',item.evidence_classification,true,
  '2026-09-28T00:00:00Z'::timestamptz,
  jsonb_build_object(
    'ingestion_mode','bounded_human_verified',
    'raw_document_stored',false,
    'approvalRequiredBeforeRetrieval',false,
    'verifiedAt','2026-09-28',
    'release','AIB strategy dossier v1'
  )
from items item
join public.sources parent on parent.source_key=item.parent_source_key
join public.sources evidence on evidence.canonical_url=item.canonical_url
on conflict (item_key) do update set
  parent_source_id=excluded.parent_source_id,
  evidence_source_id=excluded.evidence_source_id,
  canonical_url=excluded.canonical_url,
  title=excluded.title,
  content_type=excluded.content_type,
  publication_date=excluded.publication_date,
  effective_date=excluded.effective_date,
  factual_summary=excluded.factual_summary,
  extracted_facts=excluded.extracted_facts,
  content_hash=excluded.content_hash,
  fetch_status=excluded.fetch_status,
  evidence_classification=excluded.evidence_classification,
  approved=excluded.approved,
  last_verified_at=excluded.last_verified_at,
  metadata=public.source_items.metadata || excluded.metadata,
  updated_at=now();

-- Enrich the canonical, already-approved annual report. These are concise
-- paraphrases of the report passages, not replacement copies of the PDF.
with evidence(item_key,chunk_index,content,page_number,section_label,claim_type,source_family) as (
  values
    (
      'annual-report:SRC-0167:2025',2,
      'AIB states that its strategy is to be the bank of choice in Ireland, combining a broad customer franchise with modern digital-first savings, investment and protection services.',
      10,'Chief Executive review','company_strategy','aib-official-annual-report-2025'
    ),
    (
      'annual-report:SRC-0167:2025',3,
      'AIB reported 2025 group assets under management of €18.3 billion, up from €16.8 billion in 2024, and described Goodbody and AIB life as platforms for fee-income growth and revenue diversification.',
      10,'Chief Executive review','growth_strategy','aib-official-annual-report-2025'
    ),
    (
      'annual-report:SRC-0167:2025',4,
      'AIB reported that 130 financial advisers guided more than 34,000 customers in 2025 and that its customer-segmentation programme supports tailored propositions, communications and digitalisation.',
      11,'Chief Executive review','customer_strategy','aib-official-annual-report-2025'
    ),
    (
      'annual-report:SRC-0167:2025',5,
      'AIB reported investment in technology modernisation, cyber resilience, data infrastructure, AI governance and cloud architecture; it also reported 99.99% availability for mission-critical services in 2025.',
      12,'Chief Executive review','technology_strategy','aib-official-annual-report-2025'
    ),
    (
      'annual-report:SRC-0167:2025',6,
      'AIB simplified its management structure in 2025 around Retail Banking including AIB UK, Capital Markets, and Climate & Infrastructure Capital.',
      6,'AIB Group at a glance','operating_model','aib-official-annual-report-2025'
    ),
    (
      'r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',9,
      'AIB said Q1 2026 was the final year of its 2024-2026 strategic cycle. Its medium-term targets included 15% RoTE, CET1 above 14%, absolute costs below €2 billion and a cost-income ratio below 50%.',
      2,'Strategic cycle and targets','strategy_execution','aib-official-results-2026'
    ),
    (
      'r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',10,
      'AIB reported Q1 2026 new lending of €3.6 billion, up 11% year on year, with green and transition lending representing 42% of new lending.',
      1,'Q1 2026 highlights','financial_performance','aib-official-results-2026'
    ),
    (
      'r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20',2,
      'AIB reported first-half 2026 profit after tax of €939 million and described continued momentum in executing its strategy.',
      null,'2026 Half-Year Financial Results','strategy_execution','aib-official-results-2026'
    ),
    (
      'aib-dossier:rte:h1-2026',0,
      'RTÉ reported AIB first-half 2026 profit after tax of €939 million, total new lending of €7.5 billion and a 30% Irish mortgage-market share.',
      null,'Independent results report','financial_performance','rte-news'
    ),
    (
      'aib-dossier:rte:h1-2026',1,
      'RTÉ reported management commentary that AIB was broadening its range of products and services and prioritising digital product enhancements; the article also noted rising competition in Irish banking.',
      null,'Independent strategy context','company_strategy','rte-news'
    ),
    (
      'aib-dossier:careers:databricks-platform-lead:2026-09-02',0,
      'On 2 September 2026 AIB advertised a Databricks Platform Lead role in its Data Platforms team. The role covered Azure and Databricks platform delivery for analytics and AI use cases.',
      null,'Official vacancy','capability_hiring','aib-official-careers-2026'
    ),
    (
      'aib-dossier:careers:enterprise-delivery-graduate:2026-09-24',0,
      'On 24 September 2026 AIB advertised an Enterprise Delivery graduate programme covering automation, AI, transformation, engineering, cyber, cloud, data and analytics, and resilience.',
      null,'Official vacancy','capability_hiring','aib-official-careers-2026'
    )
)
insert into public.source_chunks (
  source_item_id,chunk_index,content,content_hash,page_number,section_label,
  claim_type,metadata
)
select
  item.id,evidence.chunk_index,evidence.content,md5(evidence.content),
  evidence.page_number,evidence.section_label,evidence.claim_type,
  jsonb_build_object(
    'extraction','human_verified_factual_summary',
    'verifiedAt','2026-09-28',
    'sourceFamilyKey',evidence.source_family,
    'release','AIB strategy dossier v1'
  )
from evidence
join public.source_items item on item.item_key=evidence.item_key
on conflict (source_item_id,chunk_index) do update set
  content=excluded.content,
  content_hash=excluded.content_hash,
  page_number=excluded.page_number,
  section_label=excluded.section_label,
  claim_type=excluded.claim_type,
  metadata=public.source_chunks.metadata || excluded.metadata;

-- Ensure each dossier item has a version anchor for observation lineage. Do
-- not create a second version where R3 already backfilled one.
insert into public.source_item_versions (
  source_item_id,version_number,content_hash,canonical_url,title,publication_date,
  effective_date,announcement_date,change_classification,metadata
)
select
  item.id,1,
  coalesce(nullif(item.content_hash,''),encode(digest(item.item_key || ':aib-dossier-v1','sha256'),'hex')),
  item.canonical_url,item.title,item.publication_date,item.effective_date,
  item.announcement_date,'material',
  jsonb_build_object('backfilledBy','AIB strategy dossier v1','verifiedAt','2026-09-28')
from public.source_items item
where item.item_key in (
  'annual-report:SRC-0167:2025',
  'r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',
  'r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20',
  'aib-dossier:rte:h1-2026',
  'aib-dossier:careers:databricks-platform-lead:2026-09-02',
  'aib-dossier:careers:enterprise-delivery-graduate:2026-09-24'
)
and not exists (
  select 1 from public.source_item_versions version
  where version.source_item_id=item.id
);

-- Keep an existing backfilled version aligned with the now-verified item
-- dates. This does not create a new version or alter its content hash.
update public.source_item_versions version
set
  publication_date=item.publication_date,
  effective_date=item.effective_date,
  canonical_url=item.canonical_url,
  title=item.title,
  change_classification='material',
  metadata=version.metadata || jsonb_build_object(
    'dateVerifiedBy','AIB strategy dossier v1',
    'verifiedAt','2026-09-28'
  )
from public.source_items item
where version.source_item_id=item.id
  and item.item_key in (
    'annual-report:SRC-0167:2025',
    'r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',
    'r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20',
    'aib-dossier:rte:h1-2026',
    'aib-dossier:careers:databricks-platform-lead:2026-09-02',
    'aib-dossier:careers:enterprise-delivery-graduate:2026-09-24'
  );

-- Every dossier item, including the canonical annual report, is explicitly
-- linked to the canonical AIB organisation.
insert into public.source_item_organisations (
  source_item_id,organisation_id,relationship
)
select item.id,organisation.id,'subject'
from public.source_items item
join public.organisations organisation on organisation.slug='aib'
where item.item_key in (
  'annual-report:SRC-0167:2025',
  'r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',
  'r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20',
  'aib-dossier:rte:h1-2026',
  'aib-dossier:careers:databricks-platform-lead:2026-09-02',
  'aib-dossier:careers:enterprise-delivery-graduate:2026-09-24'
)
on conflict do nothing;

-- Source-grounded observations. Hiring observations are deliberately marked
-- as soft, same-family directional evidence; they are not independent proof
-- of deployed technology or realised outcomes.
with observation_data(
  stable_key,item_key,chunk_index,observation_type,event_type,theme,capability,
  observation_text,direction,event_date,published_at,extraction_confidence,
  evidence_directness,source_authority,is_primary,is_independent,source_family,
  materiality
) as (
  values
    (
      'aib:strategy:2025:customer-wealth','annual-report:SRC-0167:2025',2,
      'strategic_priority','strategic_priority','customer_platform','digital_distribution',
      'AIB states a customer-led, digital-first strategy that also expands savings, investment and protection services.',
      'stable','2025-12-31'::date,'2026-03-03'::date,1.000,0.980,1.000,true,false,
      'aib-official-annual-report-2025',0.900
    ),
    (
      'aib:strategy:2025:technology-ai','annual-report:SRC-0167:2025',5,
      'technology_investment','technology_investment','technology_modernisation','data_ai_cloud_resilience',
      'AIB reports technology modernisation, cloud, cyber resilience, data infrastructure and AI-governance investment.',
      'expanding','2025-12-31'::date,'2026-03-03'::date,1.000,0.980,1.000,true,false,
      'aib-official-annual-report-2025',0.900
    ),
    (
      'aib:strategy:2025:operating-model','annual-report:SRC-0167:2025',6,
      'organisational_change','organisational_change','cost_transformation','operating_model',
      'AIB simplified its management structure around three business lines during 2025.',
      'new',null::date,'2026-03-03'::date,1.000,0.980,1.000,true,false,
      'aib-official-annual-report-2025',0.750
    ),
    (
      'aib:strategy:2026:q1-execution','r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d',9,
      'strategic_change','financial_performance','strategy_execution','financial_and_operational_targets',
      'AIB reiterated the targets for the final year of its 2024-2026 strategic cycle in its Q1 update.',
      'stable','2026-03-31'::date,'2026-04-30'::date,1.000,0.980,1.000,true,false,
      'aib-official-results-2026',0.850
    ),
    (
      'aib:strategy:2026:h1-execution','r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20',2,
      'financial_performance','financial_performance','strategy_execution','business_execution',
      'AIB reported first-half profit after tax of €939 million and continued strategy execution.',
      'stable','2026-06-30'::date,'2026-07-30'::date,1.000,0.980,1.000,true,false,
      'aib-official-results-2026',0.850
    ),
    (
      'aib:strategy:2026:rte-context','aib-dossier:rte:h1-2026',1,
      'strategic_priority','management_commentary','digital_distribution','digital_product_enhancement',
      'RTÉ reported management commentary on broadening products and services and prioritising digital enhancements.',
      'expanding','2026-07-30'::date,'2026-07-30'::date,0.950,0.850,0.850,false,true,
      'rte-news',0.750
    ),
    (
      'aib:hiring:2026:databricks-platform-lead','aib-dossier:careers:databricks-platform-lead:2026-09-02',0,
      'capability_hiring','hiring_activity','technology_modernisation','data_ai_cloud_platform',
      'AIB advertised a Databricks platform-lead role for cloud data, analytics and AI-use-case support.',
      'new','2026-09-02'::date,'2026-09-02'::date,1.000,0.900,0.900,true,false,
      'aib-official-careers-2026',0.600
    ),
    (
      'aib:hiring:2026:enterprise-delivery-graduate','aib-dossier:careers:enterprise-delivery-graduate:2026-09-24',0,
      'capability_hiring','hiring_activity','technology_modernisation','enterprise_delivery',
      'AIB advertised a graduate programme spanning automation, AI, cloud, cyber, data, transformation and resilience.',
      'new','2026-09-24'::date,'2026-09-24'::date,1.000,0.900,0.900,true,false,
      'aib-official-careers-2026',0.550
    )
)
insert into public.intelligence_observations (
  stable_key,document_id,document_version_id,source_id,evidence_chunk_id,
  entity_id,raw_entity_text,entity_resolution_confidence,observation_type,
  event_type,theme,capability,market,geography,observation_text,evidence_text,
  evidence_section_label,evidence_page_number,direction,event_date,published_at,
  extraction_confidence,evidence_directness,source_authority,is_primary_source,
  is_independent_source,source_family_key,model_version,prompt_version,
  extraction_version,schema_version,review_status,materiality_score
)
select
  data.stable_key,item.id,version.id,item.evidence_source_id,chunk.id,
  entity.id,'AIB',1.000,data.observation_type,data.event_type,data.theme,
  data.capability,'Irish financial services','Ireland',data.observation_text,
  chunk.content,chunk.section_label,chunk.page_number,data.direction,
  data.event_date,data.published_at,data.extraction_confidence,
  data.evidence_directness,data.source_authority,data.is_primary,
  data.is_independent,data.source_family,'human-verified',
  'aib-strategy-dossier-v1','aib-strategy-dossier-v1','r3-observation-v1',
  'accepted',data.materiality
from observation_data data
join public.source_items item on item.item_key=data.item_key
join public.source_chunks chunk on chunk.source_item_id=item.id and chunk.chunk_index=data.chunk_index
join public.intelligence_entities entity on entity.organisation_id=(
  select organisation.id from public.organisations organisation where organisation.slug='aib'
)
join lateral (
  select candidate.id
  from public.source_item_versions candidate
  where candidate.source_item_id=item.id
  order by candidate.version_number desc
  limit 1
) version on true
on conflict (stable_key) do update set
  document_id=excluded.document_id,
  document_version_id=excluded.document_version_id,
  source_id=excluded.source_id,
  evidence_chunk_id=excluded.evidence_chunk_id,
  entity_id=excluded.entity_id,
  raw_entity_text=excluded.raw_entity_text,
  entity_resolution_confidence=excluded.entity_resolution_confidence,
  observation_type=excluded.observation_type,
  event_type=excluded.event_type,
  theme=excluded.theme,
  capability=excluded.capability,
  market=excluded.market,
  geography=excluded.geography,
  observation_text=excluded.observation_text,
  evidence_text=excluded.evidence_text,
  evidence_section_label=excluded.evidence_section_label,
  evidence_page_number=excluded.evidence_page_number,
  direction=excluded.direction,
  event_date=excluded.event_date,
  published_at=excluded.published_at,
  extraction_confidence=excluded.extraction_confidence,
  evidence_directness=excluded.evidence_directness,
  source_authority=excluded.source_authority,
  is_primary_source=excluded.is_primary_source,
  is_independent_source=excluded.is_independent_source,
  source_family_key=excluded.source_family_key,
  model_version=excluded.model_version,
  prompt_version=excluded.prompt_version,
  extraction_version=excluded.extraction_version,
  schema_version=excluded.schema_version,
  review_status=excluded.review_status,
  materiality_score=excluded.materiality_score,
  updated_at=now();

insert into public.intelligence_observation_entities (
  observation_id,entity_id,relationship,resolution_confidence
)
select observation.id,entity.id,'primary',1.000
from public.intelligence_observations observation
join public.intelligence_entities entity on entity.organisation_id=(
  select organisation.id from public.organisations organisation where organisation.slug='aib'
)
where observation.stable_key in (
  'aib:strategy:2025:customer-wealth',
  'aib:strategy:2025:technology-ai',
  'aib:strategy:2025:operating-model',
  'aib:strategy:2026:q1-execution',
  'aib:strategy:2026:h1-execution',
  'aib:strategy:2026:rte-context',
  'aib:hiring:2026:databricks-platform-lead',
  'aib:hiring:2026:enterprise-delivery-graduate'
)
on conflict (observation_id,entity_id,relationship) do update set
  resolution_confidence=excluded.resolution_confidence;

with signal_data(
  canonical_key,title,summary,categorisation,signal_type,event_date,
  publication_date,materiality_score,confidence,interpretation,signal_family,
  direction,magnitude,impact_score,novelty_score,authority_score,recency_score,
  composite_score,status,themes,capabilities,first_observed,last_observed,
  novelty,confidence_score,source_authority_score,corroboration_count,
  independent_source_count,strategic_relevance,momentum,signal_score,
  reasoning_summary
) as (
  values
    (
      'aib-strategy-execution-2026',
      'AIB is executing the final year of its current strategic cycle',
      'AIB disclosures and first-half results show continued execution across customer growth, digital distribution, revenue diversification, climate lending and operational resilience.',
      'Company strategy and execution','hard','2026-06-30'::date,'2026-07-30'::date,
      5,'high'::public.intelligence_confidence,
      'The evidence shows continuity between AIB’s stated 2025 priorities and its reported 2026 execution. It does not yet establish the content of AIB’s next strategic cycle.',
      'company_strategy','unchanged','high',5,3,1.000,0.950,4.500,
      'confirmed',array['customer_platform','digital_distribution','climate_finance','cost_transformation','technology_modernisation']::text[],
      array['retail_banking','wealth_distribution','digital_channels','operational_resilience']::text[],
      '2025-12-31T00:00:00Z'::timestamptz,'2026-07-30T00:00:00Z'::timestamptz,
      0.600,88.00,1.000,3,1,0.950,0.700,90.000,
      'Three official documents across two source families support the assessment; one independent RTÉ report corroborates first-half execution. The duplicate annual-report URL is excluded.'
    ),
    (
      'aib-data-ai-capability-hiring-2026',
      'AIB advertised data and enterprise-delivery capability roles',
      'Two dated AIB careers postings cover cloud data platforms, analytics and AI use cases, automation, cyber, transformation and resilience.',
      'Talent and capability signals','soft','2026-09-24'::date,'2026-09-24'::date,
      3,'medium'::public.intelligence_confidence,
      'This is directional hiring evidence only. It does not establish deployed technology, investment level or realised business outcomes.',
      'capability_hiring','new','low',3,3,0.900,1.000,3.200,
      'emerging',array['technology_modernisation','ai','data','operational_resilience']::text[],
      array['data_ai_cloud_platform','enterprise_delivery']::text[],
      '2026-09-02T00:00:00Z'::timestamptz,'2026-09-24T00:00:00Z'::timestamptz,
      0.700,62.00,0.900,1,0,0.750,0.550,58.000,
      'Two official careers observations from one source family provide a soft signal; no independent corroboration is claimed.'
    )
)
insert into public.intelligence_signals (
  canonical_key,title,summary,categorisation,signal_type,geography,
  organisation_id,event_date,publication_date,materiality_score,confidence,
  analyst_interpretation,ireland_read_across,status,approved,signal_family,
  direction,magnitude,impact_score,novelty_score,authority_score,recency_score,
  composite_score,scoring_version,primary_entity_id,entity_ids,themes,
  capabilities,markets,geographies,first_observed_at,last_observed_at,novelty,
  confidence_score,confidence_components,source_authority_score,
  corroboration_count,independent_source_count,contradiction_count,
  strategic_relevance,relevance_components,momentum,signal_score,
  reasoning_summary,extraction_version,lifecycle_status,important
)
select
  data.canonical_key,data.title,data.summary,data.categorisation,data.signal_type,
  'Ireland',organisation.id,data.event_date,data.publication_date,
  data.materiality_score,data.confidence,data.interpretation,null,data.status,true,
  data.signal_family,data.direction,data.magnitude,data.impact_score,
  data.novelty_score,data.authority_score,data.recency_score,data.composite_score,
  'aib-strategy-dossier-v1',entity.id,array[entity.id],data.themes,
  data.capabilities,array['Irish financial services']::text[],array['Ireland']::text[],
  data.first_observed,data.last_observed,data.novelty,data.confidence_score,
  jsonb_build_object(
    'evidenceDirectness',case when data.signal_type='hard' then 0.98 else 0.90 end,
    'sourceAuthority',data.source_authority_score,
    'independentSources',data.independent_source_count,
    'sourceFamilyDeduplication',true
  ),
  data.source_authority_score,data.corroboration_count,
  data.independent_source_count,0,data.strategic_relevance,
  jsonb_build_object('organisationProximity',1,'themeRelevance',data.strategic_relevance),
  data.momentum,data.signal_score,data.reasoning_summary,'aib-strategy-dossier-v1',
  data.status,data.signal_type='hard'
from signal_data data
join public.organisations organisation on organisation.slug='aib'
join public.intelligence_entities entity on entity.organisation_id=organisation.id
on conflict (canonical_key) do update set
  title=excluded.title,
  summary=excluded.summary,
  categorisation=excluded.categorisation,
  signal_type=excluded.signal_type,
  geography=excluded.geography,
  organisation_id=excluded.organisation_id,
  event_date=excluded.event_date,
  publication_date=excluded.publication_date,
  materiality_score=excluded.materiality_score,
  confidence=excluded.confidence,
  analyst_interpretation=excluded.analyst_interpretation,
  status=excluded.status,
  approved=excluded.approved,
  signal_family=excluded.signal_family,
  direction=excluded.direction,
  magnitude=excluded.magnitude,
  impact_score=excluded.impact_score,
  novelty_score=excluded.novelty_score,
  authority_score=excluded.authority_score,
  recency_score=excluded.recency_score,
  composite_score=excluded.composite_score,
  scoring_version=excluded.scoring_version,
  primary_entity_id=excluded.primary_entity_id,
  entity_ids=excluded.entity_ids,
  themes=excluded.themes,
  capabilities=excluded.capabilities,
  markets=excluded.markets,
  geographies=excluded.geographies,
  first_observed_at=excluded.first_observed_at,
  last_observed_at=excluded.last_observed_at,
  novelty=excluded.novelty,
  confidence_score=excluded.confidence_score,
  confidence_components=excluded.confidence_components,
  source_authority_score=excluded.source_authority_score,
  corroboration_count=excluded.corroboration_count,
  independent_source_count=excluded.independent_source_count,
  contradiction_count=excluded.contradiction_count,
  strategic_relevance=excluded.strategic_relevance,
  relevance_components=excluded.relevance_components,
  momentum=excluded.momentum,
  signal_score=excluded.signal_score,
  reasoning_summary=excluded.reasoning_summary,
  extraction_version=excluded.extraction_version,
  lifecycle_status=excluded.lifecycle_status,
  important=excluded.important,
  updated_at=now();

with links(signal_key,observation_key,relationship,support_strength) as (
  values
    ('aib-strategy-execution-2026','aib:strategy:2025:customer-wealth','supporting',1.000),
    ('aib-strategy-execution-2026','aib:strategy:2025:technology-ai','supporting',1.000),
    ('aib-strategy-execution-2026','aib:strategy:2025:operating-model','contextual',0.750),
    ('aib-strategy-execution-2026','aib:strategy:2026:q1-execution','supporting',1.000),
    ('aib-strategy-execution-2026','aib:strategy:2026:h1-execution','supporting',1.000),
    ('aib-strategy-execution-2026','aib:strategy:2026:rte-context','corroborating',0.850),
    ('aib-data-ai-capability-hiring-2026','aib:hiring:2026:databricks-platform-lead','supporting',0.750),
    ('aib-data-ai-capability-hiring-2026','aib:hiring:2026:enterprise-delivery-graduate','supporting',0.700)
)
insert into public.intelligence_signal_observations (
  signal_id,observation_id,relationship,support_strength
)
select signal.id,observation.id,links.relationship,links.support_strength
from links
join public.intelligence_signals signal on signal.canonical_key=links.signal_key
join public.intelligence_observations observation on observation.stable_key=links.observation_key
on conflict (signal_id,observation_id) do update set
  relationship=excluded.relationship,
  support_strength=excluded.support_strength;

with links(signal_key,item_key,support_strength,claim_supported) as (
  values
    ('aib-strategy-execution-2026','annual-report:SRC-0167:2025','direct','Declared strategy, growth priorities and technology programme'),
    ('aib-strategy-execution-2026','r5.3:486ade39115240f94cf2abda12435e2c0f158a871b0284a31454cbcd3fb85f8d','direct','Q1 strategic-cycle execution and targets'),
    ('aib-strategy-execution-2026','r5.3:ccfe1d004d1b7035a723001c444704740017d1ad20011675b0d7290d13764b20','direct','H1 execution and reported performance'),
    ('aib-strategy-execution-2026','aib-dossier:rte:h1-2026','corroborating','Independent H1 performance and management context'),
    ('aib-data-ai-capability-hiring-2026','aib-dossier:careers:databricks-platform-lead:2026-09-02','direct','Dated data-platform hiring evidence'),
    ('aib-data-ai-capability-hiring-2026','aib-dossier:careers:enterprise-delivery-graduate:2026-09-24','direct','Dated enterprise-delivery hiring evidence')
)
insert into public.intelligence_signal_sources (
  signal_id,source_item_id,support_strength,claim_supported
)
select signal.id,item.id,links.support_strength,links.claim_supported
from links
join public.intelligence_signals signal on signal.canonical_key=links.signal_key
join public.source_items item on item.item_key=links.item_key
on conflict (signal_id,source_item_id,claim_supported) do update set
  support_strength=excluded.support_strength;

-- Current structured dossier. Source relationships distinguish direct company
-- evidence, independent corroboration and contextual hiring signals.
insert into public.company_strategy_profiles (
  organisation_id,strategy_summary,strategic_priorities,growth_priorities,
  cost_priorities,distribution_strategy,digital_strategy,ai_strategy,
  customer_strategy,product_strategy,acquisition_strategy,
  technology_priorities,key_risks,effective_at,previous_profile_id,confidence,
  approved
)
select
  organisation.id,
  'AIB is completing its 2024-2026 strategic cycle with priorities spanning customer growth, digital-first distribution, savings, investments and protection, climate and infrastructure lending, and operational efficiency and resilience.',
  array['Put customers first','Further green the business','Improve operational efficiency and resilience'],
  array['Grow lending','Diversify revenue through savings, investments and protection','Expand climate and infrastructure finance'],
  array['Maintain cost discipline','Simplify the operating model'],
  array['Combine branch, adviser and digital channels','Use the mobile channel for broader product access'],
  array['Deliver digital-first customer journeys','Use customer segmentation for tailored propositions and communications','Modernise the mobile experience'],
  array['Build data infrastructure and governance for AI','Use AI and automation to reduce complexity'],
  array['Grow and serve the customer franchise','Use segmentation and analytics to tailor support'],
  array['Broaden savings, investments and protection services','Develop wealth and financial-wellbeing propositions'],
  '{}'::text[],
  array['Modernise the technology estate','Invest in cloud and data platforms','Strengthen cyber and operational resilience'],
  array['Competitive pressure in Irish banking','Technology and cyber risk','Macroeconomic and geopolitical uncertainty'],
  '2026-09-24'::date,
  (
    select prior.id
    from public.company_strategy_profiles prior
    where prior.organisation_id=organisation.id
      and prior.effective_at<'2026-09-24'::date
    order by prior.effective_at desc
    limit 1
  ),
  'high'::public.intelligence_confidence,
  true
from public.organisations organisation
where organisation.slug='aib'
on conflict (organisation_id,effective_at) do update set
  strategy_summary=excluded.strategy_summary,
  strategic_priorities=excluded.strategic_priorities,
  growth_priorities=excluded.growth_priorities,
  cost_priorities=excluded.cost_priorities,
  distribution_strategy=excluded.distribution_strategy,
  digital_strategy=excluded.digital_strategy,
  ai_strategy=excluded.ai_strategy,
  customer_strategy=excluded.customer_strategy,
  product_strategy=excluded.product_strategy,
  acquisition_strategy=excluded.acquisition_strategy,
  technology_priorities=excluded.technology_priorities,
  key_risks=excluded.key_risks,
  previous_profile_id=excluded.previous_profile_id,
  confidence=excluded.confidence,
  approved=excluded.approved,
  updated_at=now();

with profile as (
  select strategy.id
  from public.company_strategy_profiles strategy
  join public.organisations organisation on organisation.id=strategy.organisation_id
  where organisation.slug='aib' and strategy.effective_at='2026-09-24'::date
), links(canonical_url,claim_supported,support_strength) as (
  values
    (
      'https://aib.ie/content/dam/frontdoor/investorrelations/docs/resultscentre/annualreport/2025/aib-group-plc-afr-report-2025.pdf',
      'Declared 2025 strategy, growth priorities, customer model and technology programme','direct'
    ),
    (
      'https://www.aib.ie/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/aib-group-plc-q1-2026-trading-update.pdf',
      'Q1 execution and 2024-2026 strategic-cycle targets','direct'
    ),
    (
      'https://www.aib.ie/investorrelations/financial-information/results-centre/2026-financial-results',
      'First-half execution and reported performance','direct'
    ),
    (
      'https://www.rte.ie/news/business/2026/0730/1585739-aib-half-year-results/',
      'Independent first-half performance and management context','corroborating'
    ),
    (
      'https://jobs.aib.ie/aib/job/Dublin-Databricks-Platform-Lead-IE/1371044557/',
      'Directional data-platform and AI-capability hiring evidence','contextual'
    ),
    (
      'https://jobs.aib.ie/aib/job/Dublin-Enterprise-Delivery-Graduate-Programme-2027-IE/1373068157/',
      'Directional enterprise-delivery capability hiring evidence','contextual'
    )
)
insert into public.company_strategy_profile_sources (
  profile_id,source_id,claim_supported,support_strength
)
select profile.id,source.id,links.claim_supported,links.support_strength
from profile
cross join links
join public.sources source on source.canonical_url=links.canonical_url
on conflict (profile_id,source_id,claim_supported) do update set
  support_strength=excluded.support_strength;

insert into public.source_ingestion_runs (
  execution_key,run_type,status,discovered_count,fetched_count,parsed_count,
  rejected_count,error_count,started_at,completed_at,metadata
)
values (
  'aib-strategy-dossier:v1','verification','completed',6,6,6,0,0,
  '2026-09-28T00:00:00Z','2026-09-28T00:00:00Z',
  jsonb_build_object(
    'scope','AIB strategy dossier',
    'officialItems',5,
    'independentItems',1,
    'annualReportDuplicateExcluded',true,
    'rawDocumentsStored',false,
    'verification','exact URLs and deterministic dates checked on 2026-09-28'
  )
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
