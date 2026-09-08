-- Admit only pending evidence whose canonical URL contains a complete, valid date.
-- A reporting year alone remains insufficient and continues to require review.
do $$
declare
  promoted_ids uuid[];
begin
  with year_first_raw as (
    select
      item.id,
      match[2] || '-' || match[3] || '-' || match[4] as date_text
    from public.source_items item
    cross join lateral regexp_match(
      item.canonical_url,
      '(^|[/_-])(20[0-9]{2})[._-](0[1-9]|1[0-2])[._-](0[1-9]|[12][0-9]|3[01])([/_-]|$)'
    ) match
    where not item.approved and item.publication_date is null
  ), day_first_raw as (
    select
      item.id,
      match[4] || '-' || match[3] || '-' || match[2] as date_text
    from public.source_items item
    cross join lateral regexp_match(
      item.canonical_url,
      '(^|/)(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(20[0-9]{2})(/|$)'
    ) match
    where not item.approved and item.publication_date is null
  ), raw_candidates as (
    select id, date_text from year_first_raw
    union
    select id, date_text from day_first_raw
  ), candidates as (
    select id, to_date(date_text, 'YYYY-MM-DD') as publication_date
    from raw_candidates
    where to_char(to_date(date_text, 'YYYY-MM-DD'), 'YYYY-MM-DD') = date_text
  ), updated as (
    update public.source_items item
    set
      publication_date = candidate.publication_date,
      metadata = item.metadata || jsonb_build_object(
        'discoveredPublicationDate', to_char(candidate.publication_date, 'YYYY-MM-DD'),
        'publicationDateSource', 'canonical_url'
      ),
      updated_at = now()
    from candidates candidate
    where item.id = candidate.id
    returning item.id
  )
  select array_agg(id) into promoted_ids from updated;

  if coalesce(cardinality(promoted_ids), 0) > 0 then
    perform public.promote_trusted_primary_source_items(100, promoted_ids);
  end if;
end;
$$;
