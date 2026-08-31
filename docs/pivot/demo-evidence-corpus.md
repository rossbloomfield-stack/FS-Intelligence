# R2 production demo evidence corpus

> Historical release record. R5.1 expands the approved production inventory to 11 sources and 28 structured domain records; see `r5-1-production-corpus.md`.

R2 adds a deliberately small, quality-assured set of primary references to the existing production Supabase project. It proves evidence retrieval, ranking, persistence and display without pretending that the knowledge base is ready for broad synthesis.

The initial corpus contains six approved public records:

- Central Bank of Ireland — Consumer Protection Code 2025
- Central Bank of Ireland — Regulatory & Supervisory Outlook Report 2026
- European Union — Artificial Intelligence Act
- European Union — Digital Operational Resilience Act
- AIB Group plc — 2025 Financial Results
- Bank of Ireland Group plc — 2025 Results Announcement

All six records are marked as primary sources with authority tier 1 and stable official URLs. Dates are stored only when the official publication date was confirmed; unknown dates remain null.

## Boundaries

- This corpus is for the R2 demonstration, not the conversational launch threshold.
- R2 does not synthesise substantive answers from these records.
- Retrieval currently ranks approved records by authority, primary-source status and freshness; question-level semantic relevance belongs to the next approved retrieval release.
- Counter-evidence relationships have not yet been populated.
- No source count or confidence label should imply broad market coverage.
