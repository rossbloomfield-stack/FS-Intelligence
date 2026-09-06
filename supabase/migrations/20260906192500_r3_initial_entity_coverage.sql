-- R3 initial parent/brand coverage from the approved annual-report cohort.
-- These entities are not merged into Irish operating companies because the
-- evidence refers to distinct parent or brand subjects.

insert into public.intelligence_entities (entity_type, canonical_name, canonical_key, geography, metadata)
values
  ('organisation', 'Great-West Lifeco Inc.', 'organisation:great-west-lifeco-inc', 'International', '{"source":"approved annual-report cohort"}'::jsonb),
  ('organisation', 'Aviva plc', 'organisation:aviva-plc', 'UK', '{"source":"approved annual-report cohort"}'::jsonb),
  ('brand', 'Keyridge', 'brand:keyridge', 'International', '{"source":"approved annual-report cohort"}'::jsonb)
on conflict (canonical_key) do update set
  canonical_name=excluded.canonical_name,
  geography=excluded.geography,
  metadata=public.intelligence_entities.metadata || excluded.metadata,
  updated_at=now();

insert into public.intelligence_entity_aliases (entity_id, alias)
select entity.id, alias.alias
from public.intelligence_entities entity
join (values
  ('organisation:great-west-lifeco-inc', 'Great-West Lifeco'),
  ('organisation:great-west-lifeco-inc', 'Great West Lifeco'),
  ('organisation:aviva-plc', 'Aviva plc'),
  ('brand:keyridge', 'Keyridge')
) as alias(canonical_key, alias) on alias.canonical_key=entity.canonical_key
on conflict (entity_id, normalised_alias) do nothing;
