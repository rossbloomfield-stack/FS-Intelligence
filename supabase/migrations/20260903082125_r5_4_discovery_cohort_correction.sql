-- Aviva's interactive newsroom currently rejects the bounded server-side
-- client, so retain its fixed approved targets but do not schedule discovery.
update public.source_connectors as connector
set discovery_enabled = false,
    discovery_url = null,
    discovery_include_paths = '{}',
    discovery_exclude_terms = '{}',
    discovery_last_attempted_at = null,
    discovery_last_succeeded_at = null,
    updated_at = now()
from public.sources as source
where connector.source_id = source.id
  and source.source_key = 'SRC-0192';

-- The FCA RSS feed is a stable, server-readable primary regulatory surface.
update public.source_connectors as connector
set endpoint_verified = true,
    endpoint_status = 'Verified',
    approved_for_fetch = true,
    enabled = true,
    discovery_enabled = true,
    discovery_url = 'https://www.fca.org.uk/news/rss.xml',
    discovery_include_paths = array['/news/']::text[],
    discovery_exclude_terms = array[
      'unauthorised firm',
      '(clone)',
      'fines and bans',
      'tribunal upholds',
      'enters administration',
      'bans trio',
      'bans senior manager',
      'ceo banned'
    ]::text[],
    discovery_max_items = 8,
    updated_at = now()
from public.sources as source
where connector.source_id = source.id
  and source.source_key = 'SRC-0131'
  and not connector.terms_review_required;

update public.source_connectors as connector
set discovery_exclude_terms = array[
      'commemorative coin',
      'unauthorised firm',
      'issues warning on unauthorised firm',
      '(clone)'
    ]::text[],
    updated_at = now()
from public.sources as source
where connector.source_id = source.id
  and source.source_key = 'SRC-0001';

update public.source_connectors as connector
set discovery_exclude_terms = array[
      'transaction in own shares',
      'total voting rights',
      'director dealing',
      'preference stock',
      'pdmr'
    ]::text[],
    updated_at = now()
from public.sources as source
where connector.source_id = source.id
  and source.source_key = 'SRC-0168';

update public.sources
set registry_active = true,
    updated_at = now()
where source_key = 'SRC-0131';
