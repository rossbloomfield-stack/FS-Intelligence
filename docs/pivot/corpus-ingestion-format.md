# Intelligence corpus ingestion format

R5 accepts versioned JSON batches. Every record resolves an existing canonical organisation slug and every factual record carries at least one existing `sources.id`. Approval is a separate human-controlled step; ingestion must never set `approved=true` automatically.

```json
{
  "schemaVersion": "1.0",
  "batchId": "2026-08-irish-banking-results",
  "records": [
    {
      "type": "financial_metric",
      "organisationSlug": "canonical-organisation-slug",
      "metric": "profit_before_tax",
      "value": 0,
      "unit": "EUR million",
      "periodStart": "2026-01-01",
      "periodEnd": "2026-06-30",
      "reportedAt": "2026-07-31",
      "sourceId": "00000000-0000-0000-0000-000000000000",
      "notes": "What the reported figure represents; do not add interpretation here."
    }
  ]
}
```

Supported `type` values are `company_strategy_profile`, `financial_metric`, `product`, `digital_capability` and `customer_signal`. The exact executable contract is in `src/schemas/intelligence-corpus.ts`.

## Quality gates

- Add the source first, retaining URL, publisher, publication date, source type and evidence classification.
- Use a canonical organisation slug already present in `organisations`; aliases are for query resolution, not ingestion.
- Preserve reported units and periods. Do not calculate, interpolate or annualise missing figures.
- Use `insufficient_evidence` for an unverified capability; absence of a record is not proof a capability is unavailable.
- Product pricing and fees must include an effective or verification date and source.
- Customer research must include methodology, geography, survey date, sample size where disclosed and limitations.
- Keep imported records unapproved until source access, claim support, dates, entity and duplication checks pass.
- Do not paste copyrighted full text. Store metadata, short permitted excerpts and factual notes.
