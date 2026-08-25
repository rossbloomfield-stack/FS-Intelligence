insert into public.organisation_aliases (organisation_id,alias)
select organisation.id,aliases.alias
from (values
  ('aib','AIB Group'),
  ('aib','Allied Irish Banks'),
  ('bank-of-ireland','BOI'),
  ('bank-of-ireland','Bank of Ireland Group'),
  ('new-ireland-assurance','New Ireland'),
  ('new-ireland-assurance','New Ireland Assurance Company plc'),
  ('ptsb','Permanent TSB'),
  ('irish-life','Irish Life Group')
) as aliases(slug,alias)
join public.organisations organisation on organisation.slug=aliases.slug
on conflict (organisation_id,alias) do nothing;
