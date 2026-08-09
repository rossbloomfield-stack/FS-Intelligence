# Build plan

Last updated: 9 August 2026

## Product contract

Build a persistent, board-level Irish financial-services transformation intelligence platform at `/intelligence`. A deterministic durable workflow coordinates strongly typed specialist agents. Evidence, dates, scores, report lineage, approvals and history live in Supabase. Only a QA-passed, explicitly approved report may become public.

## Architecture decisions

- Next.js 16 App Router with React Server Components by default and client components only for interaction.
- Workflow DevKit coordinates durable, replayable steps. Workflow functions contain orchestration only; OpenAI, database and external calls live in `"use step"` functions.
- The same workflow serves cron and authenticated manual triggers.
- Approval pauses via a deterministic Workflow hook tied to the `report_run` UUID.
- Supabase is the system of record. `report_run_id` provides lineage; source and entity data are normalised.
- Supabase browser clients use publishable/anon keys and RLS. A distinct server-only client owns service-role operations.
- Agents SDK uses Responses API, web search and Zod-backed output types. Models are environment-configurable.
- Fixture mode is development-only and fails closed in production.
- Materiality totals/classification are calculated in code and stored with generated Postgres columns.

## Assumptions

- The existing Supabase project `zpihtznzubnrdxnaozwm` is the production target.
- Passwordless email is the MVP authentication method. Admin authorisation is represented in both `profiles.role` and JWT `app_metadata.role`; only app metadata is trusted by RLS.
- The Vercel plan supports two Thursday cron invocations. Both are required for GMT/IST; the handler checks Europe/Dublin local time and the database uniqueness constraint prevents duplicates.
- `rossbloomfield.com/intelligence` is preferred; `intelligence.rossbloomfield.com` remains a deployment-only domain choice.
- No external email is sent in MVP.

## Checklist

### Phase 1 — Foundation

- [x] Pin current stable dependencies after official-doc verification
- [x] Create Next.js shell and board-grade fixture CEO dashboard
- [x] Add Supabase SSR browser/server/admin clients
- [x] Add passwordless admin sign-in and protected route proxy
- [x] Create lineage-first schema, RLS, indexes and seed migration
- [x] Create `.env.example`, Vercel cron config and GitHub Actions CI
- [ ] Apply migration to target Supabase project
- [ ] Configure first admin identity
- [ ] Run lint, typecheck, unit tests and production build
- [ ] Browser accessibility/visual verification

### Phase 2 — Intelligence model

- [x] Organisations, aliases, ownership and relationships
- [x] Sources, events, materiality, themes and report lineage
- [x] Recommendations, decisions, questions, watchlist and notifications
- [ ] Complete mandatory organisation seed set
- [ ] Generate database TypeScript types

### Phase 3 — Agent proof

- [ ] OpenAI Agents SDK server client and tracing metadata
- [ ] Discovery, verification, materiality, synthesis and QA agents
- [ ] End-to-end constrained organisation run
- [ ] Persist agent usage and cost
- [ ] Ten contract/eval cases

### Phase 4 — Full specialist coverage

- [ ] Parallel Irish sector agents
- [ ] Regulation, supplier, customer and international benchmark agents
- [ ] Entity resolution, pattern, experience and AI tracker agents

### Phase 5 — Durable orchestration

- [ ] Workflow state machine and retryable steps
- [ ] Approval hook and selective stage rerun
- [ ] Cost ceiling warning/pause

### Phase 6 — Dashboard

- [x] Required routes and navigation shell
- [ ] Data-backed overview, report and archive views
- [ ] Competitor, AI, regulation, actions and sources interactions
- [ ] Admin progress, draft review and usage views

### Phase 7 — Automation

- [ ] Authenticated manual trigger
- [ ] Secured timezone-aware cron trigger
- [ ] Completion notification

### Phase 8 — Hardening

- [ ] RLS security and performance advisors clear
- [ ] WCAG 2.2 AA checks
- [ ] Full-text search
- [ ] Operational runbook and remaining documentation

### Phase 9 — Deployment

- [ ] GitHub feature branch and pull request
- [ ] Vercel preview and production deployments
- [ ] Environment variables and custom domain
- [ ] Production smoke test
