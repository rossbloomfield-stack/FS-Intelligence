# R3 — Signal Intelligence

## Current-state assessment

Before R3, the production evidence-to-answer path was:

```text
approved source item
→ approved chunks
→ R1 lexical + semantic retrieval
→ deterministic fusion, reranking and diversity selection
→ one cited synthesis call
```

R2 provided 424 registered sources, 60 source items and 217 bounded chunks at the R3 inspection point. R1 retrieved approved chunks with source-level authority and diagnostics. Five manually seeded `intelligence_signals` rows existed, each linked directly to one source item, but there was no observation model, source-item version record, extraction lifecycle, entity confidence, independent-source logic, signal revision history, contradiction model or signal retrieval path. Signal significance was therefore rediscovered from documents at question time.

R3 extends these foundations. It does not replace R1 retrieval, R2 ingestion, chat, authentication or the Irish Life visual system.

## Architecture implemented

```text
External source
→ R2 source item and bounded evidence chunks
→ immutable source-item version identity
→ deterministic signal eligibility
→ strict structured observation extraction
→ exact evidence anchoring
→ pragmatic canonical entity resolution
→ observation validation and review threshold
→ duplicate / existing-signal matching
→ canonical longitudinal market signal
→ explainable confidence, novelty, magnitude, relevance and momentum
→ R3 signal retrieval + R1 evidence retrieval
→ signal/evidence alignment
→ cited conversational intelligence
```

The observation extractor is deliberately factual. It records what the source says and cannot store strategic interpretation as evidence. Every accepted observation keeps the document, document version, source, chunk when still present, exact passage, offsets, page/section snapshot, model, prompt version, schema version, extraction timestamp and confidence.

## Data model

R3 evolves the existing `intelligence_signals` table rather than creating a competing signal store.

New tables:

- `source_item_versions`: stable document-version identity and change classification.
- `intelligence_entities` and `intelligence_entity_aliases`: pragmatic cross-domain entity resolution linked to existing organisations.
- `signal_taxonomy`: configurable observation/event/theme/capability vocabulary.
- `strategic_theme_configuration`: configurable strategic-priority weights and scope.
- `intelligence_entity_groups` and members: configurable competitor, benchmark, vendor and regulator groupings.
- `signal_processing_runs`: idempotent stage, model, token, cost and outcome telemetry.
- `intelligence_observations`: evidence-anchored factual observations.
- `intelligence_observation_entities`: secondary entity associations and resolution confidence.
- `intelligence_signal_observations`: supporting, corroborating, contextual and contradictory links.
- `intelligence_signal_revisions`: immutable before-change snapshots.
- `intelligence_signal_contradictions`: weighted contradiction records with resolution state.
- `intelligence_signal_feedback` and `intelligence_signal_review_events`: user/analyst quality feedback and audit.
- `signal_evaluation_cases` and `signal_evaluation_results`: benchmark and human-review persistence.

`intelligence_signals` gains entity/theme/capability/product/geography arrays, temporal bounds, confidence components, independent-source counts, novelty, strategic-relevance components, momentum, overall attention score, lifecycle, expiry, importance and extraction-version fields. Existing pilot rows are retained and backfilled into the new shape.

All additions use RLS and explicit grants. Normal authenticated users can read active configuration, accepted observations and approved signal lineage. Processing, revisions, entity groups and evaluation data are administrator-only. Service-role writes remain server-side. The signal-search RPC is `SECURITY INVOKER`; public and anonymous execution is revoked.

## Extraction and validation

Approved R2 evidence can enter R3 in two ways:

1. approving a source item queues a Workflow DevKit signal-processing run;
2. an administrator starts a bounded backfill of at most five approved items.

Each authenticated invocation of the existing discovery cron advances at most three approved historical items, including a manual Vercel run outside the discovery window. Signal backfill errors are isolated so R3 cannot prevent R2 discovery or embedding work from completing. Idempotent run keys prevent the same document version from being reprocessed.

Processing is idempotent by source item, content hash and prompt version. Unchanged evidence cannot create a second run or duplicate observation. A deterministic eligibility score uses document class, material language, authority, content length and material-change classification before an extraction call is allowed.

The current structured extraction contract limits a document to twelve observations. Exact evidence text must occur in exactly one supplied passage and supplied offsets must match. Missing or ambiguous anchors are rejected. Low materiality is rejected; uncertain entity or extraction confidence enters `needs_review`. Source text is passed as untrusted JSON under a system instruction that explicitly rejects prompt injection, hidden instructions and strategic inference.

## Entity and duplicate handling

The initial entity layer seeds every existing organisation and alias. Exact aliases receive the strongest match. Partial/token matches remain below the automatic threshold unless unambiguous. Closely ranked candidates are marked ambiguous and are never silently merged.

Observation-to-signal matching combines canonical entity, observation/event type, theme, product, date proximity and text overlap. It does not merge on theme alone. Source independence is based on a normalised source-family identity, not URL count, so copies of one announcement do not inflate confidence.

## Explainable scoring

Signal confidence is deterministic and records these components:

- evidence directness;
- source authority inherited from R2;
- independent corroboration;
- extraction certainty;
- entity certainty;
- temporal consistency;
- contradiction penalty.

User labels are Very high (85–100), High (70–84), Moderate (50–69), Low (30–49) and Very low (<30). The existing database confidence enum is populated conservatively for compatibility.

Strategic relevance separately combines competitive proximity, theme, customer, commercial, technology, regulatory and time-horizon dimensions. Novelty is relative to existing linked activity. Magnitude may be unknown/minimal/low/moderate/high/transformational and is never invented from missing evidence. Momentum is derived from recent observation frequency, independent sources and participating entities. The overall 0–100 Signal Score is a configurable weighted attention metric, not a forecast probability.

## Signal lifecycle and change

Signals move through emerging, active, confirmed, mature, contradicted, superseded, expired or dismissed states. New corroboration updates the same signal, snapshots its previous state and recalculates scores. Opposite directional evidence is retained as contradiction rather than deleting history. Source/event dates remain distinct from ingestion and extraction dates.

## Conversational integration

R1 remains the evidence engine. R3 adds an authenticated signal-search RPC and retrieves signals after the R1 evidence set is selected. Only signals with at least one accepted observation aligned to a source in the current evidence package reach synthesis. This prevents a structured signal from becoming an uncited shortcut.

The answer contract now asks the model to reason through:

```text
Evidence → Signal → Pattern → Interpretation → Implication
```

It explicitly challenges unsupported user premises and surfaces contradictions and gaps. Signals never replace citations. The conversation record retains signal IDs used for internal diagnostics.

## Product and administration

- `/intelligence/signals` now renders accepted live signals with evidence footprint, confidence, movement, score and filters.
- `/intelligence/signals/[id]` shows score components, supporting/contradictory observations, exact source passages and source links.
- the empty conversation state can show the highest-ranked current signals without redesigning chat;
- `/intelligence/admin/signals` shows processing, quality, confidence and backlog diagnostics and starts a bounded backfill;
- `/intelligence/admin/signals/[id]` provides an audit-friendly signal review surface;
- authenticated admin APIs support importance, dismissal/restoration, entity correction, observation rejection/detachment, merge and targeted reprocessing.

## Configuration

Environment controls:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `R3_OBSERVATION_EXTRACTION` | `true` | observation extraction rollout |
| `R3_SIGNAL_GENERATION` | `true` | signal matching/creation rollout |
| `R3_CONTRADICTION_DETECTION` | `true` | contradiction association |
| `R3_SIGNAL_RETRIEVAL` | `true` | conversational signal retrieval |
| `R3_INTELLIGENCE_FEED` | `true` | noteworthy-signal experience |
| `R3_SIGNAL_DETAIL` | `true` | signal list and evidence-detail experience |
| `R3_SIGNAL_REVIEW` | `true` | authenticated administrator review experience |
| `R3_EXTRACTION_MODEL` | existing research model or `gpt-5.4-mini` | configurable extraction model |
| `R3_ELIGIBILITY_THRESHOLD` | `0.5` | pre-model evidence threshold |
| `R3_MATERIALITY_THRESHOLD` | `0.55` | accepted-observation threshold |
| `R3_ENTITY_MATCH_THRESHOLD` | `0.82` | automatic entity threshold |
| `R3_SIGNAL_MATCH_THRESHOLD` | `0.78` | existing-signal match threshold |
| `R3_MAX_EVIDENCE_LENGTH` | `24000` | bounded extraction input |
| `R3_MAX_OBSERVATIONS_PER_DOCUMENT` | `12` | extraction output ceiling |
| `R3_SIGNAL_RETRIEVAL_COUNT` | `12` | conversational candidate ceiling |

## Evaluation plan and current automated coverage

The checked-in benchmark contains 60 evidence cases across annual/interim reporting, launches, prices, careers, appointments, technology partnerships, proposed/final regulation, app releases, market research, duplicates, contradictions, trivial changes and prompt injection. Expected observation type, theme, materiality and signal-worthiness are recorded for manual or model evaluation.

Deterministic tests cover eligibility, trivial suppression, material change, exact anchoring, injection resistance, entity resolution, duplicate matching, source independence, contradiction direction, confidence calibration, lifecycle, benchmark coverage and database security/provenance contracts. Production model extraction quality must be measured from reviewed benchmark results rather than invented before a controlled run.

Target evaluation metrics:

- observation precision and recall;
- direct evidence-grounding accuracy;
- canonical-entity accuracy;
- event/theme classification accuracy;
- duplicate suppression and signal grouping;
- confidence calibration;
- materiality precision;
- extraction latency and cost.

## Cost and performance model

Eligibility, anchoring, entity resolution, matching and scoring are deterministic. One lower-cost structured extraction call is used only for eligible changed evidence. Normal user questions keep R1’s one synthesis call; signal retrieval is relational/FTS and adds no model call. Processing is asynchronous through Workflow DevKit, bounded, resumable and independently observable. Unchanged content and prompt-version matches are not reprocessed.

Token and estimated-cost fields are persisted per run. A monetary estimate remains null until pricing is configured rather than embedding a price that may become obsolete.

## Deliberate R3 limitations

- This is pragmatic entity resolution, not a graph or GraphRAG system (R4).
- Signal matching is deterministic similarity, not autonomous investigation (R5).
- No predictive probabilities, learned preferences or self-improving scoring are introduced (R6).
- Newly extracted signals start conservatively; multi-source confidence grows only as independently sourced observations are processed.
- The first controlled backfill is intentionally small. Corpus-wide extraction must proceed by reviewed source/document batches.
- Automated evaluation fixtures are present, but production precision/recall and average cost require a labelled controlled run and human review.

## Operational rollout

1. Apply the additive migration and run Supabase security/performance advisors.
2. Deploy code with R3 flags enabled for authenticated production users.
3. Process a small Tier-1 official evidence batch from `/intelligence/admin/signals`.
4. Review observation precision, anchors, entity uncertainty, grouping and costs.
5. Continue in bounded source-category batches: competitor evidence, annual/interim reports, regulation, official propositions, technology, talent, reputable market research.
6. Stop or tune thresholds if precision, grounding or entity accuracy falls below the agreed quality gate.
