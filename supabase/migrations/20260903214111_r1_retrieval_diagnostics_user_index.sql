-- R1 retrieval diagnostics advisor remediation.

create index if not exists retrieval_diagnostics_user_idx
  on public.retrieval_diagnostics (user_id, created_at desc)
  where user_id is not null;
