sed: --: No such file or directory
# Architecture

```mermaid
flowchart TD
  C["Vercel Cron or authenticated admin"] --> O["Report workflow"]
  O --> D["Discovery steps in parallel"]
  D --> E["Entity resolution and deduplication"]
  E --> V["Source verification"]
  V --> M["Deterministic materiality calculation"]
  M --> A["Pattern and specialist analysis"]
  A --> S["Executive synthesis"]
  S --> Q["QA / red team"]
  Q -->|critical issue| F["Failed or revision required"]
  Q -->|passed| H["Approval hook"]
  H --> P["Publishing step"]
  P --> DB[("Supabase Postgres")]
  DB --> UI["Public dashboard and admin progress"]
```

The workflow is deterministic and owns state, sequencing, retries, idempotency, cost ceilings and approval. Specialist agents make bounded judgements and return schema-validated data. They cannot publish.

## Trust boundaries

- Browser: publishable Supabase key only; all access passes through RLS.
- Next.js server: authenticates users and validates inputs.
- Durable steps: hold service credentials and call OpenAI/Supabase.
- Public UI: reads only published reports and approved evidence metadata.
- Admin UI: requires both a valid session and admin app metadata.

## Reporting-period idempotency

The unique `(period_start, period_end, version)` constraint makes the scheduled run idempotent. A rerun increments `version` and sets `is_rerun=true`. Event-level `dedupe_key` is unique within a run.
