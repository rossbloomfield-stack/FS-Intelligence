# Semrush research and content experience — implementation map

Prepared 5 October 2026. This note records the implementation points inspected before extending the product.

## Existing application and reuse points

| Concern | Existing implementation | R1 extension point |
| --- | --- | --- |
| Main experience | `src/app/intelligence/page.tsx`, `src/components/intelligence-chat/intelligence-chat.tsx` | Keep the existing conversation entry point; add context and capability affordances there, not a second dashboard. |
| Auth and authorization | Supabase SSR in `src/lib/supabase/server.ts`; `requireUser` / `requireAdmin` in `src/lib/supabase/auth.ts` | All user-facing research and artifact routes must call `auth.getUser`; admin connection diagnostics must call `requireAdmin`. |
| Conversation writes | `/api/intelligence/chat` writes `conversations`, `conversation_messages`, `conversation_entities`, `conversation_references` | Reuse conversation IDs and ownership. Existing chat currently receives client history and does not hydrate it from durable messages on page load. |
| Evidence retrieval | `src/lib/intelligence/retriever.ts`, query planning, signals and graph retrieval | New search evidence must remain distinct from market-intelligence evidence and keep its provider/report provenance. |
| Answer synthesis | `src/lib/intelligence/answer-agent.ts` with AI SDK 7 structured output and the configured OpenAI model | Route only validated research needs to provider tools; keep synthesis grounded in normalized provider results. |
| Async processing | Vercel Workflow in `src/workflows/*` | Long audits/render/image jobs need durable steps and reconnectable run IDs; never leave unawaited serverless work. |
| Admin | `/intelligence/admin` and nested operational pages, gated by `requireAdmin` | Add provider status and capability discovery without exposing secrets or user content. |
| Imports | `read-excel-file` is installed; no CSV parser or import persistence path found | Add scoped AI-visibility CSV/XLSX ingestion only with additive owner-scoped persistence. |
| Artifact delivery | No application artifact store, private bucket workflow, image generation adapter, or artifact route was found | Persist bytes before declaring success; use private object storage and authenticated download/preview routes. |
| Feature flags | Only `USE_FIXTURES` currently appears as a central flag | Add server-only defaults-off flags for Semrush, drafts, and visual references. |

## Provider and schema findings

* The official Semrush MCP uses Streamable HTTP at `https://mcp.semrush.com/v2/mcp`; OAuth is its default, and a server API key can use `Authorization: Apikey …` ([Semrush MCP documentation](https://developer.semrush.com/api/v3/introduction/semrush-mcp/)).
* Its documented surface includes SEO reports, subscription-dependent Trends reports, and read-only Projects API methods. Each request consumes account API units. A project/site-audit write or crawl is explicitly outside this implementation.
* The app repository and `.env.example` initially had no Semrush or image-generation configuration. A read-only Vercel environment-name check found `OPENAI_API_KEY` on the production project, but no `SEMRUSH_API_KEY`, Semrush OAuth configuration or image-provider-specific configuration. Secret values were not decrypted or displayed. Codex's own connected tools are not credentials for this deployed application.
* Vercel project settings were not changed and no provider secret was read. OAuth requires a Semrush application registration, callback allowlisting, PKCE/state handling and secure token storage; it is not safe to fake that setup. The first adapter path is the documented server-side API key, while OAuth remains a required follow-on before treating the preferred connection route as complete.
* The production Supabase schema includes conversation tables and prior Semrush-related tables not represented by the local migration set. The local `supabase` CLI is unavailable. New persistence must therefore wait until local/remote migration lineage is reconciled; no production DDL was guessed or applied.

## Implementation completed in this tranche

* Versioned validated intent routing is wired into chat and records its selected intent/context in the conversation. Paraphrase tests cover content needs, competitive discovery, AI visibility, supplied-data-only mode and revision references.
* The server-only Semrush adapter performs current-protocol capability discovery and filters to read-only tools. The chat research bridge now discovers the supported report tools, asks the model to select a narrowly relevant report, fetches that report's live schema, and validates the eventual call against the discovered MCP schema. It does not guess report names or parameters.
* An authenticated admin panel reports provider configuration/capabilities without disclosing secrets.
* A default-off AI-visibility CSV/XLSX import now requires a brand, platform, market, date range and metric/denominator definition. CSV parsing supports BOM, delimiter variants, quoted fields and embedded newlines; XLSX uses the installed reader. Recognized values are normalized, unmatched columns remain raw, and imports are saved as owner-scoped conversation messages so they reopen after refresh. Cross-brand comparisons are compatible only when platform, market, exact period and metric definition match.
* Versioned initial brand profiles are present for Irish Life and Unio, based on five to six current public pages each. Each field avoids unverified colour/logo/font claims; profiles explicitly keep independent-advice claims unresolved unless an exact service disclosure supports them.
* With `ENABLE_CONTENT_DRAFTS=true`, conversational draft requests produce complete typed page copy using retrieved evidence, profile-specific writing constraints and validated reference IDs. Drafts and revisions are persisted in the existing immutable assistant-message history, shown inline with a copy action, and marked as draft/not approved. Text/sections are data, never executable markup.

## Remaining requirements / blockers

* Live Semrush research is now wired into supported content/SEO intents when `ENABLE_SEMRUSH_RESEARCH=true` and `SEMRUSH_API_KEY` is configured. The model can use at most four discovered read-only MCP calls for one user request; it must obtain report schema before execution. Site audits/crawls and all project/campaign writes are excluded. No daily API-unit cap is configured, as requested; Semrush's unit-based billing still applies.
* Semrush output is added as a non-primary, ephemeral evidence reference and is not inserted into `sources` or the corpus. It is retained with the conversational message for citation display, while only normal database sources are written to `conversation_references`. Output is explicitly described as modelled search/traffic data, not company disclosure. The report result still requires live production validation after deployment.
* OAuth, report-specific normalization, durable/reconnectable research runs, API-unit ledgering, a production browser-authenticated query, and image/artifact delivery remain outstanding. No Supabase migration was added because the production migration lineage is still not reconciled.
* No image provider key/model is configured, and there is no private artifact bucket, artifact metadata schema or authenticated preview/download route. Therefore the visual request still cannot produce durable PNG/HTML outputs. The app deliberately does not claim an image exists.
* Existing conversation storage is reused for draft/import durability, but there are no dedicated tenant-scoped `research_runs`, `brand_profiles`, `draft_versions`, `visual_jobs`, `artifacts` or review-event tables. The production Supabase migration ledger is ahead of the checked-in local history and the Supabase CLI is absent, so no speculative migration or production DDL was applied. Reconcile the remote/local baseline before adding these tables/bucket policies.
* The app’s current streaming request writes answers/drafts synchronously. It does not create an independently reconnectable long-running research/render job, supports no cancellation/checkpointing, and does not track Semrush units/cost.
* This tranche has no end-to-end provider-authorized research → draft → durable visual journey, no production browser authentication test, no saved Unio example conversation, and no staging deployment. Development-server verification reaches the existing approved-login gate; the protected admin page could not be opened without using a user account. Do not report these as passed.

## Rollout and verification boundary

All new entry points default off. `ENABLE_AI_VISIBILITY_IMPORTS` enables the admin CSV/XLSX flow; `ENABLE_CONTENT_DRAFTS` enables chat drafting; `ENABLE_SEMRUSH_RESEARCH` controls discovery/connection state; `ENABLE_VISUAL_REFERENCES` remains a future placeholder and must stay off. `SEMRUSH_API_KEY` is server-only and currently absent locally. Deterministic parser/router tests pass; no live Semrush or image-provider result has been produced. Production publication remains subject to the existing release gate. No deployment was made.
