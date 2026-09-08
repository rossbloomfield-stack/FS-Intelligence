# R4 Market Knowledge Graph & Intelligence Coverage

## Current-state assessment

Assessment date: 8 September 2026. Production Supabase project and the deployed R1–R3 code are the source of truth.

### Production baseline

| Area | Current state |
| --- | ---: |
| Registered sources | 424 |
| Active sources | 12 |
| Registered reference targets | 4,197 |
| Enabled targets | 71 |
| Grade-A targets | 644 |
| Verified, terms-cleared Grade-A targets | 634 across 49 sources |
| Parsed evidence records | 70 |
| Approved evidence records | 15 |
| Evidence passages | 302 |
| Accepted observations | 4 of 16 |
| R3 signals | 4 retrievable signals |
| Canonical entities | 51 |
| Entity aliases | 60 |
| First-class relationships | 0 |

The registry is broad but the approved, retrieval-ready corpus is narrow. R1 performs decomposed hybrid semantic and lexical retrieval with reranking and source diversity. R2 provides an approval-gated, versioned ingestion pipeline. R3 extracts evidence-anchored observations and assessed signals. The current conversation therefore uses the right retrieval shape but has too little approved evidence and no persistent relationship layer. Organisation pages are also backed by static report fixtures rather than the intelligence store.

### Coverage matrix

Registered source geography is strongest in Global (181) and Ireland (107), followed by EU (39), UK (39), Europe (31) and US (16). Reference targets follow the same pattern: Global 1,700; Ireland 1,021; UK 537; Europe 416; EU 369; US 154.

The source estate covers financial-services providers (142), technology/infrastructure (81), research/industry (61), official/regulatory (57), other (38) and data/API sources (30). Only 12 sources are currently active, so the production evidence does not reflect that breadth.

The verified Grade-A expansion cohort includes strong first-party coverage for AIB, Bank of Ireland, Zurich Ireland, Aviva Ireland, Irish Life, Irish Life Health, New Ireland, Royal London Ireland, Allianz Ireland and AXA Ireland; Irish and European regulators including the Central Bank of Ireland, CSO, ECB, EIOPA and FCA; UK comparators; global insurers, banks and asset managers. Technology/vendor and product-page coverage remains the principal material gap after this first cohort.

### Existing flow

```text
Question
  -> deterministic query understanding and decomposition
  -> semantic + lexical evidence retrieval
  -> candidate fusion, reranking and diversity selection
  -> R3 signal retrieval with source lineage
  -> structured-knowledge lookup
  -> one evidence-constrained synthesis call
  -> cited answer and retrieval diagnostics
```

### R4 extension

```text
Verified external source
  -> R2 source registry, fetch, parsing, versioning and approval
  -> R3 observation and signal processing
  -> R4 canonical entity resolution
  -> evidence-anchored relationship extraction and validation
  -> persistent entity + relationship + signal graph
  -> bounded graph-neighbourhood and dossier retrieval
  -> evidence + signal + graph candidate alignment
  -> cited conversational analysis
```

## Implementation plan

1. Add an additive, RLS-protected relationship model with explicit/inferred basis, validity periods, evidence lineage, revisions, review events, diagnostics and source-yield/coverage records.
2. Extend entity metadata and hierarchy without replacing R3 IDs or aliases.
3. Add strict, injection-resistant relationship extraction from accepted observations, deterministic matching, confidence scoring, deduplication and idempotent workflow processing.
4. Add bounded, indexed graph-neighbourhood retrieval and align every relationship supplied to synthesis with approved source references.
5. Replace static organisation profiles with living database-backed dossiers while retaining the existing Irish Life interface.
6. Add authenticated coverage and relationship diagnostics for administrators.
7. Activate the existing 634 verified, terms-cleared Grade-A targets in controlled batches; retain human evidence approval before retrieval.
8. Add R4 graph, provenance, temporal, security and retrieval regression tests plus a 75-question evaluation set.

## Release guardrails

- Postgres remains the graph store; no separate graph database is justified for the bounded traversals in R4.
- Source content is untrusted data and cannot create an active relationship without accepted observation lineage.
- Graph context complements evidence retrieval and never replaces citations to original sources.
- Ambiguous entity matches remain unresolved or reviewable rather than being force-merged.
- Expansion reports actual achieved coverage. The 20,000–30,000 evidence target is an operational outcome of ongoing approved ingestion, not a reason to manufacture records or bypass review.
- R5 autonomous investigation and R6 prediction/learning remain out of scope.

## Implemented release state

R4 is deployed as an additive graph and coverage layer over the existing R1–R3 system. The production migration:

- activates the 634 endpoint-verified, terms-cleared Grade-A reference targets across 49 managed sources;
- retains approval before new evidence becomes available to retrieval;
- queues the first 40 bounded R4 ingestion runs rather than attempting an uncontrolled corpus-wide operation;
- extends canonical entities with hierarchy, geography, lifecycle and confidence metadata;
- stores explicit and inferred relationships separately, with temporal validity, explainable confidence, observation/signal lineage, revisions and administrator review events;
- provides bounded one- or two-hop Postgres graph retrieval and only supplies relationships to answer synthesis when their source lineage matches retrieved evidence;
- adds source-yield metrics, daily coverage snapshots, coverage-gap alerts and an authenticated graph operations screen;
- replaces fixture-based competitor and organisation views with live, evidence-grounded dossier data;
- connects accepted observation processing to idempotent relationship construction and connects the daily source workflow to controlled graph and corpus backfill.

### Production snapshot after migration

| Measure | Actual |
| --- | ---: |
| Managed registry sources | 409 |
| Active source groups | 49 |
| Enabled, approved-for-fetch targets | 634 |
| R4 source runs initially queued | 40 |
| Evidence records | 70 |
| Approved evidence records | 15 |
| Evidence passages | 302 |
| Canonical entities | 54 |
| Evidence-grounded relationships | 3 |
| Open, automatically identified coverage gaps | 90 |

The first deterministic relationship backfill produced three inspectable edges from the four accepted R3 observations: two explicit strategic relationships and one inferred capability relationship. This deliberately small starting graph reflects the approved evidence state; it is not presented as broad market coverage.

### Evaluation and operational limits

- Static checks: ESLint and strict TypeScript pass.
- Automated checks: 140 tests pass and one live-network evaluation is opt-in; the R4 suite contains 11 provenance, scoring, traversal and prompt-injection tests.
- Evaluation catalogue: 80 graph-aware questions across entity, comparison, technology, relationship, trend, multi-signal, historical, regulatory, international and premise-challenge categories.
- Production build: passes. The existing `unpdf` workflow dependency emits a non-blocking webpack `import.meta` warning.
- Supabase advisors: no new R4 security-policy finding and no remaining unindexed R4 foreign key. Existing project-level warnings about `pg_net`, leaked-password protection and six unrelated RLS-without-policy tables are outside this release and should be handled separately.

The 20,000–30,000 evidence target is not yet achieved. Reaching it requires the queued sources to be fetched, reviewed and accepted over controlled production batches. R4 does not manufacture records or bypass the approval control to claim the target. Relationship merge and entity-merge storage are present; a full collision-safe entity-merge operator is intentionally held for a focused follow-up rather than risking provenance loss in this release.
