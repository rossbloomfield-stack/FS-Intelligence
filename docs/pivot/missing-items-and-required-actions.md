# Missing items and required actions

Captured after R1 and reviewed at the start of R2. This delivery action register is separate from the release architecture.

| Missing item | Required action | Owner / dependency | Release status |
|---|---|---|---|
| Approved intelligence corpus is below launch readiness | Expand the 11-record production corpus to the quality-assured launch threshold; exclude unrelated domain-investment rows from all readiness counts. | Research operations / data ingestion | R5.1 core banking/product batch live; full ingestion remains |
| Custom Supabase authentication email delivery is incomplete | Configure the verified Resend SMTP credentials in Supabase Auth and exercise a complete production magic-link login. | Supabase Auth + Resend | Deferred by product owner until the next working session |
| Conversation history is display-only | Add reopen, rename and delete flows with ownership checks and RLS verification. | Product / engineering | Deferred to a later approved release |
| Official Irish Life logo asset is absent | Obtain an approved official asset and replace the directional text treatment. | Brand owner | Required before production promotion |
| Content Security Policy permits unsafe inline/eval | Introduce nonces/hashes and remove unsafe directives where compatible. | Security / platform | Production hardening |
| Local GitHub CLI authentication is unreliable | Repair the credential helper or continue using the scoped GitHub connector; do not weaken repository controls. | Developer tooling | Does not block preview delivery |
| Claim-level lineage requires production schema | Maintain the owner-scoped RLS policies, authenticated grants and foreign-key indexes introduced by the reviewed R2 migrations. | Database reviewer | Applied to production and advisor-checked in R2 |
| Evidence quality coverage is narrow | Continue populating primary/secondary classification, dates, authority tiers and claim-support notes during ingestion. | Research operations | Eleven primary records are classified; broader coverage is required for synthesis |
| Counter-evidence is not populated | Add verified counter-evidence relationships during ingestion/retrieval; never infer them from source volume. | Retrieval/data work | UI supported in R2; data unavailable |
| Structured knowledge coverage is narrow | Populate more company strategy, financial metrics, products, digital capabilities, AI initiatives, ownership and regulatory items with source lineage. | Research operations / ingestion | R5.1 activates AIB/Bank of Ireland and mortgage-protection records; broader entity and domain coverage remains |
| Fresh-research escalation is assessment-only | Add a bounded primary-source research tool and approval/QA path before using fresh findings in answers. | R4 agent orchestration | R3 flags when escalation is required but does not browse automatically |
| Organisation alias coverage is incomplete | Extend the curated alias set beyond the eight priority aliases added in R3, preserving ownership separately. | Data stewardship | BOI, AIB, Permanent TSB, New Ireland and Irish Life variants are live in production |
| Question-level semantic retrieval is not implemented | Add embeddings only after relational/taxonomy retrieval and evaluate uplift against the golden questions. | Retrieval engineering | Deterministic relevance is delivered in R3 |
| Product-card coverage is narrow | Add verified product records through the R5 source-linked import format and approve only after review. | Research operations / ingestion | Three Irish mortgage-protection propositions are live; pensions, investments, protection and health remain |
| Competitor thumbnails have no approved storage reference | Populate the R5 product-page benchmark table with screenshot storage paths, capture date, page URL and approval status. | Compliance benchmark ingestion | Schema delivered; UI continues to omit unapproved thumbnails |
| R5 launch corpus is below threshold | Ingest and quality-assure at least 5,000 useful references, with 15,000 preferred, using the versioned batch contract. | Research operations | 11 approved references and 28 structured domain records are live; no synthetic filler was added |
| Structured answer history is not hydrated in the UI | Load persisted message parts when reopening a conversation and retain their structured payloads. | Conversation history release | New R4 answers persist correctly; history remains display-only |
| Narrative synthesis remains disabled | Add bounded synthesis, deterministic citation validation and high-risk regulatory QA only after evidence coverage is sufficient. | Retrieval / evaluation | Structured evidence and cards are live; prose remains intentionally fail-closed |
