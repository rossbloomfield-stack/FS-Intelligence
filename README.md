# Financial Services Transformation Intelligence

Board-level, evidence-led market intelligence for Irish financial services. The application runs a durable, typed research workflow, persists evidence and report history in Supabase, and publishes only after QA and administrator approval.

## Local setup

1. Install Node.js 22+ and pnpm, then run `pnpm install`.
2. Copy `.env.example` to `.env.local` and populate required values. Never commit it.
3. For local Supabase, install the current CLI, run `supabase --help`, then `supabase start`.
4. Apply migrations with `supabase db reset` locally. For the linked project, use the reviewed migration workflow in `docs/deployment.md`.
5. Run `pnpm dev` and open `http://localhost:3000/intelligence`.

Fixture mode requires `USE_FIXTURES=true` and is automatically disabled in production.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` intentionally uses webpack because Workflow DevKit directive transformation was verified there with Next.js 16.3. The compiled route must contain `reportWorkflow.workflowId`.

## Running reports

- Admin: sign in at `/intelligence/login`, then use `/intelligence/admin`.
- API: `POST /api/admin/report-runs` with `{ "rerun": false }` and an authenticated admin session.
- Cron: Vercel calls `/api/cron/weekly`; `CRON_SECRET` is required.
- Evals: `pnpm test:evals` once live-agent eval credentials are configured.

## Deployment summary

1. Apply reviewed Supabase migrations and run security/performance advisors.
2. Push a feature branch and open a pull request; CI must pass.
3. Link the GitHub repository to Vercel and configure environment variables.
4. Verify the Preview deployment, merge to `main`, then add `rossbloomfield.com/intelligence` or `intelligence.rossbloomfield.com`.

See [build plan](docs/build-plan.md), [architecture](docs/architecture.md), [deployment](docs/deployment.md), and [operations](docs/operations.md).

## Troubleshooting

- `start received an invalid workflow function`: confirm `withWorkflow()` and use the webpack build.
- Supabase reads return no rows: check Data API grants, RLS predicates and token freshness.
- Admin denied after role change: refresh the session so JWT app metadata is current.
- Cron returns skipped: it is outside Thursday 08:00 Europe/Dublin or the duplicate period constraint matched.
- QA blocks publication: inspect the persisted critical issues; do not bypass the gate.
