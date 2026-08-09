sed: --: No such file or directory
# Data model

`report_runs` is the lineage root. It owns agent/step execution, candidate events, scores, themes, recommendations and final reports. Sources and organisations are canonical shared entities connected by junction tables. The reporting-period/version unique constraint enforces idempotency; a rerun increments the version. See `supabase/migrations` for the authoritative schema.
