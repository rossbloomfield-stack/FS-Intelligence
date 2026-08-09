# CEO experience improvement plan

## Current implementation

The application is a Next.js 16 App Router product backed by Supabase. Published reports, report runs, evidence sources, materiality scores, board signals, strategic themes, competitor updates, recommendations and covering emails already have production data structures. Public report reads are protected by publication predicates; administration is protected separately.

The visual system is suitable for the audience: deep purple, orange, pale neutral surfaces, restrained typography and low decoration. The public information architecture is broader than an executive needs, the homepage leads with a weekly conclusion instead of the permanent proposition, and inert search/notification controls reduce confidence. Several category views use a static market-report fallback even when published report metadata is available.

## Reusable components and structures

- `IntelligenceShell`, `SectionPage` and the existing CSS tokens remain the layout foundation.
- `reports`, `report_runs`, `sources`, `board_signals`, `strategic_themes`, `theme_assessments`, `competitor_updates`, `strategic_recommendations`, `leadership_decisions` and `covering_emails` remain the canonical data model.
- The published-report loader and baseline/briefing Zod contracts can be evolved rather than replaced.
- Existing competitor coverage and evidence links remain useful as a clearly identified fallback until equivalent published rows are available.

## Changes required

1. Separate the permanent proposition from the weekly assessment.
2. Put market pressure, the five executive signals, one-minute conclusions and decisions above category exploration.
3. Standardise board score, RAG, trend and confidence semantics with accessible text.
4. Compare canonical current and previous signals deterministically; never infer movement from current sentiment.
5. Make evidence visible at the claim, with source classification and supported-claim context.
6. Simplify primary navigation and move administration to the authenticated utility path.
7. Make competitor and signal views entity/theme-first, with useful filters and detail pages.
8. Add methodology, authorship, metadata, sitemap, robots and appropriate structured data.

## Data gaps

- Current published baseline content does not always contain typed board-signal categories, confidence, owners, timing or canonical theme identifiers.
- Historical comparisons are only possible where canonical IDs exist in two published periods. Otherwise the honest state is `New` or `No prior comparison`.
- Organisation momentum dimensions are not consistently populated in the production dataset.
- Static competitor coverage remains a fallback until `competitor_updates` and organisation assessments are populated for every covered entity.
- Source counts are shown only where source rows or report evidence actually support the count.

## Migration requirements

No immediate migration is required for the executive UI: existing report/theme/board-signal tables can support it, and report JSON remains boundary-validated. A later migration should only be added after production-row inspection confirms a need for dedicated organisation-assessment snapshots or additional board-signal attributes. It must reuse existing enums/tables rather than duplicate them.

## Implementation checklist

- [x] Repository, routes, schemas, migrations, auth and deployment configuration inspected
- [ ] CEO homepage and simplified responsive navigation
- [ ] Accessible board signals, trends, confidence and evidence UX
- [ ] Deterministic current-versus-previous comparison tests
- [ ] Entity-first competitor and organisation profiles
- [ ] Theme views and Ireland-versus-global comparison
- [ ] Executive report hierarchy and board-email utility
- [ ] Metadata, structured data, sitemap and robots
- [ ] Lint, typecheck, tests and production build
- [ ] Desktop/mobile browser verification
- [ ] Feature branch and draft pull request (no production merge)
