# R5.4 — Daily official-source discovery

## Outcome

R5.4 turns the controlled target queue into a small recurring discovery loop for current official publications. It does not enable broad crawling and it does not auto-publish evidence. The initial production cohort is Central Bank of Ireland, the Financial Conduct Authority, AIB and Bank of Ireland. Each connector has an exact listing/feed URL, same-host allow-list, required path fragments, excluded routine notices and a daily item ceiling.

Zurich and Aviva are excluded because their listings currently reject the bounded server-side client. Great-West Lifeco is excluded because its listing does not expose stable server-rendered publication links. All three remain available for their existing fixed reporting targets.

## Flow

1. a dedicated DST-safe cron requests one discovery run per approved connector and Dublin date;
2. `claim_source_discovery_runs` prevents duplicate same-day runs;
3. a durable Workflow run fetches the approved listing or feed with redirect, size, timeout and host controls;
4. RSS/Atom or HTML links are normalised, deduplicated, filtered by connector-specific path and exclusion rules, and ranked by date and strategic relevance;
5. up to the connector ceiling become readiness-A dynamic reference targets and queued ingestion runs;
6. R5.4 ingestion runs are prioritised by the latest discovery date and candidate rank, ahead of the historical backlog;
7. each discovery workflow starts up to two newly queued ingestion runs in the background, so same-day evidence can reach review without waiting for the next cron invocation;
8. the existing ingestion workflow fetches and parses the individual item;
9. an administrator verifies the publication date and approves or rejects it;
10. only approved evidence becomes available to conversational retrieval and the daily briefing.

## Safety and evidence controls

- discovery is a permission separate from connector and target activation;
- every discovered URL must be HTTPS and match the configured official host and path fragment;
- discovered targets are idempotent by canonical URL hash;
- publication dates found in an approved feed or listing are carried into parsing but remain subject to administrator verification;
- routine share-dealing and voting-rights notices are excluded for the bank feeds;
- a connector creates no more than 5–8 candidate targets per daily run;
- raw pages are not retained; the existing bounded passage and review rules apply;
- discovery success is not evidence approval;
- the admin screen exposes discovery coverage, last success and the review queue.

## Daily briefing readiness

The conversational daily briefing already fails closed unless approved evidence falls inside its current three-day window. R5.4 supplies that window with current candidates, but a daily result remains dependent on timely administrator review. This is deliberate for the demo and preserves the platform’s evidence contract.
