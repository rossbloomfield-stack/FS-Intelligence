# R5.2 — Corpus activation and retrieval depth

Activated in the production Supabase project on 2 September 2026.

## Outcome

R5.2 corrects the gap between the 4,146-row source catalogue and the much smaller citation-ready evidence corpus. It does not misrepresent catalogue targets as evidence. Instead, it improves the usefulness of approved evidence immediately and opens a controlled path for further backfill.

## Retrieval changes

- Approved evidence is retained as ranked passages rather than reduced to one compressed note per document.
- The answer agent can receive up to 18 high-quality passages across a maximum of ten source records.
- The public evidence UI distinguishes source count from passage count.
- Broad executive questions receive deterministic intent expansion before Postgres full-text search.
- The competitor-risk prompt is now classified as a market overview rather than `other`.
- Passage search returns linked organisation names and supports up to 60 candidates before application reranking.
- Market-wide questions can use the approved strategy, financial and digital-capability records even when no company is named.
- Structured facts include organisation names in the synthesis package.

## Production corpus state

After the migration:

| Measure | Production count |
|---|---:|
| Approved source records | 15 |
| Approved source items | 15 |
| Approved searchable passages | 21 |
| Enabled verified connectors | 5 |
| Enabled readiness-A targets | 20 |
| Queued bounded verification runs | 20 |

Ten previously approved document records were promoted into the passage pipeline using their already reviewed factual notes. No raw copyrighted article or report body was copied into the database.

## Controlled connector cohort

The first activation cohort is limited to Great-West Lifeco, Zurich, AIB, Bank of Ireland and Aviva reporting endpoints. Each endpoint was already recorded as verified and not requiring terms review. Only 2025 annual-report, results-presentation, results-release and regulatory/capital-disclosure targets were enabled.

Discovery remains fail-closed:

- no B- or C-grade target is enabled;
- no discovered item becomes evidence automatically;
- fetched material must retain source lineage and publication dates;
- source items and passages require approval before authenticated retrieval;
- queued verification work does not imply completed ingestion.

## Verified uplift

Before R5.2, the representative prompt `What are my competitors doing that I should be worried about?` returned no matching chunks. With intent expansion and passage retrieval it returns ten matching passages across eight approved sources in the current production corpus.

## Remaining work

- Execute and review the 20 queued verification runs through a bounded connector worker.
- Expand approved annual-report history from 2025 to 2021–2025.
- Implement regulator publication adapters beginning with the Central Bank of Ireland and EU primary law.
- Add verified competitor developments, AI initiatives, ownership events and regulatory items.
- Evaluate semantic reranking only after the passage corpus is materially larger.
- Continue towards 5,000 quality-assured references; 15,000 remains the preferred launch target.
