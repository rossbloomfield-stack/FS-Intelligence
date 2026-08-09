sed: --: No such file or directory
-- Cover every foreign key to keep deletes, joins and lineage lookups predictable.
do $$
declare r record; index_name text;
begin
  for r in
    select n.nspname, c.relname, con.conname,
      string_agg(quote_ident(a.attname), ', ' order by u.ordinality) as columns_sql
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    cross join lateral unnest(con.conkey) with ordinality u(attnum,ordinality)
    join pg_attribute a on a.attrelid=c.oid and a.attnum=u.attnum
    where con.contype='f' and n.nspname='public'
    group by n.nspname,c.relname,con.conname
  loop
    index_name=left(r.relname||'_'||replace(r.conname,'_fkey','')||'_idx',63);
    execute format('create index if not exists %I on %I.%I (%s)',index_name,r.nspname,r.relname,r.columns_sql);
  end loop;
end $$;

-- Replace broad ALL policies with one policy per operation.
do $$
declare t text;
begin
  foreach t in array array['organisations','organisation_aliases','organisation_relationships','ownership_events','report_runs','report_run_status_history','agent_runs','workflow_steps','sources','candidate_events','event_organisations','event_sources','materiality_scores','board_signals','strategic_themes','theme_assessments','theme_events','competitor_updates','digital_benchmarks','ai_initiatives','regulatory_items','customer_signals','strategic_recommendations','leadership_decisions','research_questions','watchlist_items','reports','report_sections','covering_emails','notifications','user_feedback','audit_events'] loop
    execute format('drop policy if exists %I on public.%I','admin_all_'||t,t);
    execute format('create policy %I on public.%I for insert to authenticated with check(public.is_admin())','admin_insert_'||t,t);
    execute format('create policy %I on public.%I for delete to authenticated using(public.is_admin())','admin_delete_'||t,t);
    if t <> 'notifications' then
      execute format('create policy %I on public.%I for update to authenticated using(public.is_admin()) with check(public.is_admin())','admin_update_'||t,t);
    end if;
    if not (t=any(array['organisations','organisation_aliases','sources','strategic_themes','reports','report_sections','notifications'])) then
      execute format('create policy %I on public.%I for select to authenticated using(public.is_admin())','admin_select_'||t,t);
    end if;
  end loop;
end $$;

drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated with check(public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated using(public.is_admin());

drop policy if exists public_reports_read on public.reports;
create policy public_reports_anon_read on public.reports for select to anon using(is_published);
create policy reports_authenticated_read on public.reports for select to authenticated using(is_published or public.is_admin());
drop policy if exists public_report_sections_read on public.report_sections;
create policy public_report_sections_anon_read on public.report_sections for select to anon using(exists(select 1 from public.reports r where r.id=report_id and r.is_published));
create policy report_sections_authenticated_read on public.report_sections for select to authenticated using(public.is_admin() or exists(select 1 from public.reports r where r.id=report_id and r.is_published));
drop policy if exists public_sources_read on public.sources;
create policy public_sources_anon_read on public.sources for select to anon using(approved_public);
create policy sources_authenticated_read on public.sources for select to authenticated using(approved_public or public.is_admin());
drop policy if exists public_organisations_read on public.organisations;
create policy public_organisations_anon_read on public.organisations for select to anon using(active);
create policy organisations_authenticated_read on public.organisations for select to authenticated using(active or public.is_admin());
drop policy if exists public_aliases_read on public.organisation_aliases;
create policy public_aliases_anon_read on public.organisation_aliases for select to anon using(exists(select 1 from public.organisations o where o.id=organisation_id and o.active));
create policy aliases_authenticated_read on public.organisation_aliases for select to authenticated using(public.is_admin() or exists(select 1 from public.organisations o where o.id=organisation_id and o.active));
drop policy if exists public_themes_read on public.strategic_themes;
create policy public_themes_anon_read on public.strategic_themes for select to anon using(true);
create policy themes_authenticated_read on public.strategic_themes for select to authenticated using(true);
drop policy if exists notifications_own_read on public.notifications;
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()) or public.is_admin());
