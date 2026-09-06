-- R3 performance-advisor remediation: cover every new foreign-key access path.

create index if not exists source_item_versions_previous_idx on public.source_item_versions (previous_version_id) where previous_version_id is not null;
create index if not exists intelligence_entity_group_members_entity_idx on public.intelligence_entity_group_members (entity_id, group_id);
create index if not exists signal_processing_runs_source_item_idx on public.signal_processing_runs (source_item_id, created_at desc) where source_item_id is not null;
create index if not exists intelligence_observations_source_item_idx on public.intelligence_observations (document_id, created_at desc);
create index if not exists intelligence_observations_source_idx on public.intelligence_observations (source_id, created_at desc);
create index if not exists intelligence_observations_chunk_idx on public.intelligence_observations (evidence_chunk_id) where evidence_chunk_id is not null;
create index if not exists intelligence_observations_run_idx on public.intelligence_observations (processing_run_id) where processing_run_id is not null;
create index if not exists intelligence_observation_entities_entity_idx on public.intelligence_observation_entities (entity_id, observation_id);
create index if not exists intelligence_signals_primary_entity_idx on public.intelligence_signals (primary_entity_id, last_observed_at desc) where primary_entity_id is not null;
create index if not exists intelligence_signals_supersedes_idx on public.intelligence_signals (supersedes_signal_id) where supersedes_signal_id is not null;
create index if not exists intelligence_signal_revisions_changed_by_idx on public.intelligence_signal_revisions (changed_by) where changed_by is not null;
create index if not exists intelligence_signal_contradictions_observation_idx on public.intelligence_signal_contradictions (observation_id);
create index if not exists intelligence_signal_feedback_user_idx on public.intelligence_signal_feedback (user_id, created_at desc) where user_id is not null;
create index if not exists intelligence_signal_review_events_observation_idx on public.intelligence_signal_review_events (observation_id, created_at desc) where observation_id is not null;
create index if not exists intelligence_signal_review_events_actor_idx on public.intelligence_signal_review_events (actor_id, created_at desc) where actor_id is not null;
create index if not exists signal_evaluation_results_reviewer_idx on public.signal_evaluation_results (reviewer_id, reviewed_at desc) where reviewer_id is not null;
