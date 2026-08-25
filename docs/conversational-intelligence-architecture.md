# Conversational intelligence architecture

## R1 foundation

`/intelligence` is the primary conversational surface. Supabase Auth protects all intelligence pages and APIs using `APPROVED_USER_EMAILS`; unapproved browser requests redirect to login and API requests receive HTTP 401. Conversations are user-owned through existing RLS policies.

The client uses the installed Vercel AI SDK transport and `useChat` contract. The server returns an AI SDK UI-message stream. In R1, retrieval checks the count of approved source records before any synthesis. With the current empty corpus it streams an explicit insufficient-evidence response and does not call a model.

## Target query flow

Question → intent/entities/timeframe → relational and full-text retrieval → optional semantic retrieval → freshness decision → evidence reranking → one synthesis call → deterministic citation QA → streamed answer and evidence.

## Persistence

Existing `conversations`, `conversation_messages`, `conversation_entities`, `conversation_references` and `conversation_feedback` tables remain the persistence foundation. RLS scopes rows to `auth.uid()`. R2 will add claim-level lineage and complete history hydration.

## Evidence contract

Source identifiers must originate in retrieval. No model-created URLs or identifiers are accepted. Empty or weak retrieval produces an insufficient-evidence response. Current external verification is reserved for explicit freshness triggers and high-stakes regulatory questions.

## Cost model

Planning and database retrieval are deterministic. A mature, well-covered question should use one primary synthesis call. Model, tokens, latency, cost, prompt version, evidence snapshot and cache outcome will be captured before synthesis is enabled.

## Corpus plan

Launch requires at least 5,000 quality-assured references; 15,000 is preferred. Ingestion proceeds by regulated source, company strategy/results, competitor product and digital pages, products/distribution, AI/technology, customer signals, ownership/M&A and historical analysis. Each batch must pass canonicalisation, deduplication, metadata, accessibility and evidence-quality checks.

## Evaluation

R1 tests access allowlisting and empty-corpus behavior. Later releases add 200 cross-intent questions and approximately 30 golden questions covering entity resolution, time validity, primary-source preference, citation validity, unsupported figures, insufficient evidence, follow-up context, freshness and regulatory disclaimers.
