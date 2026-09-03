# R5.1 production corpus activation

Activated in the production Supabase project on 31 August 2026.

## Approved inventory

| Domain | Approved records | Coverage |
|---|---:|---|
| Sources | 11 | Six existing regulatory/company references plus five newly reviewed company/product references |
| Company strategy profiles | 2 | AIB and Bank of Ireland |
| Financial metrics | 15 | FY2025 AIB and Bank of Ireland reported measures |
| Digital and AI capabilities | 8 | Four source-linked records for each bank |
| Products | 3 | Irish Life, Zurich Life and AIB Life mortgage protection |

All newly introduced rows were created with public/domain approval disabled. They were approved only after source accessibility, primary-source status, canonical organisation, date, unit, duplicate and claim-support checks.

## Source set

- AIB Group plc — FY2025 annual financial results announcement.
- Bank of Ireland Group plc — FY2025 annual report.
- Irish Life — current mortgage-protection product page.
- Zurich Ireland — current mortgage-protection product page.
- AIB — current protection-insurance product page supporting the AIB Life distribution route.

Product prices retain their source context. Irish Life's displayed minimum is explicitly labelled August 2023 in the record; Zurich's displayed starting price is explicitly dated 1 January 2026. The AIB Life record does not invent a price where none was verified.

## Runtime change

Product terms are normalised to canonical categories. A generic question such as `Compare mortgage protection products` now retrieves approved `mortgage_protection` rows even when the user does not name providers. Company-specific questions continue to restrict structured retrieval to resolved canonical organisations.

## Boundaries

- This is an activation batch, not conversational launch readiness.
- Narrative synthesis remains disabled; the product returns approved evidence and deterministic structured cards.
- No capability maturity score is stored where the company has not published a defensible measure.
- Counter-evidence, product-page screenshots, broader product categories and wider company coverage remain outstanding.
- The next corpus milestone is 5,000 quality-assured references; 15,000 remains the preferred launch target.
