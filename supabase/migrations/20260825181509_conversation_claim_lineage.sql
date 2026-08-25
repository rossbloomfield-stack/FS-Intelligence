create table if not exists public.conversation_claims (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.conversation_messages(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  claim_text text not null check (char_length(claim_text) between 1 and 4000), reference_ids uuid[] not null default '{}',
  support_strength text not null check (support_strength in ('direct','corroborating','contextual')), created_at timestamptz not null default now()
);
alter table public.conversation_claims enable row level security;
create index if not exists conversation_claims_conversation_idx on public.conversation_claims (conversation_id,created_at);
create policy "Users read own conversation claims" on public.conversation_claims for select to authenticated using ((select auth.uid())=user_id);
create policy "Users insert own conversation claims" on public.conversation_claims for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users delete own conversation claims" on public.conversation_claims for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,delete on table public.conversation_claims to authenticated;
