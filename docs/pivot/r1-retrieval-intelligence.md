# R1 — Retrieval Intelligence

## Current-state assessment (before implementation)

The production conversational route is authenticated and already fails closed when it cannot find approved evidence. Its current retrieval flow is:

1. Load up to 250 of the most recent `sources` rows where `approved_public = true`.
2. Resolve organisation names and aliases from `organisations` and `organisation_aliases`.
3. Classify one intent and a small set of products, regulations, themes and timeframe signals.
4. Build one expanded keyword string from the current question, up to two prior user questions and intent-specific expansion terms.
5. Call `search_approved_source_chunks(search_query, 60)`, a Postgres full-text search RPC over the generated English `tsvector` on `source_chunks`.
6. Merge passages into citation-ready source records, apply deterministic token/entity/authority scoring, and select at most ten sources.
7. Supply up to eighteen passages from those sources, plus structured company-domain records, to one answer-synthesis call.
8. Validate model-returned citation IDs against the retrieved evidence and persist the selected source snapshots in `conversation_references`.

### Current production corpus and storage

At the start of R1, production contains 15 approved citation-ready sources, 15 approved source items and 78 bounded chunks across ten publishers/domains. Raw fetched documents are represented by metadata and permitted extracts in `source_items` and `source_chunks`; `sources` holds the citation-ready document record. The ingestion workflow deliberately does not store or expose unapproved records to conversation retrieval.

`source_chunks.embedding` is an unconstrained `extensions.vector` column accompanied by `embedding_model` and `embedding_dimensions`. The vector extension is installed at version 0.8.2, but no production chunk currently has an embedding. No vector index or semantic search RPC is active. The only live retrieval RPC is lexical.

### Current limitations

- one broad lexical query is used even for multi-part strategic questions;
- semantic retrieval is not active despite the vector-ready schema;
- there is no reciprocal-rank fusion across retrieval paths;
- the final ten-source cap is applied before explicit document/domain diversity selection;
- a source can contribute up to six passages, concentrating context on a small number of documents;
- recency is materially weighted only for the daily briefing;
- source authority is represented, but metadata and temporal fit are not combined into a transparent reranking score;
- retrieval decisions are visible only through coarse route logs and persisted final references;
- no repeatable thirty-question retrieval benchmark compares the old and new ranking paths.

The embedding model and dimensions are therefore **not currently defined by stored production data**. R1 will introduce a configurable model-labelled embedding path, backfill only existing approved chunks, and retain lexical-only fallback if embedding generation is unavailable.

## R1 target architecture

```text
User question
→ query understanding
→ bounded query decomposition
→ semantic search + lexical search
→ reciprocal-rank fusion
→ retrieval-time deduplication
→ metadata, authority and recency reranking
→ document and domain diversity selection
→ evidence coverage assessment
→ one LLM synthesis call
→ citation validation and diagnostics
```

This release changes retrieval and evidence selection only. It does not redesign the conversational UI or broaden the source registry.

## Implementation summary

R1 retains the authenticated `/api/intelligence/chat` route, the existing conversation stream, structured-answer components and evidence drawer. The retrieval stage now:

- parses organisations, products, markets, jurisdictions, named people, metrics, signal types, strategic question type and explicit rolling timeframes;
- creates one direct query plus at most three focused entity/evidence-facet queries for complex questions;
- runs approved-only Postgres full-text and pgvector searches in parallel;
- merges ranked lists with weighted reciprocal-rank fusion (`semantic = 1.05`, `lexical = 1.0`);
- removes exact and near-identical passage duplicates without deleting source records;
- reranks the resulting pool using transparent relevance, entity, theme, temporal, authority and geographic factors;
- limits final context to two chunks per document and favours independent publishers where relevance is comparable;
- grades evidence as Strong, Adequate, Limited or Insufficient before synthesis;
- instructs synthesis to separate evidence, interpretation and implication and to calibrate language to the evidence grade;
- validates all returned citation IDs against the selected evidence set;
- records private, administrator-only retrieval diagnostics and post-generation citation utilisation.

The existing one-model-call synthesis path remains. Query understanding, decomposition, fusion, reranking, diversity and coverage assessment are deterministic and do not introduce extra language-model calls. The only additional model request is a batched embedding request for the bounded subquery set. Existing approved chunks are embedded in bounded batches; lexical retrieval remains available if embeddings or the OpenAI service are unavailable.

## Runtime flow

```text
User Question
→ Query Understanding
→ Query Decomposition (maximum 4)
→ Semantic Search + Lexical Search
→ Reciprocal-rank Fusion
→ Retrieval-time Deduplication
→ Metadata / Authority / Recency Reranking
→ Document and Domain Diversity Selection
→ Evidence Coverage Classification
→ Evidence Set
→ One LLM Synthesis Call
→ Citation Validation
→ Cited Answer + Private Diagnostics
```

Conversation context is preserved by including the previous two user questions in entity resolution and retrieval. The current user question still controls answer intent and timeframe so an older turn cannot silently override a new request.

## Significant files

| File | Purpose |
| --- | --- |
| `src/lib/intelligence/query-planner.ts` | Expanded query understanding and timeframe parsing. |
| `src/lib/intelligence/query-decomposition.ts` | Bounded direct, per-entity and evidence-facet searches. |
| `src/lib/intelligence/retrieval-config.ts` | Validated environment configuration and safe bounds. |
| `src/lib/intelligence/retrieval-orchestrator.ts` | Parallel lexical/semantic search, batched query embeddings and lexical fallback. |
| `src/lib/intelligence/retriever.ts` | Fusion, deduplication, deterministic reranking, diversity selection and coverage metrics. |
| `src/lib/intelligence/embedding-backfill.ts` | Bounded, model-labelled embedding backfill for existing approved chunks only. |
| `src/lib/intelligence/retrieval-diagnostics.ts` | Private diagnostic creation and citation-utilisation completion. |
| `src/lib/intelligence/answer-agent.ts` | Evidence/interpretation/implication contract and confidence calibration. |
| `src/app/api/intelligence/chat/route.ts` | Integration with the existing authenticated conversational route. |
| `src/app/api/cron/discovery/route.ts` | Scheduled bounded embedding maintenance after normal source discovery. |
| `src/app/api/admin/ingestion/review/route.ts` | Embeds newly approved evidence without changing the review workflow. |
| `src/components/intelligence-chat/evidence-panel.tsx` | Small evidence-footprint addition; no conversational redesign. |
| `evals/r1-retrieval-questions.ts` | Thirty-six cross-intent R1 evaluation questions. |
| `tests/r1-retrieval-intelligence.test.ts` | Automated query, fusion, deduplication, diversity, recency, citation and migration tests. |
| `tests/r1-retrieval-live.test.ts` | Opt-in 36-question production-corpus comparison; runs only when the required protected environment values are supplied. |

## Database changes

`20260903214020_r1_retrieval_intelligence.sql` is additive. It creates:

- `retrieval_diagnostics`, protected by RLS with administrator read and service-role writes;
- an approved-only lexical RPC with passage, source, authority, organisation and geography metadata;
- an approved-only semantic RPC over 1,536-dimensional, model-labelled embeddings;
- a service-role-only bounded embedding worklist;
- a partial HNSW cosine index covering only `text-embedding-3-small` / 1,536-dimensional rows;
- diagnostic lookup indexes.

`20260903214111_r1_retrieval_diagnostics_user_index.sql` adds the foreign-key lookup index recommended by the Supabase database advisor.

No source, item or chunk was deleted or reclassified. Rollback is operationally safe: deploy the preceding application version first, then drop the new RPCs, indexes and `retrieval_diagnostics` table. Existing `source_chunks.embedding`, `embedding_model` and `embedding_dimensions` columns pre-date R1; embedding values can remain because the previous application ignores them.

## Configuration

All values have bounded defaults and can be changed in the Vercel environment without code edits.

| Variable | Default | Allowed range / role |
| --- | ---: | --- |
| `INTELLIGENCE_SEMANTIC_CANDIDATES` | 40 | 10–100 per decomposed query |
| `INTELLIGENCE_LEXICAL_CANDIDATES` | 40 | 10–100 per decomposed query |
| `INTELLIGENCE_MAX_DECOMPOSITION_QUERIES` | 4 | 1–6 |
| `INTELLIGENCE_RERANK_CANDIDATES` | 80 | 20–120 after deduplication |
| `INTELLIGENCE_FINAL_EVIDENCE_COUNT` | 14 | 6–20 passages |
| `INTELLIGENCE_MAX_CHUNKS_PER_DOCUMENT` | 2 | 1–4 |
| `INTELLIGENCE_MAX_DOCUMENTS_PER_DOMAIN` | 4 | 2–8; primary sources may exceed this soft cap |
| `INTELLIGENCE_RECENCY_WEIGHT` | 0.12 | 0–0.5; intent-sensitive temporal score multiplier |
| `INTELLIGENCE_MIN_RELEVANCE` | 0.015 | 0–1 |
| `INTELLIGENCE_RRF_K` | 60 | 10–100 |
| `INTELLIGENCE_EMBEDDING_MODEL` | `text-embedding-3-small` | Must match stored model labels |
| `INTELLIGENCE_EMBEDDING_DIMENSIONS` | 1536 | R1 database function and index are fixed at 1,536 |

## Evaluation

The repeatable R1 suite contains 36 questions across factual, comparative, trend, broad strategic, entity investigation, technology, regulatory and contradictory-evidence categories. All questions assert expected intent, recency behaviour and bounded decomposition. The automated tests also exercise both retrieval channels, fusion, exact duplicate removal, near-duplicate handling, authority ranking, source caps, timeframe restrictions, empty evidence, confidence grading and citation lineage.

Run the deterministic suite with `pnpm test:r1-retrieval`. The opt-in live corpus runner is `pnpm eval:r1-live`; it intentionally fails closed unless the Supabase service credential and OpenAI key are injected by an authorised local or CI environment. Protected Vercel values are not copied into the repository.

The controlled before/after ranking fixture deliberately models the previous failure mode—three of the top five lexical passages come from one annual report—while exposing relevant semantic and independent-source candidates to R1.

| Metric | Previous top-match path | R1 hybrid path |
| --- | ---: | ---: |
| Evidence passages selected | 5 | 7 |
| Unique documents represented | 3 | 6 |
| Unique domains represented | 3 | 6 |
| Maximum single-document concentration | 60.0% | 28.6% |
| Duplicate syndicated passages retained | 1 | 0 |
| Citation IDs outside retrieved evidence | Not instrumented | 0 |
| Evidence coverage classification | Not available | Adequate |

This is a deterministic retrieval benchmark, not a claim that a 36-question model-based answer review has been human-scored. Before R1, production did not retain candidate-level latency or citation-utilisation data, so a defensible historical average is unavailable. R1 now records retrieval duration, generation duration, selected sources and citation utilisation for every substantive production query; production averages should be assessed after a representative usage window rather than invented retrospectively.

Verification at release:

- 17 test files and 119 tests passed; the separate protected-environment live runner is skipped in normal CI;
- 47 tests are specific to R1, including all 36 evaluation questions;
- TypeScript, ESLint and the production Next.js build passed;
- the production migration was verified with an approved lexical probe;
- Supabase security advice reported no R1 table exposure finding; the one new foreign-key performance advisory was remediated in the follow-up migration.

## Remaining limitations and deliberate deferrals

- R1 improves use of the existing approved corpus; it does not increase its source breadth. Large-scale registry discovery, ingestion and approval remain R2.
- Source authority uses existing classification metadata and transparent deterministic heuristics; missing source metadata reduces ranking precision.
- R1 does not add a paid cross-encoder reranking call. The deterministic reranker avoids another LLM call and keeps latency and cost bounded.
- Historical production retrieval averages were not logged before R1. R1 establishes the baseline needed for ongoing comparison.
- Citation validity and source-ID lineage are automated. Human review of nuanced claim support remains appropriate for high-stakes regulatory and strategic answers.
- Fresh external research remains outside this release. Questions requiring information not present in the approved corpus are labelled Limited or Insufficient rather than filled from unapproved web material.

## Production verification — 3 September 2026

- Supabase migrations `20260903214020` and `20260903214111` are applied.
- The approved-only lexical probe returned 14 relevant passages for “digital advice strategy Ireland”.
- The semantic RPC executed successfully against the live schema. At deployment time, 21 approved chunks were eligible for embedding; existing approved chunks are populated on the first authenticated semantic request and maintained after approval and daily discovery.
- Vercel deployment `dpl_CgvcCXRbGHKim8Y3LRZuQJb2nRs9` reached `READY` and aliases include both `www.rossbloomfield.com` and `rossbloomfield.com`.
- Both production domains redirect unauthenticated `/intelligence` traffic to the existing Irish Life login page and return HTTP 200 there.
- Unauthenticated chat requests return HTTP 401; authentication was not bypassed for testing.
- Vercel reported no production runtime errors in the post-deployment verification window.
