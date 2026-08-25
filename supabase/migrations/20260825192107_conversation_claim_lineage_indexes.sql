create index if not exists conversation_claims_message_idx
  on public.conversation_claims (message_id);

create index if not exists conversation_claims_user_idx
  on public.conversation_claims (user_id, created_at desc);
