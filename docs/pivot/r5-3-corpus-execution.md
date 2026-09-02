# R5.3 — Corpus execution and review

## Outcome

R5.3 converts the R5.2 verification queue from passive database records into durable, bounded ingestion work. Each run remains tied to an explicitly enabled connector and reference target. The worker fetches only approved HTTPS hosts, discovers a target-specific official document where required, extracts a bounded set of relevant passages, records failures and leaves every new item unavailable to conversation until an administrator approves it.

## Execution flow

1. `claim_source_ingestion_runs` atomically claims at most five eligible runs with `FOR UPDATE SKIP LOCKED`.
2. a Vercel Workflow run is started for each claimed target;
3. a step reloads the connector and target and verifies both remain enabled and approved for fetch;
4. the fetcher enforces an exact host allow-list, HTTPS, redirect, timeout and 48 MB response limits;
5. HTML archive pages are searched for the strongest year- and document-type match;
6. HTML or PDF content is parsed in memory and reduced to at most 24 strategy-relevant passages;
7. the source item, hashes, passages, organisation relationship and run metrics are persisted idempotently;
8. the item is placed in the administrator review queue;
9. only the `review_source_item` approval operation creates or activates a citation-ready source and makes its passages retrievable.

The worker does not persist raw source files or full copyrighted reports. PDF extraction is limited to 160 pages or 45 seconds and records when extraction is truncated.

## Operations

The authenticated administrator page now shows:

- approved-document, passage, enabled-target and pending-review counts;
- queued, running, completed, partial, failed and blocked run counts;
- a bounded “process next five” action;
- the official source URL and required publication-date verification;
- explicit approve and reject controls.

The two existing DST-safe daily cron invocations each attempt to drain two approved queue records. This stays within the existing Vercel cron allocation and does not create a third scheduled job. An administrator can start a larger five-record batch on demand.

## Failure behaviour

- HTTP 429 and server failures receive bounded workflow retries.
- access challenges, unsupported content, unapproved hosts and empty extraction are blocked without repeated fetching;
- response bodies larger than 48 MB are rejected;
- failed runs and connector failure counts are persisted;
- a blocked target records its reason for research-operations review;
- retries and persistence are idempotent by run ID and canonical-document hash.

## Approval contract

Approval requires:

- a parsed source item;
- at least one stored passage;
- an administrator session;
- a verified publication date when the target requires one.

Approval promotes a `document` source with `approved_public=true`, links it to the item and records an audit event. Rejection records the reason and audit event. Neither queue execution nor successful parsing implies publication.

## Remaining expansion

R5.3 executes the first 20-target reporting cohort. Expansion beyond it still requires explicit terms and endpoint review, followed by controlled activation of additional readiness-A connectors. B-grade discovery and C-grade targets remain disabled. Broad regulatory/API adapters, deeper archive discovery and automated factual-claim extraction remain later releases.
