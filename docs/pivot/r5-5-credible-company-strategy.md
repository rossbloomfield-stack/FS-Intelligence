# R5.5 — Credible company-strategy answers

## Objective

Make a simple company question such as `What is AIB's strategy?` return a current, evidence-led answer in production. The change is deliberately reusable: it improves the company-strategy path rather than adding an AIB-specific response.

## Production diagnosis

The failure had two separate causes.

1. The optional knowledge-graph query could fail with a recursive row-level-security policy and turn the whole chat request into a `502` response.
2. The generic retrieval path did not assemble the evidence categories needed for a credible strategy assessment. At inspection time AIB had 25 source items, but only four were approved for retrieval; 103 richer passages were unavailable. Approved evidence contained no independent news or careers material. The selector could therefore describe a handful of primary-source passages while still calling a broad, partly unrelated result set strong.

Conversation history was also being prepended to every new retrieval query. A new AIB question asked after a daily-news question could inherit the prior topic and retrieve unrelated companies.

## Implementation

The company-strategy path now uses four explicit evidence facets:

- `declared_strategy` — annual reports, results and investor material;
- `recent_execution` — dated launches, investments, partnerships and operating developments;
- `independent_context` — reputable independent reporting that corroborates or challenges company claims;
- `soft_signal` — dated hiring, leadership and capability-building evidence, always described as directional rather than proof of deployment or spend.

For a resolved organisation, retrieval requests an organisation-scoped candidate pool, fuses it with the existing hybrid search, reranks it, and reserves space for each available facet. Structured company profiles supply declared priorities rather than being reduced to a one-line summary. Freshness and category gaps are passed to synthesis, and the deterministic fallback produces a contextual assessment instead of a source listing.

The runtime path is:

```text
Current user question
→ follow-up-aware entity resolution
→ company-strategy query decomposition
→ organisation-scoped strategy candidates + existing hybrid retrieval
→ deduplication and facet-aware evidence selection
→ current structured profile and metrics
→ evidence-led synthesis
→ cited answer with explicit soft-signal limits
```

Knowledge-graph context remains optional. A graph enrichment error is logged and omitted; it cannot take down the evidence answer.

## AIB acceptance contract

The production question `What is AIB's strategy?` should:

- cite recent first-party strategy/results material;
- explain AIB's stated priorities before offering interpretation;
- connect those priorities to recent execution evidence;
- include independent reporting where available;
- label careers evidence as a soft, directional signal;
- avoid unrelated competitor evidence unless the user requests a comparison;
- state the evidence cutoff and any material coverage gap;
- continue to answer if graph enrichment is unavailable.

## Limits

This release activates a credible minimum AIB dossier; it does not complete the 5,000/15,000-reference corpus target. Hiring evidence indicates capability demand, not deployed technology, investment amount or business outcomes. Independent reports provide corroboration and context but do not replace company filings for declared strategy.
