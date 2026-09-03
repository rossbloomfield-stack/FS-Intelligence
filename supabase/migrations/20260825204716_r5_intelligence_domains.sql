create type public.intelligence_confidence as enum ('high','medium','low','insufficient');
create type public.capability_status as enum ('available','partial','pilot','planned','not_available','insufficient_evidence');
create type public.product_status as enum ('active','withdrawn','announced','unknown');

create table public.company_strategy_profiles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  strategy_summary text not null,
  strategic_priorities text[] not null default '{}',
  growth_priorities text[] not null default '{}',
  cost_priorities text[] not null default '{}',
  distribution_strategy text[] not null default '{}',
  digital_strategy text[] not null default '{}',
  ai_strategy text[] not null default '{}',
  customer_strategy text[] not null default '{}',
  product_strategy text[] not null default '{}',
  acquisition_strategy text[] not null default '{}',
  technology_priorities text[] not null default '{}',
  key_risks text[] not null default '{}',
  effective_at date not null,
  previous_profile_id uuid references public.company_strategy_profiles(id),
  confidence public.intelligence_confidence not null default 'insufficient',
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id,effective_at)
);

create table public.company_strategy_profile_sources (
  profile_id uuid not null references public.company_strategy_profiles(id) on delete cascade,
  source_id uuid not null references public.sources(id),
  claim_supported text not null,
  support_strength text not null check (support_strength in ('direct','corroborating','contextual')),
  primary key (profile_id,source_id,claim_supported)
);

create table public.company_financial_metrics (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  metric text not null,
  value numeric not null,
  unit text not null,
  period_start date,
  period_end date not null,
  reported_at date not null,
  source_id uuid not null references public.sources(id),
  notes text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id,metric,period_end,source_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  slug text not null,
  name text not null,
  category text not null,
  target_audience text,
  key_features text[] not null default '{}',
  pricing text,
  fees text,
  distribution_channels text[] not null default '{}',
  advice_status text,
  online_journey text,
  application_method text,
  digital_service_capabilities text[] not null default '{}',
  calculators text[] not null default '{}',
  key_warnings text[] not null default '{}',
  status public.product_status not null default 'unknown',
  source_id uuid not null references public.sources(id),
  last_verified_at date not null,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id,slug)
);

create table public.digital_capabilities (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  capability text not null,
  status public.capability_status not null,
  maturity smallint check (maturity between 1 and 5),
  assessment text,
  source_id uuid not null references public.sources(id),
  last_verified_at date not null,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id,capability,last_verified_at,source_id)
);

create table public.product_page_benchmarks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  page_url text not null,
  page_title text,
  journey_stage text,
  observed_patterns text[] not null default '{}',
  screenshot_storage_path text,
  captured_at timestamptz not null,
  source_id uuid not null references public.sources(id),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_url,captured_at)
);

alter table public.customer_signals add column if not exists survey_date date;
alter table public.customer_signals add column if not exists evidence_type text;

create index company_strategy_profiles_current_idx on public.company_strategy_profiles (organisation_id,effective_at desc) where approved;
create index company_strategy_profile_sources_source_idx on public.company_strategy_profile_sources (source_id,profile_id);
create index company_financial_metrics_series_idx on public.company_financial_metrics (organisation_id,metric,period_end desc) where approved;
create index products_category_idx on public.products (category,organisation_id) where approved;
create index digital_capabilities_current_idx on public.digital_capabilities (organisation_id,capability,last_verified_at desc) where approved;
create index product_page_benchmarks_org_idx on public.product_page_benchmarks (organisation_id,captured_at desc) where approved;
create index customer_signals_market_idx on public.customer_signals (market,classification,created_at desc);

alter table public.company_strategy_profiles enable row level security;
alter table public.company_strategy_profile_sources enable row level security;
alter table public.company_financial_metrics enable row level security;
alter table public.products enable row level security;
alter table public.digital_capabilities enable row level security;
alter table public.product_page_benchmarks enable row level security;

create policy company_strategy_profiles_read on public.company_strategy_profiles for select to authenticated using (approved or public.is_admin());
create policy company_strategy_profile_sources_read on public.company_strategy_profile_sources for select to authenticated using (
  exists (select 1 from public.company_strategy_profiles p where p.id=profile_id and (p.approved or public.is_admin()))
);
create policy company_financial_metrics_read on public.company_financial_metrics for select to authenticated using (approved or public.is_admin());
create policy products_read on public.products for select to authenticated using (approved or public.is_admin());
create policy digital_capabilities_read on public.digital_capabilities for select to authenticated using (approved or public.is_admin());
create policy product_page_benchmarks_read on public.product_page_benchmarks for select to authenticated using (approved or public.is_admin());

create policy admin_all_company_strategy_profiles on public.company_strategy_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_company_strategy_profile_sources on public.company_strategy_profile_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_company_financial_metrics on public.company_financial_metrics for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_products on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_digital_capabilities on public.digital_capabilities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_product_page_benchmarks on public.product_page_benchmarks for all to authenticated using (public.is_admin()) with check (public.is_admin());

create trigger set_company_strategy_profiles_updated_at before update on public.company_strategy_profiles for each row execute function public.set_updated_at();
create trigger set_company_financial_metrics_updated_at before update on public.company_financial_metrics for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger set_digital_capabilities_updated_at before update on public.digital_capabilities for each row execute function public.set_updated_at();
create trigger set_product_page_benchmarks_updated_at before update on public.product_page_benchmarks for each row execute function public.set_updated_at();

grant select on public.company_strategy_profiles,public.company_strategy_profile_sources,public.company_financial_metrics,public.products,public.digital_capabilities,public.product_page_benchmarks to authenticated;
