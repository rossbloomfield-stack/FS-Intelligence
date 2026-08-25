# Missing items and required actions

Captured after R1 and reviewed at the start of R2. This delivery action register is separate from the release architecture.

| Missing item | Required action | Owner / dependency | Release status |
|---|---|---|---|
| Approved intelligence corpus is empty | Ingest, verify and approve source records; exclude unrelated domain-investment rows from all readiness counts. | Research operations / data ingestion | Blocks evidence-grounded synthesis; not an R2 UI blocker |
| Preview allowlist not confirmed end-to-end | Set `APPROVED_USER_EMAILS=masses_bonds_0l@icloud.com` in Preview and exercise magic-link authentication. | Vercel environment + approved user | Required before stakeholder preview sign-off |
| Conversation history is display-only | Add reopen, rename and delete flows with ownership checks and RLS verification. | Product / engineering | Deferred to a later approved release |
| Official Irish Life logo asset is absent | Obtain an approved official asset and replace the directional text treatment. | Brand owner | Required before production promotion |
| Content Security Policy permits unsafe inline/eval | Introduce nonces/hashes and remove unsafe directives where compatible. | Security / platform | Production hardening |
| Local GitHub CLI authentication is unreliable | Repair the credential helper or continue using the scoped GitHub connector; do not weaken repository controls. | Developer tooling | Does not block preview delivery |
| Claim-level lineage has no committed schema | Add the R2 migration with owner-scoped RLS and explicit authenticated grants; apply only after review. | Database reviewer | Added in R2; migration remains unapplied |
| Evidence quality cannot yet be assessed | Populate primary/secondary classification, dates, authority tiers and claim-support notes during ingestion. | Research operations | Required for confidence above Insufficient |
| Counter-evidence is not populated | Add verified counter-evidence relationships during ingestion/retrieval; never infer them from source volume. | Retrieval/data work | UI supported in R2; data unavailable |
| Production is intentionally unchanged | Review the draft PR and preview; explicitly approve a later production promotion. | Product owner | Stage-gated |
