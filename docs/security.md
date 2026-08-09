sed: --: No such file or directory
# Security

Public clients receive only a publishable/anon key. Service-role and OpenAI credentials remain in server-only modules. Every public-schema table has RLS. Public evidence requires explicit approval and reports require publication. Admin RLS trusts JWT `app_metadata.role`, never editable user metadata. Inputs use Zod, cron uses a bearer secret, external links must use safe targets, and publication/admin actions are audited.
