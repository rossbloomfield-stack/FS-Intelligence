# Conversational intelligence architecture

## R1 foundation

`/intelligence` is the primary conversational surface. Supabase Auth protects all intelligence pages and APIs using `APPROVED_USER_EMAILS`; unapproved browser requests redirect to login and API requests receive HTTP 401. Conversations are user-owned through existing RLS policies.

The client uses the installed Vercel AI SDK transport and `useChat` contract. The server returns an AI SDK UI-message stream. Retrieval checks approved source and structured-domain records before any synthesis. Questions without sufficient approved evidence stream an explicit insufficient-evidence response and do not call a model.

## R3 retrieval architecture

Question → intent/entities/timeframe → relational and full-text retrieval → optional semantic retrieval → freshness decision → evidence reranking → one synthesis call → deterministic citation QA → streamed answer and evidence.

R3 implements the deterministic front half of this flow. `query-planner.ts` classifies the supported intent, timeframe and evidence needs. `entity-resolver.ts` resolves canonical organisations and approved aliases without treating ownership as identity. `retriever.ts` combines entity, taxonomy, keyword, authority and freshness signals so the evidence panel no longer receives every approved source. `freshness.ts` forces current verification for regulatory and explicitly current questions.

The current corpus remains intentionally fail-closed: retrieval results and gaps are persisted, but substantive model synthesis is disabled until the structured domains contain enough evidence and citation QA can validate generated claims.

## R4 structured answer architecture

R4 adds deterministic UI payloads alongside the text and evidence stream. Company questions can return evidence-linked company cards; multi-company questions return a comparison table; historical and ownership questions return a dated timeline; product questions return product cards only when verified product records exist. Unsupported cells display `Insufficient evidence` rather than inferred maturity or invented comparisons.

The server assembles these payloads from canonical organisations, `digital_benchmarks`, `ai_initiatives`, `competitor_updates` and dated candidate events. The payload is persisted as part of the assistant UI message, so reopening a conversation can reproduce the structured answer without regeneration. Product screenshots and thumbnails remain gated because the production schema does not yet contain a verified product/page benchmark record with an approved image reference.

## Persistence

Existing `conversations`, `conversation_messages`, `conversation_entities`, `conversation_references` and `conversation_feedback` tables remain the persistence foundation. RLS scopes rows to `auth.uid()`. R2 added claim-level lineage. R3 persists the query plan, freshness assessment and gaps in conversation context, the classified intent on the user message, resolved organisations in `conversation_entities`, and ranked evidence snapshots in `conversation_references`.

## Evidence contract

Source identifiers must originate in retrieval. No model-created URLs or identifiers are accepted. Empty or weak retrieval produces an insufficient-evidence response. Current external verification is reserved for explicit freshness triggers and high-stakes regulatory questions.

## Cost model

Planning and database retrieval are deterministic. A mature, well-covered question should use one primary synthesis call. Model, tokens, latency, cost, prompt version, evidence snapshot and cache outcome will be captured before synthesis is enabled.

## Corpus plan

Launch requires at least 5,000 quality-assured references; 15,000 is preferred. Ingestion proceeds by regulated source, company strategy/results, competitor product and digital pages, products/distribution, AI/technology, customer signals, ownership/M&A and historical analysis. Each batch must pass canonicalisation, deduplication, metadata, accessibility and evidence-quality checks.

## R5 domain model and ingestion

R5 adds versioned company strategy profiles, source-linked financial time series, product propositions, atomic digital capabilities and approved product-page benchmarks. Existing customer signals gain explicit survey and evidence dates. Each domain row is withheld from authenticated retrieval until human approval, and the database retains its source foreign key or claim-level join.

Corpus additions use the versioned Zod contract in `src/schemas/intelligence-corpus.ts` and the contributor format in `docs/pivot/corpus-ingestion-format.md`. Batches resolve canonical organisation slugs, reject missing source lineage and cap imports at 1,000 records for reviewability. Raw domain-observation records remain outside intelligence readiness counts.

## R5.1 production corpus activation

R5.1 activates the first reviewed structured production batch. The approved corpus now contains 11 primary references, two current company-strategy profiles, 15 FY2025 financial observations, eight source-linked digital/AI capability records and three Irish mortgage-protection products. The batch covers AIB, Bank of Ireland, Irish Life, Zurich Life and AIB Life. Records were inserted unapproved, reviewed for source, entity, date, unit and duplication integrity, and then explicitly approved.

Generic product-comparison questions now use canonical product categories, so `Compare mortgage protection products` can load reviewed product cards without requiring company names. Narrative synthesis remains fail-closed until wider evidence coverage and citation QA meet the release threshold.

## Evaluation

R1 tests access allowlisting and empty-corpus behavior. R2 tests evidence ranking and citation safety. R3 tests alias resolution, multi-company planning, structured evidence needs, relevance filtering, freshness escalation and insufficient-evidence behaviour. Later releases expand this into 200 cross-intent questions and approximately 30 golden questions covering time validity, primary-source preference, citation validity, unsupported figures, follow-up context and regulatory disclaimers.
