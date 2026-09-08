-- Cover R4 foreign keys used by review, merge and graph-maintenance operations.
create index if not exists intelligence_coverage_gaps_entity_idx
  on public.intelligence_coverage_gaps (entity_id) where entity_id is not null;
create index if not exists intelligence_entity_merges_actor_idx
  on public.intelligence_entity_merges (actor_id) where actor_id is not null;
create index if not exists intelligence_entity_merges_source_idx
  on public.intelligence_entity_merges (source_entity_id);
create index if not exists intelligence_entity_merges_target_idx
  on public.intelligence_entity_merges (target_entity_id);
create index if not exists intelligence_relationship_review_actor_idx
  on public.intelligence_relationship_review_events (actor_id) where actor_id is not null;
create index if not exists intelligence_relationship_revisions_changed_by_idx
  on public.intelligence_relationship_revisions (changed_by) where changed_by is not null;
create index if not exists intelligence_relationships_type_idx
  on public.intelligence_relationships (relationship_type);
create index if not exists intelligence_relationships_supersedes_idx
  on public.intelligence_relationships (supersedes_relationship_id) where supersedes_relationship_id is not null;
