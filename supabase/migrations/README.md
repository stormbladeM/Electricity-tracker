# Migrations

`0001_init.sql` is the initial schema: the geographic hierarchy (states → lgas → areas), profiles, power_logs, outage_intervals, fault_reports, fault_confirmations, and admin_audit_log, plus the RLS policies and helper functions that secure them. It follows the data model in [`docs/project-plan.md`](../../docs/project-plan.md#3-data-model-supabase--postgres) and the decisions in [`CLAUDE.md`](../../CLAUDE.md). Apply it with the Supabase CLI or MCP `apply_migration` against the project — it's written to be safely re-run.
