# Financial Services Transformation Intelligence

## Purpose

This repository builds a persistent, evidence-led board intelligence platform for the Republic of Ireland. It converts market signals into verified events, deterministic materiality scores, strategic patterns, decisions and approved weekly reports. It is not a news aggregator.

## Architecture and directories

- `src/app`: Next.js App Router UI and authenticated/cron route handlers.
- `src/agents`: bounded Agents SDK specialists. Agents return structured outputs and never publish.
- `src/workflows`: deterministic Workflow DevKit orchestration and retryable steps.
- `src/prompts`: versioned agent instructions; do not embed giant prompts in routes.
- `src/schemas`: Zod contracts and deterministic scoring.
- `src/lib/supabase`: browser, SSR and server-only clients.
- `supabase/migrations`: immutable production migrations.
- `tests` and `evals`: deterministic tests and agent behavioural evaluations.

## Non-negotiable evidence rules

- Distinguish event, announcement and publication dates.
- Never describe a proposed rule as final or an announced acquisition as complete.
- Every material claim requires a source link; otherwise mark evidence insufficient.
- Prefer primary sources and corroborate high-materiality events where practical.
- Store metadata, short permitted excerpts and factual notes—not full copyrighted articles.
- Explicitly identify company claims, analyst inference and speculation.
- International events require credible Irish read-across.

## Coding conventions

- Strict TypeScript; no `any` without a written justification.
- Zod at external, agent and route boundaries.
- Server Components by default. Keep secrets in `server-only` modules.
- Workflow functions orchestrate only. I/O belongs in `"use step"` functions.
- Materiality totals must be calculated deterministically, never trusted from a model.
- Use Irish/British English in executive content.

## Database and security

- Create schema changes as migration files and verify against the connected project.
- Enable RLS on every exposed table. Public reads require publication/approval predicates.
- Admin policy trusts JWT `app_metadata`, never user-editable metadata.
- Never expose OpenAI or Supabase service-role keys to the browser or commit real secrets.
- Run Supabase security and performance advisors after DDL changes.

## Required checks

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Agent/eval changes must cover date correctness, acquisition/regulatory status, evidence class, deduplication, inclusion, materiality and QA blocking.

## Definition of done

A change is complete when inputs and outputs are typed, lineage and sources persist, RLS is appropriate, failure/retry paths are considered, tests pass, executive UI remains accessible, documentation is updated and no secret is exposed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
