# Missing items and required actions

Captured after R1 and reviewed at the start of R2. This delivery action register is separate from the release architecture.

| Missing item | Required action | Owner / dependency | Release status |
|---|---|---|---|
| Approved intelligence corpus is below launch readiness | Expand the six-record production demo corpus to the quality-assured launch threshold; exclude unrelated domain-investment rows from all readiness counts. | Research operations / data ingestion | Minimum R2 demo corpus added; full ingestion remains |
| Preview allowlist not confirmed end-to-end | Set `APPROVED_USER_EMAILS=masses_bonds_0l@icloud.com` in Preview and exercise magic-link authentication. | Vercel environment + approved user | Required before stakeholder preview sign-off |
| Conversation history is display-only | Add reopen, rename and delete flows with ownership checks and RLS verification. | Product / engineering | Deferred to a later approved release |
| Official Irish Life logo asset is absent | Obtain an approved official asset and replace the directional text treatment. | Brand owner | Required before production promotion |
| Content Security Policy permits unsafe inline/eval | Introduce nonces/hashes and remove unsafe directives where compatible. | Security / platform | Production hardening |
| Local GitHub CLI authentication is unreliable | Repair the credential helper or continue using the scoped GitHub connector; do not weaken repository controls. | Developer tooling | Does not block preview delivery |
| Claim-level lineage requires production schema | Maintain the owner-scoped RLS policies, authenticated grants and foreign-key indexes introduced by the reviewed R2 migrations. | Database reviewer | Applied to production and advisor-checked in R2 |
| Evidence quality coverage is narrow | Continue populating primary/secondary classification, dates, authority tiers and claim-support notes during ingestion. | Research operations | Six primary demo records are classified; broader coverage is required for synthesis |
| Counter-evidence is not populated | Add verified counter-evidence relationships during ingestion/retrieval; never infer them from source volume. | Retrieval/data work | UI supported in R2; data unavailable |
| Production is intentionally unchanged | Review the draft PR and preview; explicitly approve a later production promotion. | Product owner | Stage-gated |
