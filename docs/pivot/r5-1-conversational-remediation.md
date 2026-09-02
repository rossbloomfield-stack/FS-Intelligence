# R5.1 — Conversational experience remediation

## Outcome

R5.1 changes Market Intelligence from a structured-record listing into an evidence-led conversational experience. The primary screen now gives the question, answer and composer visual priority. Supporting evidence is available when it is useful rather than occupying a permanent empty column.

## Problems confirmed

- The API retrieved relevant database records but did not synthesise them into an analyst answer.
- Broad executive questions such as “What matters most this week?” were not reliably classified as market-overview queries.
- Follow-up questions were planned from the latest message only, so pronouns and earlier company context were easily lost.
- Retrieved records were the primary answer surface, producing functional listings rather than conclusions and implications.
- The permanent history and evidence columns made the page dense, while neither helped a new user formulate their first question.
- Mobile inherited too much of the desktop information architecture.

## Product principles used

The redesign applies patterns common to current research assistants and mobile conversational products:

1. One obvious primary action: ask a question.
2. A concise empty state with a small, curated set of high-value starters.
3. Answers that lead with a conclusion and distinguish evidence from interpretation.
4. Inline citations with progressive disclosure of full source metadata.
5. A single-column mobile reading experience, a reachable composer and a sheet for evidence.
6. Honest uncertainty when the retrieved evidence cannot support a conclusion.

Reference material reviewed:

- [AI Elements](https://elements.ai-sdk.dev/)
- [AI Elements prompt input](https://elements.ai-sdk.dev/components/prompt-input)
- [Perplexity product overview](https://www.perplexity.ai/hub)
- [How Perplexity works](https://www.perplexity.ai/help-center/en/articles/10352895-how-does-perplexity-work)
- [ChatGPT mobile app guidance](https://help.openai.com/en/articles/20001274/)
- [Gemini mobile assistant direction](https://blog.google/products-and-platforms/products/gemini/google-assistant-gemini-mobile/)

## Implementation

### Evidence-led analysis

- Added a dedicated server-side answer agent after deterministic query planning and retrieval.
- The model receives a compact evidence package rather than unrestricted application or web content.
- The structured response contains a headline, executive summary, evidence-backed findings, strategic interpretation, Irish-market implication, counter-evidence or limitations, watch items, confidence and suggested follow-ups.
- Citation identifiers are validated against retrieved references before rendering.
- Unsupported findings and invented citation identifiers are removed.
- When synthesis fails, the application returns an explicit evidence-limited fallback rather than presenting source notes as a complete answer.

### Context and retrieval

- Query planning includes the two previous user questions when processing a follow-up.
- Entity resolution uses the contextual query, so comparisons can be continued without restating every organisation.
- Executive-summary language now maps to the market-overview intent.
- Recent evidence coverage was widened before relevance ranking.

### Interface

- Replaced the persistent three-column workspace with a focused conversation surface.
- Put the composer above suggested questions in the empty state.
- Reduced starters to six curated executive prompts with clear topic labels.
- Changed mobile starters into a horizontally discoverable snap list.
- Added a structured executive answer component with clickable inline citations.
- Moved underlying structured records behind a disclosure.
- Made evidence an on-demand bottom sheet on mobile and right-side drawer on desktop.
- Added keyboard dismissal, focus containment, focus restoration and background scroll locking to the evidence surface.
- Added live-region and busy-state semantics for streaming answers.

## Security and trust

- Source content is explicitly treated as untrusted data in the synthesis instruction.
- Source material cannot provide model or tool instructions.
- Generated source IDs are accepted only when they match retrieved records.
- Model output is rendered as React text rather than unsanitised HTML.
- API keys remain server-side and are not logged or returned to the client.

## Verification

- Lint, TypeScript, unit tests and production build are release gates.
- Added tests for executive-query classification, citation validation, insufficient-evidence behaviour, focused UI structure, contextual synthesis and evidence-sheet state.
- Verified the empty state and answer state at desktop and 390 × 844 mobile dimensions.
- Verified no mobile horizontal overflow.
- Automated accessibility scan reported no violations; the one incomplete colour-contrast item was manually reviewed and the affected label was darkened.
- Verified the evidence sheet locks background scrolling and exposes its controls as a dialog.

## Current limitations and next actions

- R5.1 synthesises the persistent knowledge base only. Current-web escalation and verified fresh-research status remain future work.
- Evidence records do not yet carry a dedicated contradictory-evidence classification, so the answer can describe limitations but the Counter-evidence tab is populated only when retrieval supplies those records.
- Conversations continue to persist in the data layer, but history/search is withheld from the primary UI until it is useful and fully functional.
- Answer quality remains bounded by corpus coverage. Knowledge-gap analytics and corpus expansion should continue to prioritise weak or unanswered executive questions.
- An authenticated production question should be used as the final operational smoke test after deployment.
