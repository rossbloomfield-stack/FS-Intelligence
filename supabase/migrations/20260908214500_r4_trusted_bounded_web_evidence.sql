-- A bounded HTML extraction is expected to omit navigation and boilerplate. It
-- remains eligible for the trusted-primary path when at least one substantial,
-- strongly relevant passage was retained from the verified official page.

create or replace function public.promote_trusted_primary_source_items(
  p_limit integer default 25,
  p_item_ids uuid[] default null
)
returns table(source_item_id uuid, evidence_source_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  candidate record;
  promoted_evidence_id uuid;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'service role required';
  end if;

  for candidate in
    select
      item.*,
      parent.publisher as parent_publisher,
      parent.credibility_tier as parent_credibility_tier,
      parent.canonical_domain as parent_canonical_domain,
      parent.source_class as parent_source_class,
      parent.categorisation as parent_categorisation,
      parent.signal_type as parent_signal_type,
      parent.geography as parent_geography,
      parent.priority as parent_priority,
      parent.source_weight as parent_source_weight,
      parent.access_licensing_note as parent_access_licensing_note,
      parent.storage_policy as parent_storage_policy
    from public.source_items as item
    join public.sources as parent on parent.id = item.parent_source_id
    join public.reference_targets as target on target.id = item.reference_target_id
    where not item.approved
      and item.fetch_status = 'parsed'
      and item.publication_date is not null
      and parent.primary_source
      and parent.credibility_tier <= 2
      and parent.registry_active
      and target.enabled
      and target.approved_for_fetch
      and target.readiness_grade = 'A'
      and (
        coalesce((item.metadata ->> 'extractionTruncated')::boolean, false) = false
        or (
          item.content_type = 'text/html'
          and exists (
            select 1
            from public.source_chunks as material_chunk
            where material_chunk.source_item_id = item.id
              and material_chunk.token_count >= 250
              and coalesce((material_chunk.metadata ->> 'relevanceScore')::numeric, 0) >= 20
          )
        )
      )
      and exists (
        select 1
        from public.source_connectors as connector
        where connector.source_id = parent.id
          and connector.enabled
          and connector.approved_for_fetch
          and connector.endpoint_verified
          and not connector.terms_review_required
      )
      and exists (
        select 1 from public.source_chunks as chunk
        where chunk.source_item_id = item.id
      )
      and not exists (
        select 1 from public.sources as collision
        where collision.canonical_url = item.canonical_url
          and collision.registry_kind <> 'document'
      )
      and (p_item_ids is null or item.id = any(p_item_ids))
    order by parent.credibility_tier, item.publication_date desc, item.created_at
    for update of item skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  loop
    promoted_evidence_id := null;
    insert into public.sources (
      url, canonical_url, title, publisher, source_type, publication_date,
      primary_source, credibility_tier, evidence_classification, notes,
      approved_public, registry_kind, canonical_domain, source_class,
      categorisation, signal_type, geography, priority, source_weight,
      registry_status, registry_active, access_licensing_note, storage_policy,
      implementation_notes
    ) values (
      candidate.canonical_url,
      candidate.canonical_url,
      candidate.title,
      candidate.parent_publisher,
      lower(replace(candidate.content_type, ' ', '_')),
      candidate.publication_date,
      true,
      candidate.parent_credibility_tier,
      coalesce(candidate.evidence_classification, 'primary_company_source'),
      'Verified primary evidence promoted through the R4 trusted-source policy.',
      true,
      'document',
      candidate.parent_canonical_domain,
      candidate.parent_source_class,
      candidate.parent_categorisation,
      candidate.parent_signal_type,
      candidate.parent_geography,
      candidate.parent_priority,
      candidate.parent_source_weight,
      'approved',
      true,
      candidate.parent_access_licensing_note,
      candidate.parent_storage_policy,
      'Automatically promoted after deterministic provenance, material-passage and publication-date checks.'
    )
    on conflict (canonical_url) do update
      set title = excluded.title,
          publication_date = excluded.publication_date,
          approved_public = true,
          registry_status = 'approved',
          registry_active = true,
          updated_at = now()
      where public.sources.registry_kind = 'document'
    returning id into promoted_evidence_id;

    if promoted_evidence_id is null then
      continue;
    end if;

    update public.source_items
    set approved = true,
        evidence_source_id = promoted_evidence_id,
        rejection_reason = null,
        last_verified_at = now(),
        metadata = metadata || jsonb_build_object(
          'approvalRequiredBeforeRetrieval', false,
          'approvalPolicy', 'r4_trusted_primary_v1',
          'autoApprovedAt', now()
        )
    where id = candidate.id;

    insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values (
      null,
      'source_item_auto_approved',
      'source_item',
      candidate.id,
      jsonb_build_object(
        'evidenceSourceId', promoted_evidence_id,
        'policy', 'r4_trusted_primary_v1',
        'release', 'R4'
      )
    );

    source_item_id := candidate.id;
    evidence_source_id := promoted_evidence_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.promote_trusted_primary_source_items(integer, uuid[]) from public, anon, authenticated;
grant execute on function public.promote_trusted_primary_source_items(integer, uuid[]) to service_role;

comment on function public.promote_trusted_primary_source_items is
  'Promotes dated evidence from verified Grade-A Tier 1/2 primary sources when extraction is complete or a substantial material HTML passage is retained.';

select * from public.promote_trusted_primary_source_items(100, null);
