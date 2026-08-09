# Deployment

Production uses Supabase project `zpihtznzubnrdxnaozwm`, GitHub Actions and Vercel. Apply migrations in order, generate types, run both advisors, and ensure only fresh-index unused notices remain. Configure all `.env.example` variables in Vercel; service-role and OpenAI keys are server-only. Preview deployments must pass authentication, RLS, workflow transform, cron-secret and fixture-disabled checks before promotion.

Vercel Cron runs at both 07:00 and 08:00 UTC on Thursdays. The handler proceeds only at local 08:00 Europe/Dublin, and the database unique constraint absorbs duplicate delivery.
