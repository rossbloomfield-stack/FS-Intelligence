import {
  makeEvidencePackage,
  validateEvidence,
  type EvidenceCoverage,
  type EvidencePackage,
  type EvidencePassage,
  type EvidenceReference,
} from "@/lib/intelligence/evidence";
import { assessFreshness, type FreshnessAssessment } from "@/lib/intelligence/freshness";
import {
  buildRetrievalSearchQuery,
  type RetrievalSubquery,
} from "@/lib/intelligence/query-decomposition";
import {
  defaultRetrievalConfig,
  type RetrievalConfig,
} from "@/lib/intelligence/retrieval-config";
import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";

export { buildRetrievalSearchQuery } from "@/lib/intelligence/query-decomposition";

export type IntelligenceSourceRow = {
  id: string;
  title: string | null;
  publisher: string | null;
  url: string | null;
  publication_date: string | null;
  source_type: string | null;
  primary_source: boolean | null;
  credibility_tier: number | null;
  evidence_classification: string | null;
  notes: string | null;
  canonical_domain?: string | null;
  source_class?: string | null;
  categorisation?: string | null;
  geography?: string | null;
  source_weight?: number | null;
  organisation_names?: string[];
  passages?: EvidencePassage[];
};

export type ApprovedSourceChunkRow = {
  chunk_id?: number;
  source_item_id: string;
  evidence_source_id: string;
  title: string;
  publisher: string;
  url: string;
  publication_date: string | null;
  source_type: string;
  primary_source: boolean;
  credibility_tier: number;
  evidence_classification: string | null;
  canonical_domain?: string | null;
  source_class?: string | null;
  categorisation?: string | null;
  geography?: string | null;
  source_weight?: number | null;
  chunk_content: string;
  section_label: string | null;
  page_number: number | null;
  content_hash?: string | null;
  organisation_names?: string[] | null;
  relevance?: number | null;
};

export type RetrievalChannel = "lexical" | "semantic";
export type RetrievalCandidateList = {
  channel: RetrievalChannel;
  subquery: RetrievalSubquery;
  rows: ApprovedSourceChunkRow[];
};
export type DomainAvailability = Record<string, number>;
export type RetrievalScoreBreakdown = {
  fusion: number;
  directness: number;
  entity: number;
  theme: number;
  temporal: number;
  authority: number;
  geography: number;
  total: number;
};
export type RetrievalMetrics = {
  semanticCandidateCount: number;
  lexicalCandidateCount: number;
  mergedCandidateCount: number;
  duplicatesRemoved: number;
  rerankedCandidateCount: number;
  selectedEvidenceCount: number;
  uniqueDocumentCount: number;
  uniqueDomainCount: number;
  maxDocumentConcentration: number;
  medianEvidenceAgeDays: number | null;
  coverage: EvidenceCoverage;
};
export type RetrievalDiagnosticCandidate = {
  chunkId: number | null;
  sourceId: string;
  sourceItemId: string;
  domain: string;
  title: string;
  score: number;
  breakdown: RetrievalScoreBreakdown;
  lexicalRank: number | null;
  semanticRank: number | null;
  queryIds: string[];
};
export type RetrievalResult = {
  references: EvidenceReference[];
  evidence: EvidencePackage;
  freshnessAssessment: FreshnessAssessment;
  domainAvailability: DomainAvailability;
  gaps: string[];
  metrics: RetrievalMetrics;
  diagnostics: RetrievalDiagnosticCandidate[];
};

type FusedCandidate = {
  row: ApprovedSourceChunkRow;
  rrfScore: number;
  lexicalRelevance: number;
  semanticRelevance: number;
  lexicalRank: number | null;
  semanticRank: number | null;
  queryIds: Set<string>;
  score: number;
  breakdown: RetrievalScoreBreakdown;
};

const stopWords = new Set([
  "about", "after", "an", "are", "as", "at", "be", "before", "by",
  "could", "does", "doing", "for", "from", "have", "how", "in", "into",
  "is", "it", "of", "on", "or", "the", "this", "to", "irish", "most",
  "should", "that", "their", "what", "which", "with", "would", "your",
]);

export function mergeApprovedEvidenceRows(
  documentRows: IntelligenceSourceRow[],
  chunkRows: ApprovedSourceChunkRow[],
): IntelligenceSourceRow[] {
  const rows = new Map(
    documentRows.map((row) => [
      row.id,
      {
        ...row,
        organisation_names: row.organisation_names ?? [],
        passages: row.passages ?? [],
      } as IntelligenceSourceRow,
    ]),
  );
  chunkRows.forEach((chunk, index) => {
    const location = [
      chunk.section_label,
      chunk.page_number ? `page ${chunk.page_number}` : null,
    ].filter(Boolean).join(", ");
    const note = location ? `${chunk.chunk_content} (${location})` : chunk.chunk_content;
    const existing = rows.get(chunk.evidence_source_id);
    const passage: EvidencePassage = {
      id: chunk.chunk_id ? `chunk-${chunk.chunk_id}` : `${chunk.source_item_id}:${index}`,
      chunkId: chunk.chunk_id ?? null,
      content: chunk.chunk_content,
      sectionLabel: chunk.section_label,
      pageNumber: chunk.page_number,
      relevance: Number(chunk.relevance ?? 0),
    };
    rows.set(
      chunk.evidence_source_id,
      existing
        ? {
            ...existing,
            notes: [existing.notes, note].filter(Boolean).join(" "),
            organisation_names: [
              ...new Set([
                ...(existing.organisation_names ?? []),
                ...(chunk.organisation_names ?? []),
              ]),
            ],
            passages: [...(existing.passages ?? []), passage],
          }
        : {
            id: chunk.evidence_source_id,
            title: chunk.title,
            publisher: chunk.publisher,
            url: chunk.url,
            publication_date: chunk.publication_date,
            source_type: chunk.source_type,
            primary_source: chunk.primary_source,
            credibility_tier: chunk.credibility_tier,
            evidence_classification: chunk.evidence_classification,
            notes: note,
            canonical_domain: chunk.canonical_domain,
            source_class: chunk.source_class,
            categorisation: chunk.categorisation,
            geography: chunk.geography,
            source_weight: chunk.source_weight,
            organisation_names: chunk.organisation_names ?? [],
            passages: [passage],
          },
    );
  });
  return [...rows.values()];
}

/**
 * Compatibility path for fixture and legacy tests. Production uses the passage-level
 * hybrid path below, but this keeps document-only evidence deterministic and safe.
 */
export function retrieveFinancialIntelligence(
  question: string,
  plan: IntelligenceQueryPlan,
  rows: IntelligenceSourceRow[],
  now = new Date(),
  domainAvailability: DomainAvailability = {},
): RetrievalResult {
  const lists: RetrievalCandidateList[] = [
    {
      channel: "lexical",
      subquery: {
        id: "legacy",
        query: buildRetrievalSearchQuery(question, plan),
        purpose: "Legacy document compatibility",
      },
      rows: rows.flatMap((row, index) => {
        const rowText = [row.title, row.publisher, row.notes, ...(row.organisation_names ?? [])]
          .filter(Boolean).join(" ").toLocaleLowerCase("en-IE");
        const organisationMatch = plan.organisations.some((organisation) =>
          rowText.includes(organisation.name.toLocaleLowerCase("en-IE")),
        );
        const termMatches = tokenise(question).filter((term) => rowText.includes(term)).length;
        if (plan.organisations.length ? !organisationMatch : termMatches === 0) return [];
        return (row.passages?.length
          ? row.passages
          : [{
              id: `${row.id}:summary`,
              chunkId: null,
              content: row.notes ?? "",
              sectionLabel: null,
              pageNumber: null,
              relevance: 0,
            }]
        ).map((passage, passageIndex) => ({
          chunk_id: passage.chunkId ?? (index + 1) * 1000 + passageIndex,
          source_item_id: passage.id,
          evidence_source_id: row.id,
          title: row.title ?? "Untitled source",
          publisher: row.publisher ?? "Publisher not recorded",
          url: row.url ?? "",
          publication_date: row.publication_date,
          source_type: row.source_type ?? "Source",
          primary_source: Boolean(row.primary_source),
          credibility_tier: row.credibility_tier ?? 99,
          evidence_classification: row.evidence_classification,
          canonical_domain: row.canonical_domain,
          source_class: row.source_class,
          categorisation: row.categorisation,
          geography: row.geography,
          source_weight: row.source_weight,
          chunk_content: passage.content,
          section_label: passage.sectionLabel,
          page_number: passage.pageNumber,
          content_hash: normaliseText(passage.content),
          organisation_names: row.organisation_names ?? [],
          relevance: passage.relevance || termMatches / Math.max(1, tokenise(question).length),
        }));
      }),
    },
  ];
  return retrieveHybridFinancialIntelligence({
    question,
    plan,
    candidateLists: lists,
    now,
    domainAvailability,
    config: defaultRetrievalConfig,
  });
}

export function retrieveHybridFinancialIntelligence({
  question,
  plan,
  candidateLists,
  now = new Date(),
  domainAvailability = {},
  config = defaultRetrievalConfig,
}: {
  question: string;
  plan: IntelligenceQueryPlan;
  candidateLists: RetrievalCandidateList[];
  now?: Date;
  domainAvailability?: DomainAvailability;
  config?: RetrievalConfig;
}): RetrievalResult {
  const semanticCandidateCount = candidateLists
    .filter((list) => list.channel === "semantic")
    .reduce((total, list) => total + list.rows.length, 0);
  const lexicalCandidateCount = candidateLists
    .filter((list) => list.channel === "lexical")
    .reduce((total, list) => total + list.rows.length, 0);
  const fused = fuseCandidates(candidateLists, config);
  const deduplicated = deduplicateCandidates(fused);
  const reranked = deduplicated
    .filter((candidate) => isTemporallyEligible(candidate.row, plan, now))
    .map((candidate) => rerankCandidate(candidate, question, plan, now, config))
    .filter((candidate) => candidate.score >= config.minimumRelevance)
    .sort(compareCandidates)
    .slice(0, config.rerankCandidateCount);
  const selected = selectDiverseEvidence(reranked, plan, config);
  const references = validateEvidence(toReferences(selected, config));
  const coverage = assessCoverage(selected, references, plan, now);
  const evidence = makeEvidencePackage(references, now.toISOString(), coverage);
  const freshnessAssessment = assessFreshness(
    plan,
    references.map((item) => item.publicationDate),
    now,
  );
  const gaps = buildGaps(
    references,
    plan,
    domainAvailability,
    freshnessAssessment,
    coverage,
  );
  const documentCounts = counts(selected.map((candidate) => candidate.row.evidence_source_id));
  const ages = selected
    .map((candidate) => ageDays(candidate.row.publication_date, now))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const metrics: RetrievalMetrics = {
    semanticCandidateCount,
    lexicalCandidateCount,
    mergedCandidateCount: fused.length,
    duplicatesRemoved: fused.length - deduplicated.length,
    rerankedCandidateCount: reranked.length,
    selectedEvidenceCount: selected.length,
    uniqueDocumentCount: new Set(
      selected.map((candidate) => candidate.row.evidence_source_id),
    ).size,
    uniqueDomainCount: new Set(selected.map((candidate) => domain(candidate.row))).size,
    maxDocumentConcentration: selected.length
      ? Math.max(...documentCounts.values()) / selected.length
      : 0,
    medianEvidenceAgeDays: ages.length ? ages[Math.floor((ages.length - 1) / 2)] : null,
    coverage,
  };
  return {
    references,
    evidence,
    freshnessAssessment,
    domainAvailability,
    gaps,
    metrics,
    diagnostics: reranked.map((candidate) => ({
      chunkId: candidate.row.chunk_id ?? null,
      sourceId: candidate.row.evidence_source_id,
      sourceItemId: candidate.row.source_item_id,
      domain: domain(candidate.row),
      title: candidate.row.title,
      score: round(candidate.score),
      breakdown: candidate.breakdown,
      lexicalRank: candidate.lexicalRank,
      semanticRank: candidate.semanticRank,
      queryIds: [...candidate.queryIds],
    })),
  };
}

export function fuseCandidates(
  lists: RetrievalCandidateList[],
  config: RetrievalConfig = defaultRetrievalConfig,
) {
  const fused = new Map<string, FusedCandidate>();
  for (const list of lists) {
    list.rows.forEach((row, index) => {
      const key = candidateKey(row);
      const rank = index + 1;
      const weight = list.channel === "semantic" ? 1.05 : 1;
      const reciprocalRank = weight / (config.reciprocalRankConstant + rank);
      const existing = fused.get(key);
      if (existing) {
        existing.rrfScore += reciprocalRank;
        existing.queryIds.add(list.subquery.id);
        if (list.channel === "lexical") {
          existing.lexicalRelevance = Math.max(existing.lexicalRelevance, Number(row.relevance ?? 0));
          existing.lexicalRank = Math.min(existing.lexicalRank ?? rank, rank);
        } else {
          existing.semanticRelevance = Math.max(existing.semanticRelevance, Number(row.relevance ?? 0));
          existing.semanticRank = Math.min(existing.semanticRank ?? rank, rank);
        }
        return;
      }
      fused.set(key, {
        row,
        rrfScore: reciprocalRank,
        lexicalRelevance: list.channel === "lexical" ? Number(row.relevance ?? 0) : 0,
        semanticRelevance: list.channel === "semantic" ? Number(row.relevance ?? 0) : 0,
        lexicalRank: list.channel === "lexical" ? rank : null,
        semanticRank: list.channel === "semantic" ? rank : null,
        queryIds: new Set([list.subquery.id]),
        score: 0,
        breakdown: emptyBreakdown(),
      });
    });
  }
  return [...fused.values()];
}

export function deduplicateCandidates(candidates: FusedCandidate[]) {
  const sorted = [...candidates].sort(
    (a, b) => authorityScore(b.row) - authorityScore(a.row) || b.rrfScore - a.rrfScore,
  );
  const selected: FusedCandidate[] = [];
  const exact = new Set<string>();
  for (const candidate of sorted) {
    const fingerprint =
      candidate.row.content_hash?.trim() ||
      `${normaliseUrl(candidate.row.url)}:${normaliseText(candidate.row.chunk_content)}`;
    if (exact.has(fingerprint)) continue;
    const duplicate = selected.some(
      (existing) =>
        normaliseText(existing.row.title) === normaliseText(candidate.row.title) &&
        textSimilarity(existing.row.chunk_content, candidate.row.chunk_content) >= 0.9,
    );
    if (duplicate) continue;
    exact.add(fingerprint);
    selected.push(candidate);
  }
  return selected;
}

export function selectDiverseEvidence(
  candidates: FusedCandidate[],
  plan: IntelligenceQueryPlan,
  config: RetrievalConfig = defaultRetrievalConfig,
) {
  const selected: FusedCandidate[] = [];
  const documentCounts = new Map<string, number>();
  const domainDocuments = new Map<string, Set<string>>();

  for (const organisation of plan.organisations) {
    const candidate = candidates.find(
      (item) =>
        !selected.includes(item) &&
        canAdd(item) &&
        candidateText(item.row).includes(organisation.name.toLocaleLowerCase("en-IE")),
    );
    if (candidate) add(candidate);
  }
  for (const candidate of candidates) {
    if (selected.length >= config.finalEvidenceCount) break;
    if (selected.includes(candidate)) continue;
    if (!canAdd(candidate)) continue;
    add(candidate);
  }
  return selected;

  function canAdd(candidate: FusedCandidate) {
    const sourceId = candidate.row.evidence_source_id;
    if ((documentCounts.get(sourceId) ?? 0) >= config.maximumChunksPerDocument) return false;
    const documents = domainDocuments.get(domain(candidate.row)) ?? new Set<string>();
    return (
      documents.has(sourceId) ||
      documents.size < config.maximumDocumentsPerDomain ||
      candidate.row.primary_source
    );
  }

  function add(candidate: FusedCandidate) {
    const sourceId = candidate.row.evidence_source_id;
    const candidateDomain = domain(candidate.row);
    selected.push(candidate);
    documentCounts.set(sourceId, (documentCounts.get(sourceId) ?? 0) + 1);
    const documents = domainDocuments.get(candidateDomain) ?? new Set<string>();
    documents.add(sourceId);
    domainDocuments.set(candidateDomain, documents);
  }
}

export function assessCoverage(
  selected: FusedCandidate[],
  references: EvidenceReference[],
  plan: IntelligenceQueryPlan,
  now = new Date(),
): EvidenceCoverage {
  if (!selected.length || !references.length) return "insufficient";
  const documents = new Set(selected.map((item) => item.row.evidence_source_id));
  const domains = new Set(selected.map((item) => domain(item.row)));
  const primary = new Set(
    selected.filter((item) => item.row.primary_source).map((item) => item.row.evidence_source_id),
  );
  const organisationCoverage = plan.organisations.length
    ? plan.organisations.filter((organisation) =>
        selected.some((item) =>
          candidateText(item.row).includes(organisation.name.toLocaleLowerCase("en-IE")),
        ),
      ).length / plan.organisations.length
    : 1;
  const recentEnough = selected.some((item) => {
    const age = ageDays(item.row.publication_date, now);
    return age !== null && age <= (plan.timeframe.currentInformationRequired ? 45 : 730);
  });
  if (
    selected.length >= 8 &&
    documents.size >= 5 &&
    domains.size >= 3 &&
    primary.size >= 2 &&
    organisationCoverage === 1 &&
    recentEnough
  ) return "strong";
  if (
    selected.length >= 4 &&
    documents.size >= 3 &&
    domains.size >= 2 &&
    primary.size >= 1 &&
    organisationCoverage >= 0.5
  ) return "adequate";
  return "limited";
}

function rerankCandidate(
  candidate: FusedCandidate,
  question: string,
  plan: IntelligenceQueryPlan,
  now: Date,
  config: RetrievalConfig,
) {
  const terms = tokenise(question);
  const text = candidateText(candidate.row);
  const directness = terms.length
    ? terms.filter((term) => text.includes(term)).length / terms.length
    : 0;
  const entity = plan.organisations.length
    ? plan.organisations.filter((organisation) =>
        text.includes(organisation.name.toLocaleLowerCase("en-IE")),
      ).length / plan.organisations.length
    : 0.5;
  const thematicTerms = [
    ...plan.themes,
    ...plan.products,
    ...plan.regulations,
    ...plan.requestedMetrics,
    ...plan.markets,
  ].map((value) => value.replaceAll("_", " ").toLocaleLowerCase("en-IE"));
  const theme = thematicTerms.length
    ? thematicTerms.filter((term) => text.includes(term)).length / thematicTerms.length
    : 0.5;
  const temporal = temporalScore(candidate.row.publication_date, plan, now);
  const authority = authorityScore(candidate.row);
  const geography = plan.jurisdictions.length
    ? plan.jurisdictions.some((value) =>
        [candidate.row.geography, candidate.row.canonical_domain, candidate.row.publisher]
          .filter(Boolean).join(" ").toLocaleLowerCase("en-IE")
          .includes(jurisdictionTerm(value)),
      ) ? 1 : 0
    : 0.5;
  const channelAgreement =
    candidate.lexicalRank !== null && candidate.semanticRank !== null ? 1 : 0.55;
  const fusion = Math.min(1, candidate.rrfScore * 18) * 0.34 + channelAgreement * 0.06;
  const breakdown: RetrievalScoreBreakdown = {
    fusion: round(fusion),
    directness: round(directness * 0.18),
    entity: round(entity * 0.13),
    theme: round(theme * 0.08),
    temporal: round(temporal * config.recencyWeight),
    authority: round(authority * 0.12),
    geography: round(geography * 0.04),
    total: 0,
  };
  candidate.breakdown = {
    ...breakdown,
    total: round(Object.values(breakdown).reduce((total, value) => total + value, 0)),
  };
  candidate.score = candidate.breakdown.total;
  return candidate;
}

function toReferences(
  selected: FusedCandidate[],
  config: RetrievalConfig,
): EvidenceReference[] {
  const bySource = new Map<string, FusedCandidate[]>();
  for (const candidate of selected) {
    const values = bySource.get(candidate.row.evidence_source_id) ?? [];
    values.push(candidate);
    bySource.set(candidate.row.evidence_source_id, values);
  }
  return [...bySource.values()]
    .sort((a, b) => b[0].score - a[0].score)
    .map((candidates, index) => {
      const row = candidates[0].row;
      const passages = candidates.slice(0, config.maximumChunksPerDocument).map((candidate) => ({
        id: candidate.row.chunk_id
          ? `chunk-${candidate.row.chunk_id}`
          : `${candidate.row.source_item_id}:${candidate.row.content_hash ?? "passage"}`,
        chunkId: candidate.row.chunk_id ?? null,
        content: candidate.row.chunk_content,
        sectionLabel: candidate.row.section_label,
        pageNumber: candidate.row.page_number,
        relevance: candidate.score,
      }));
      const strongest = passages[0];
      const location = [
        strongest?.sectionLabel,
        strongest?.pageNumber ? `page ${strongest.pageNumber}` : null,
      ].filter(Boolean).join(", ");
      return {
        id: `ref-${index + 1}`,
        sourceId: row.evidence_source_id,
        title: row.title?.trim() || "Untitled source",
        publisher: row.publisher?.trim() || "Publisher not recorded",
        url: row.url,
        publicationDate: row.publication_date,
        sourceType: row.source_type?.trim() || "Source",
        primary: Boolean(row.primary_source),
        classification: row.evidence_classification,
        claimSupported: `${strongest.content}${location ? ` (${location})` : ""}`,
        supportStrength: "supporting" as const,
        rank: index + 1,
        passages,
      };
    });
}

function buildGaps(
  references: EvidenceReference[],
  plan: IntelligenceQueryPlan,
  domainAvailability: DomainAvailability,
  freshnessAssessment: FreshnessAssessment,
  coverage: EvidenceCoverage,
) {
  const gaps: string[] = [];
  if (!references.length) {
    gaps.push(
      plan.dailyBriefingRequested
        ? "No approved evidence was published in the current daily briefing window."
        : "No approved source directly matched the question.",
    );
  }
  const unavailable = plan.evidenceNeeds.filter(
    (item) => item in domainAvailability && domainAvailability[item] === 0,
  );
  if (unavailable.length) {
    gaps.push(`Structured evidence is not populated for: ${unavailable.join(", ")}.`);
  }
  if (coverage === "limited") {
    gaps.push("The retrieved evidence base is limited in depth or source diversity.");
  }
  if (freshnessAssessment.requiresFreshResearch) gaps.push(freshnessAssessment.reason);
  return [...new Set(gaps)];
}

function isTemporallyEligible(
  row: ApprovedSourceChunkRow,
  plan: IntelligenceQueryPlan,
  now: Date,
) {
  if (plan.dailyBriefingRequested) return isInDailyBriefingWindow(row.publication_date, now);
  if (!plan.timeframe.rollingMonths) return true;
  const age = ageDays(row.publication_date, now);
  return age !== null && age <= plan.timeframe.rollingMonths * 31;
}

function temporalScore(
  publicationDate: string | null,
  plan: IntelligenceQueryPlan,
  now: Date,
) {
  const age = ageDays(publicationDate, now);
  if (age === null) return plan.timeframe.label === "historical" ? 0.35 : 0;
  if (plan.timeframe.label === "historical") return 0.65;
  const halfLife = plan.timeframe.currentInformationRequired
    ? 45
    : plan.intent === "market_trend" ? 540 : 365;
  return Math.exp((-Math.LN2 * Math.max(0, age)) / halfLife);
}

function authorityScore(row: ApprovedSourceChunkRow) {
  const primary = row.primary_source ? 1 : 0.35;
  const credibility = Math.max(0, Math.min(1, (5 - row.credibility_tier) / 4));
  const weight = Math.max(0, Math.min(1, Number(row.source_weight ?? 0.5)));
  const sourceClass = [row.source_class, row.source_type, row.evidence_classification]
    .filter(Boolean).join(" ").toLocaleLowerCase("en-IE");
  const authorityBoost = /regulat|government|legislation/.test(sourceClass)
    ? 1
    : /company_results|investor|annual report/.test(sourceClass)
      ? 0.9
      : /company|press release/.test(sourceClass) ? 0.75 : 0.5;
  return primary * 0.35 + credibility * 0.25 + weight * 0.2 + authorityBoost * 0.2;
}

function compareCandidates(a: FusedCandidate, b: FusedCandidate) {
  return (
    b.score - a.score ||
    authorityScore(b.row) - authorityScore(a.row) ||
    dateValue(b.row.publication_date) - dateValue(a.row.publication_date) ||
    (a.row.chunk_id ?? 0) - (b.row.chunk_id ?? 0)
  );
}

function candidateKey(row: ApprovedSourceChunkRow) {
  return row.chunk_id
    ? `chunk:${row.chunk_id}`
    : `${row.source_item_id}:${row.content_hash ?? normaliseText(row.chunk_content)}`;
}

function candidateText(row: ApprovedSourceChunkRow) {
  return [
    row.title, row.publisher, row.chunk_content, row.section_label, row.source_type,
    row.evidence_classification, row.categorisation, row.geography,
    ...(row.organisation_names ?? []),
  ].filter(Boolean).join(" ").toLocaleLowerCase("en-IE");
}

function tokenise(value: string) {
  return [
    ...new Set(value.toLocaleLowerCase("en-IE").match(/[a-z0-9]{2,}/g) ?? []),
  ].filter((item) => !stopWords.has(item));
}

function textSimilarity(left: string, right: string) {
  const leftTerms = new Set(tokenise(left));
  const rightTerms = new Set(tokenise(right));
  if (!leftTerms.size || !rightTerms.size) return 0;
  const intersection = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  return intersection / new Set([...leftTerms, ...rightTerms]).size;
}

function normaliseText(value: string | null) {
  return (value ?? "").toLocaleLowerCase("en-IE").replace(/[^a-z0-9]+/g, " ").trim();
}

function normaliseUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.hostname.toLocaleLowerCase("en-IE")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value.toLocaleLowerCase("en-IE");
  }
}

function domain(row: ApprovedSourceChunkRow) {
  if (row.canonical_domain) return row.canonical_domain.toLocaleLowerCase("en-IE");
  try {
    return new URL(row.url).hostname.toLocaleLowerCase("en-IE").replace(/^www\./, "");
  } catch {
    return row.publisher.toLocaleLowerCase("en-IE");
  }
}

function jurisdictionTerm(value: string) {
  if (value === "IE") return "ireland";
  if (value === "UK") return "united kingdom";
  if (value === "EU") return "europe";
  return value.toLocaleLowerCase("en-IE");
}

function counts(values: string[]) {
  const result = new Map<string, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}

function ageDays(value: string | null, now: Date) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed)
    ? Math.max(0, (now.getTime() - parsed) / 86_400_000)
    : null;
}

function dateValue(value: string | null) {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isInDailyBriefingWindow(value: string | null, now: Date) {
  if (!value) return false;
  const parsed = Date.parse(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed)) return false;
  const ageHours = (now.getTime() - parsed) / 3_600_000;
  return ageHours >= -24 && ageHours <= 72;
}

function emptyBreakdown(): RetrievalScoreBreakdown {
  return {
    fusion: 0, directness: 0, entity: 0, theme: 0,
    temporal: 0, authority: 0, geography: 0, total: 0,
  };
}

function round(value: number) {
  return Math.round(value * 100_000) / 100_000;
}
