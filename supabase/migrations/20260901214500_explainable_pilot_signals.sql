alter table public.intelligence_signals add column if not exists signal_family text;
alter table public.intelligence_signals add column if not exists direction text;
alter table public.intelligence_signals add column if not exists magnitude text;
alter table public.intelligence_signals add column if not exists impact_score smallint;
alter table public.intelligence_signals add column if not exists novelty_score smallint;
alter table public.intelligence_signals add column if not exists authority_score numeric(4,3);
alter table public.intelligence_signals add column if not exists recency_score numeric(4,3);
alter table public.intelligence_signals add column if not exists composite_score numeric(5,3);
alter table public.intelligence_signals add column if not exists scoring_version text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_direction_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_direction_check
      check (direction is null or direction in ('new','up','unchanged','down','resolved'));
  end if;
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_magnitude_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_magnitude_check
      check (magnitude is null or magnitude in ('low','moderate','high'));
  end if;
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_impact_score_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_impact_score_check
      check (impact_score is null or impact_score between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_novelty_score_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_novelty_score_check
      check (novelty_score is null or novelty_score between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_authority_score_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_authority_score_check
      check (authority_score is null or authority_score between 0 and 1);
  end if;
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_recency_score_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_recency_score_check
      check (recency_score is null or recency_score between 0 and 1);
  end if;
  if not exists (select 1 from pg_constraint where conname='intelligence_signals_composite_score_check' and conrelid='public.intelligence_signals'::regclass) then
    alter table public.intelligence_signals add constraint intelligence_signals_composite_score_check
      check (composite_score is null or composite_score between 0 and 5);
  end if;
end $$;

create index if not exists intelligence_signals_rank_idx
  on public.intelligence_signals (publication_date desc,composite_score desc)
  where approved and status='active';
create index if not exists intelligence_signals_family_idx
  on public.intelligence_signals (signal_family,direction,publication_date desc)
  where approved and status='active';

update public.sources
set publication_date='2026-04-27',updated_at=now()
where canonical_url='https://www.greatwestlifeco.com/content/dam/lifeco/documents/investor-relations/reports/2026/annual/lifeco-2025-annual-report.pdf';

update public.source_items
set publication_date='2026-04-27',
    metadata=metadata || jsonb_build_object('publication_date_basis','PDF modification metadata'),
    updated_at=now()
where item_key='annual-report:SRC-0155:2025';

update public.source_chunks chunk
set page_number=case
  when chunk.chunk_index in (0,1) then 3
  when chunk.chunk_index=2 then 10
  else chunk.page_number end
from public.source_items item
where item.id=chunk.source_item_id and item.item_key='annual-report:SRC-0155:2025';

update public.source_chunks chunk
set page_number=17
from public.source_items item
where item.id=chunk.source_item_id and item.item_key='annual-report:SRC-0167:2025';

with signal_data(canonical_key,title,summary,categorisation,signal_type,geography,organisation_slug,event_date,publication_date,materiality_score,confidence,interpretation,ireland_read_across,signal_family,direction,magnitude,impact_score,novelty_score,authority_score,recency_score,composite_score) as (
  values
    ('annual-2025:aib-ai-digital-distribution','AIB is scaling AI-enabled digital distribution','AIB reports material customer use of its disclosed AI assistant and has embedded savings investment access in its mobile channel.','AI and digital distribution','hard','Ireland','aib','2025-12-31'::date,'2026-03-03'::date,4,'high'::public.intelligence_confidence,'The combination of measured AI usage and in-app investment distribution indicates production deployment rather than experimentation.','Raises the benchmark for integrated digital servicing and wealth distribution in Irish retail banking.','ai_production','new','high',4,4,1.000,0.900,4.350),
    ('annual-2025:boi-wealth-ai-platform','Bank of Ireland is coupling wealth growth with AI-enabled distribution','Strategy 2028 targets more than EUR 75 billion in Wealth AUM by 2028, supported by a scalable platform, mobile-first journeys and AI-enabled operations.','Wealth, AI and digital distribution','hard','Ireland','bank-of-ireland','2025-12-31'::date,'2026-03-02'::date,5,'high'::public.intelligence_confidence,'Banking primacy, wealth capability and digital investment are being managed as a combined growth system.','Integrated Irish financial-services groups should assess whether their advice, banking and wealth journeys reinforce each other at comparable scale.','integrated_wealth','new','high',5,5,1.000,0.900,4.900),
    ('annual-2025:greatwest-keyridge','Great-West Lifeco is consolidating asset-management capability under Keyridge','The parent disclosure combines ILIM, Setanta and Canada Life Asset Management external funds under Keyridge, with more than CAD 250 billion in AUM.','Asset management and operating model','hard','Ireland and international','irish-life','2025-12-31'::date,'2026-04-27'::date,4,'high'::public.intelligence_confidence,'The launch points to a more unified international asset-management platform with scale, distribution and operating-model implications.','Irish Life remains a distinct operating entity while its asset-management capability is connected to a larger parent platform.','asset_management_scale','new','high',4,5,1.000,0.900,4.550),
    ('annual-2025:zurich-life-protection','Zurich is prioritising structural growth in Life Protection','Zurich identifies Life Protection as a structural-growth priority and targets 8% annual premium growth from 2025 to 2027.','Life protection strategy','hard','Global','zurich-life','2025-12-31'::date,'2026-03-05'::date,4,'high'::public.intelligence_confidence,'A quantified multi-year growth target indicates sustained commitment to protection rather than a short-term product campaign.','Irish protection providers should monitor proposition, distribution and underwriting investment by Zurich and other global peers.','protection_growth','new','high',4,4,1.000,0.900,4.350),
    ('annual-2025:aviva-capital-light-growth','Aviva is increasing the weight of capital-light earnings','Aviva reports that 68% of 2025 operating profit came from capital-light businesses including Direct Line.','Portfolio and capital strategy','hard','UK and Ireland','aviva-ireland','2025-12-31'::date,'2026-03-05'::date,4,'high'::public.intelligence_confidence,'The earnings mix supports a strategy centred on diversified, fee-generative and less capital-intensive growth.','Aviva Ireland should be assessed in the context of a group portfolio that is explicitly optimising capital-light growth.','capital_strategy','new','high',4,4,1.000,0.900,4.350)
)
insert into public.intelligence_signals (
  canonical_key,title,summary,categorisation,signal_type,geography,organisation_id,event_date,publication_date,
  materiality_score,confidence,analyst_interpretation,ireland_read_across,status,approved,signal_family,direction,
  magnitude,impact_score,novelty_score,authority_score,recency_score,composite_score,scoring_version
)
select
  data.canonical_key,data.title,data.summary,data.categorisation,data.signal_type,data.geography,organisation.id,
  data.event_date,data.publication_date,data.materiality_score,data.confidence,data.interpretation,data.ireland_read_across,
  'active',true,data.signal_family,data.direction,data.magnitude,data.impact_score,data.novelty_score,data.authority_score,
  data.recency_score,data.composite_score,'annual-pilot-v1'
from signal_data data
join public.organisations organisation on organisation.slug=data.organisation_slug
on conflict (canonical_key) do update set
  title=excluded.title,summary=excluded.summary,categorisation=excluded.categorisation,signal_type=excluded.signal_type,
  geography=excluded.geography,organisation_id=excluded.organisation_id,event_date=excluded.event_date,
  publication_date=excluded.publication_date,materiality_score=excluded.materiality_score,confidence=excluded.confidence,
  analyst_interpretation=excluded.analyst_interpretation,ireland_read_across=excluded.ireland_read_across,
  status=excluded.status,approved=excluded.approved,signal_family=excluded.signal_family,direction=excluded.direction,
  magnitude=excluded.magnitude,impact_score=excluded.impact_score,novelty_score=excluded.novelty_score,
  authority_score=excluded.authority_score,recency_score=excluded.recency_score,composite_score=excluded.composite_score,
  scoring_version=excluded.scoring_version,updated_at=now();

with links(signal_key,item_key,claim_supported) as (
  values
    ('annual-2025:aib-ai-digital-distribution','annual-report:SRC-0167:2025','AI assistant usage and in-app investment distribution'),
    ('annual-2025:boi-wealth-ai-platform','annual-report:SRC-0168:2025','Wealth AUM target and AI-enabled mobile-first strategy'),
    ('annual-2025:greatwest-keyridge','annual-report:SRC-0155:2025','Keyridge structure, scale and Irish Life relationship'),
    ('annual-2025:zurich-life-protection','annual-report:SRC-0202:2025','Life Protection growth priority and target'),
    ('annual-2025:aviva-capital-light-growth','annual-report:SRC-0192:2025','Capital-light operating-profit mix')
)
insert into public.intelligence_signal_sources (signal_id,source_item_id,support_strength,claim_supported)
select signal.id,item.id,'direct',links.claim_supported
from links
join public.intelligence_signals signal on signal.canonical_key=links.signal_key
join public.source_items item on item.item_key=links.item_key
on conflict do nothing;
