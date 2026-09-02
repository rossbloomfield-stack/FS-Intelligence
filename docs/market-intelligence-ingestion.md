# Market intelligence ingestion

## Purpose

This document records the implementation of the controlled ingestion and evidence layer described in `codex_prompt_market_intelligence_ingestion_v1.md`. It extends the existing production application; it does not replace the conversational interface, authentication, report workflow or current evidence tables.

The supplied workbook is the source catalogue for this release:

- 409 unique parent sources in `P1 Connector Config`;
- 4,146 unique P1 reference targets in `P1 Ingestion Register`;
- 38 verified endpoint records;
- 593 A-grade targets ready for a bounded connector implementation;
- 2,509 B-grade targets requiring deterministic discovery;
- 1,044 C-grade targets requiring terms or source confirmation;
- zero duplicate source/reference IDs, missing parent links or invalid URLs;
- 354 shared ingestion-URL groups, retained intentionally as separate target definitions.

No workbook row is treated as an ingested or approved evidence document merely because it is present in the catalogue.

## R0 — current architecture audit

### Reused components

- `public.sources` remains the canonical source/evidence record and retains its public approval gate.
- `public.organisations`, aliases, relationships and ownership events remain the entity model.
- Existing strategy profiles, financial metrics, products, digital capabilities and customer signals remain the structured knowledge model.
- Existing conversations, message lineage and references remain the answer persistence layer.
- The report Workflow DevKit implementation remains the durable orchestration foundation.
- Supabase service-role access remains server-only; authenticated reads continue to be controlled by RLS.
- The current Vercel production project, weekly cron and chat UI are preserved.

### Conflicts and resolutions

- The existing `sources` table represents citation-ready documents, while the workbook describes parent websites and feeds. `sources.registry_kind` now distinguishes `document` from `parent_source`; workbook rows are never approved for citation on import.
- The production database already contains an unrelated `ingestion_runs` table used by another domain workflow. Market-intelligence jobs therefore use `source_ingestion_runs` and `source_ingestion_failures`.
- The earlier chat route sampled at most 100 approved source rows. Ranked full-text retrieval now augments those records with approved `source_items` and `source_chunks`; unapproved catalogue rows remain excluded.
- No Storage bucket currently exists. Raw document storage remains optional and must follow each source's storage policy; metadata and permitted extracts are the default.
- `pgvector` was available but not installed. The ingestion migration enables it and stores model-labelled, dimension-labelled embeddings without committing to one obsolete embedding dimension.

## R1 — logical schema

### Registry

- `sources`: extended with stable workbook source keys, class, category, geography, hard/soft signal type, priority, weight and registry status.
- `source_connectors`: one connector configuration per parent source, including endpoint status, parser strategy, cadence, robots/sitemap metadata, terms review, approval and enabled state.
- `reference_targets`: one stable record per workbook reference ID. Shared ingestion URLs are allowed. Readiness is stored separately from fetch approval.
- `source_registry_imports`: immutable workbook checksum and import outcome summary.

### Evidence

- `source_items`: discovered/fetched documents or pages, dates, factual summary, extracted facts, hashes, approval and optional evidence-source promotion.
- `source_chunks`: bounded permitted extracts with full-text index and optional model-labelled vector embedding.
- `source_item_organisations`: canonical organisation lineage.
- `intelligence_signals` and `intelligence_signal_sources`: longitudinal, evidence-linked hard/soft signals that are distinct from report-specific Board signals.

Signal scores retain their components (`impact`, `novelty`, `authority`, `recency`) and a scoring-version label. The annual-report pilot uses a documented weighted composite: 35% impact, 20% novelty, 25% source authority and 20% recency, each normalised to a five-point result. These are analyst assessments, not financial metrics.

### Operations

- `source_ingestion_runs`: connector/target/backfill/verification execution state and counts.
- `source_ingestion_failures`: stage-specific, retry-aware failures.

All new public-schema tables have RLS. Registry configuration, targets and operations are administrator-only. Approved evidence and approved signals are visible to authenticated users. Service-role writes remain server-only.

## R2 — deterministic workbook importer

Run a validation-only pass:

```bash
pnpm intelligence:import -- --file /absolute/path/to/workbook.xlsx
```

Apply a validated workbook to the explicitly confirmed project:

```bash
pnpm intelligence:import -- --file /absolute/path/to/workbook.xlsx --apply --confirm-project <project-ref>
```

The importer:

- validates required sheets, keys, URLs, weights, readiness grades and parent lineage;
- normalises dates, formats, signal types and URLs;
- hashes the complete workbook;
- upserts by `source_key`, `source_id` and `reference_key` in bounded batches;
- records the import outcome;
- never enables connectors or targets;
- never marks a registry row as approved public evidence;
- fails closed when a project confirmation does not match the configured Supabase URL.

Re-running the same workbook is idempotent. A failed partial write can be safely rerun because every imported entity has a deterministic conflict key.

When a service-role credential is deliberately unavailable to the local process, `--emit-sql-dir` emits bounded, reviewable, idempotent SQL batches. That fallback was used for the initial production import through the authenticated Supabase migration/query channel; it does not weaken the workbook validation or project confirmation controls in the direct apply path.

## Connector policy

The registry is configuration, not permission to crawl. A connector may run only when:

1. its endpoint has been verified;
2. source terms/robots/API conditions have been reviewed;
3. `approved_for_fetch=true` has been set by an administrator;
4. `enabled=true` has been set separately;
5. target readiness is not C;
6. storage and extraction behaviour comply with the recorded policy.

The database enforces `enabled ⇒ approved_for_fetch` and prevents C-grade targets from being approved.

## Bounded pilot plan

The next connector release is deliberately limited:

1. structured API pilot for an official public source;
2. regulatory publication connector for Central Bank of Ireland;
3. annual-report archive connectors for AIB, Bank of Ireland, Great-West Lifeco, Zurich and Aviva;
4. metadata/fact extraction with publication/effective/announcement dates kept distinct;
5. organisation resolution and parent/subsidiary lineage;
6. approval before evidence enters chat retrieval;
7. deterministic full-text retrieval, followed by optional semantic reranking.

No 4,146-target backfill is scheduled until those pilots meet error, evidence and licensing gates.

The first production verification cohort contains the official 2025 reports for AIB, Bank of Ireland, Great-West Lifeco, Zurich and Aviva. It retains five approved source items, eleven bounded factual extracts, five entity-linked signals and no raw report copies. Great-West Lifeco is linked to the existing Irish Life entity; no standalone Irish Life annual report is invented.

## Retrieval gate

`search_approved_source_chunks` uses Postgres full-text search and can be executed only by authenticated users. It returns a chunk only when both of these independent gates are true:

- the discovered `source_item` is approved;
- its promoted citation record in `sources` is `approved_public`.

The chat route merges matching chunks into their citation-ready source, deduplicates by source ID and retains the existing evidence validation and ranking path. Imported parent sources and reference targets can never appear as answer evidence solely because they exist in the registry.

## Production acceptance checks

- Dry run returned exactly 409 sources and 4,146 targets with zero validation errors.
- Production contains the same keys and complete parent lineage after import.
- All 409 connectors and 4,146 targets remain disabled.
- All 1,044 C-grade targets remain unapproved and disabled.
- Five approved annual-report items and eleven bounded extracts are available to authenticated retrieval.
- Five pilot signals retain direct source-item lineage and explainable scoring components.
- RLS prevents non-admin access to connector, target and job configuration.
- Approved chat evidence comes only from citation-ready sources/items.
- Security and performance advisors were reviewed after migration; no ingestion-specific warning was introduced.
- Lint, typecheck, 47 unit tests and the production build pass.

## Adding or updating a source

1. Add or amend the parent source in `P1 Connector Config` using a stable `SRC-*` key.
2. Add target records in `P1 Ingestion Register` using stable `REF-*` keys and the correct parent key.
3. Record exact verified endpoint overrides in `Verified Endpoints`; never invent an API, feed or document URL.
4. Run `pnpm intelligence:import -- --file /absolute/path/to/workbook.xlsx` and resolve every validation error.
5. Apply the validated import with an explicit production project confirmation or emit reviewed SQL batches.
6. Review terms, robots, storage policy and the exact endpoint before separately setting `approved_for_fetch` and `enabled`.
7. Run a bounded verification job, inspect items/chunks/signals and approve evidence only after provenance checks.

## Backfill procedure

Backfills remain resumable and bounded by parent connector, target, year and document type. Start with approved Tier-1 official sources, process 2021-2025 in small year batches, record every run in `source_ingestion_runs`, and stop on repeated parse or access failures. B- and C-grade targets are discovery or review work, not permission to fetch. The full 8,000-reference universe will not be activated until connector, licensing and evidence-quality gates have been met.

## Deferred from this release

The registry and first annual-report evidence cohort are production-ready. Automated due-connector scheduling, broad API/regulatory adapters, archive backfill beyond the five-document verification cohort, generalised document parsing and admin connector controls remain subsequent controlled releases. No bulk crawl has been scheduled implicitly.

## R5.2 activation update

R5.2 enabled five verified, terms-cleared reporting connectors and 20 readiness-A targets restricted to 2025 annual reports, results material and regulatory/capital disclosures. It recorded one queued verification run per target. The queue is an auditable worklist, not evidence and not a claim that ingestion has completed.

Ten approved document records that pre-dated `source_items` were promoted using their existing reviewed factual notes. Production therefore contains 15 approved source items and 21 searchable passages. The representative competitor-risk question now retrieves ten passages from eight approved sources after deterministic intent expansion.

The next ingestion increment is a bounded worker for the queued cohort, followed by review and explicit approval. Wider A-grade activation, B-grade discovery and every C-grade target remain disabled.
