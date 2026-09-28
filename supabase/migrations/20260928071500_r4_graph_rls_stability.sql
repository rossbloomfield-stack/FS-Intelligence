-- Break the mutual RLS recursion between relationship and lineage reads while
-- preserving the original accepted-evidence rule for authenticated users.
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.can_read_intelligence_relationship(requested_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    (select auth.uid()) is not null
    and (
      (select public.is_admin())
      or exists (
        select 1
        from public.intelligence_relationships relationship
        join public.intelligence_relationship_observations lineage
          on lineage.relationship_id=relationship.id
        join public.intelligence_observations observation
          on observation.id=lineage.observation_id
        where relationship.id=requested_relationship_id
          and relationship.status in ('current','emerging','uncertain')
          and observation.review_status='accepted'
      )
    );
$$;

revoke all on function private.can_read_intelligence_relationship(uuid) from public, anon;
grant execute on function private.can_read_intelligence_relationship(uuid) to authenticated;

drop policy if exists intelligence_relationships_read on public.intelligence_relationships;
create policy intelligence_relationships_read
on public.intelligence_relationships
for select
to authenticated
using ((select private.can_read_intelligence_relationship(id)));

drop policy if exists intelligence_relationship_observations_read on public.intelligence_relationship_observations;
create policy intelligence_relationship_observations_read
on public.intelligence_relationship_observations
for select
to authenticated
using ((select private.can_read_intelligence_relationship(relationship_id)));
