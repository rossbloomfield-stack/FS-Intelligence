import type {
  EvidencePackage,
  EvidenceReference,
  IntelligenceAnalysis,
} from "@/lib/intelligence/evidence";
import type { FreshnessAssessment } from "@/lib/intelligence/freshness";
import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";
import type { StructuredKnowledge } from "@/lib/intelligence/structured-answer";

export type ModelAnalysis = {
  headline: string;
  executiveSummary: string;
  evidenceFindings: Array<{
    title: string;
    analysis: string;
    referenceIds: string[];
  }>;
  strategicInterpretation: string | null;
  irishMarketImplication: string | null;
  counterEvidence: string[];
  whatToWatch: string[];
  confidenceReason: string;
  followUpQuestions: string[];
};

export type FallbackAnalysisContext = {
  question?: string;
  plan?: IntelligenceQueryPlan;
  knowledge?: StructuredKnowledge;
  freshnessAssessment?: FreshnessAssessment;
  gaps?: string[];
};

export function normaliseAnalysis(
  value: ModelAnalysis,
  evidence: EvidencePackage,
): IntelligenceAnalysis {
  const allowedIds = new Set(evidence.references.map((reference) => reference.id));
  const evidenceFindings = value.evidenceFindings
    .map((finding) => ({
      ...finding,
      referenceIds: [
        ...new Set(finding.referenceIds.filter((id) => allowedIds.has(id))),
      ],
    }))
    .filter((finding) => finding.referenceIds.length > 0);
  return {
    ...value,
    evidenceFindings,
    confidence: evidence.confidence,
    generatedBy: "model",
  };
}

export function fallbackAnalysis(
  evidence: EvidencePackage,
  context: FallbackAnalysisContext = {},
): IntelligenceAnalysis {
  if (!evidence.references.length) return insufficientAnalysis(evidence, context.gaps);
  if (
    context.plan?.intent === "company_strategy" &&
    context.plan.organisations.length === 1
  ) {
    return companyStrategyFallback(evidence, context);
  }
  return {
    headline: "Verified evidence was found, but contextual synthesis is temporarily unavailable.",
    executiveSummary:
      "The supporting material is available for inspection. I have not converted source notes into a strategic conclusion because the analysis service did not complete reliably.",
    evidenceFindings: evidence.references.slice(0, 4).map((reference) => ({
      title: reference.title,
      analysis: reference.claimSupported,
      referenceIds: [reference.id],
    })),
    strategicInterpretation: null,
    irishMarketImplication: null,
    counterEvidence: uniqueLimit([
      "No model-generated interpretation has been presented.",
      ...(context.gaps ?? []),
    ], 4),
    whatToWatch: [],
    confidence: evidence.confidence,
    confidenceReason:
      "Confidence describes the retrieved evidence footprint, not a completed strategic interpretation.",
    followUpQuestions: [
      "Show me the strongest primary evidence.",
      "Which evidence is most recent?",
    ],
    generatedBy: "fallback",
  };
}

function companyStrategyFallback(
  evidence: EvidencePackage,
  context: FallbackAnalysisContext,
): IntelligenceAnalysis {
  const organisation = context.plan!.organisations[0];
  const profile = context.knowledge?.strategyProfiles.find(
    (item) => item.organisation_id === organisation.id,
  );
  const allowedIds = new Set(evidence.references.map((reference) => reference.id));
  const profileReferenceIds = (profile?.sourceClaims ?? [])
    .filter(
      (source) =>
        source.supportStrength === "direct" &&
        source.referenceId !== null &&
        allowedIds.has(source.referenceId),
    )
    .map((source) => source.referenceId as string);
  const declared = facetReferences(evidence.references, "declared_strategy");
  const execution = facetReferences(evidence.references, "recent_execution");
  const independent = facetReferences(evidence.references, "independent_context");
  const softSignals = facetReferences(evidence.references, "soft_signal");
  const findings: IntelligenceAnalysis["evidenceFindings"] = [];

  if (profile && profileReferenceIds.length) {
    const priorities = profile.strategic_priorities.slice(0, 5);
    findings.push({
      title: "Declared strategy",
      analysis: [
        profile.strategy_summary,
        priorities.length
          ? `Recorded strategic priorities: ${priorities.join("; ")}.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      referenceIds: profileReferenceIds,
    });
  } else if (declared.length) {
    findings.push(referenceFinding("Declared strategy evidence", declared));
  }
  if (execution.length) {
    findings.push(referenceFinding("Recent execution", execution));
  }
  if (independent.length) {
    findings.push(referenceFinding("Independent context", independent));
  }
  if (softSignals.length) {
    const finding = referenceFinding("Directional soft signals", softSignals);
    findings.push({
      ...finding,
      analysis: `Directional evidence, not proof of strategy delivery: ${finding.analysis}`,
    });
  }

  const missingEvidence = [
    !declared.length && !profileReferenceIds.length
      ? "No approved declared-strategy or annual-report evidence was available in this answer."
      : null,
    !execution.length
      ? "No approved recent-execution evidence was available in this answer."
      : null,
    !independent.length
      ? "No approved independent news or market context was available in this answer."
      : null,
    !softSignals.length
      ? "No approved hiring or other soft-signal evidence was available; no directional inference has been made from hiring."
      : null,
    ...(context.gaps ?? []),
  ].filter((item): item is string => Boolean(item));

  const freshnessNote = context.freshnessAssessment?.requiresFreshResearch
    ? context.freshnessAssessment.reason
    : null;
  const headline = profile && profileReferenceIds.length
    ? profile.strategy_summary
    : `${organisation.name}'s strategy is only partially evidenced in the currently approved corpus.`;
  const executiveSummary = profile && profileReferenceIds.length
    ? "The approved profile is anchored to first-party strategy evidence. Recent execution, independent context and soft signals are shown separately so that directional indicators are not mistaken for declared intent."
    : "The available references do not support a complete current strategy statement. The evidence below is separated by type, and absent evidence is stated rather than inferred.";

  return {
    headline,
    executiveSummary,
    evidenceFindings: findings.slice(0, 6),
    strategicInterpretation: null,
    irishMarketImplication: null,
    counterEvidence: uniqueLimit(
      [...missingEvidence, ...(freshnessNote ? [freshnessNote] : [])],
      6,
    ),
    whatToWatch: uniqueLimit(
      [
        !declared.length && !profileReferenceIds.length
          ? "A current annual report, results statement or investor presentation that sets out strategic priorities."
          : null,
        !execution.length
          ? "First-party evidence that reported priorities have moved into delivery."
          : null,
        !softSignals.length
          ? "Relevant hiring, leadership or proposition changes that may provide directional context."
          : null,
      ].filter((item): item is string => Boolean(item)),
      4,
    ),
    confidence: evidence.confidence,
    confidenceReason: `The deterministic answer uses ${evidence.uniqueDocumentCount} approved document${evidence.uniqueDocumentCount === 1 ? "" : "s"}; confidence remains constrained by the stated evidence gaps.`,
    followUpQuestions: [
      `Which parts of ${organisation.name}'s strategy have recent execution evidence?`,
      `Show me the soft signals for ${organisation.name} and their limitations.`,
      `Which independent sources corroborate ${organisation.name}'s stated priorities?`,
    ],
    generatedBy: "fallback",
  };
}

function facetReferences(
  references: EvidenceReference[],
  facet: NonNullable<EvidenceReference["strategyFacets"]>[number],
) {
  return references.filter((reference) => reference.strategyFacets?.includes(facet));
}

function referenceFinding(title: string, references: EvidenceReference[]) {
  return {
    title,
    analysis: references
      .slice(0, 3)
      .map((reference) => reference.claimSupported)
      .join(" "),
    referenceIds: references.slice(0, 3).map((reference) => reference.id),
  };
}

export function unavailableDailyBriefingAnalysis(
  evidence: EvidencePackage,
): IntelligenceAnalysis {
  return {
    headline: "No verified daily developments are available yet.",
    executiveSummary:
      "Nothing published within the current briefing window has completed verification. Older material has not been presented as today's news.",
    evidenceFindings: [],
    strategicInterpretation: null,
    irishMarketImplication: null,
    counterEvidence: ["Current coverage is insufficient for a reliable daily ranking."],
    whatToWatch: [
      "This briefing will update as new monitored sources complete verification.",
    ],
    confidence: evidence.confidence,
    confidenceReason:
      "No verified reference falls within the current daily briefing window.",
    followUpQuestions: [
      "What are the most important developments in the latest verified evidence?",
      "Which sources are currently monitored?",
    ],
    generatedBy: "fallback",
  };
}

function insufficientAnalysis(
  evidence: EvidencePackage,
  gaps: string[] = [],
): IntelligenceAnalysis {
  return {
    headline: "There is not enough approved evidence to answer this reliably.",
    executiveSummary:
      "The current evidence store does not contain a sufficiently direct, verified match for this question. I have not substituted a plausible-sounding answer for missing evidence.",
    evidenceFindings: [],
    strategicInterpretation: null,
    irishMarketImplication: null,
    counterEvidence: uniqueLimit(
      ["Evidence coverage is currently insufficient.", ...gaps],
      6,
    ),
    whatToWatch: [
      "Add or verify primary evidence for this topic before drawing a conclusion.",
    ],
    confidence: evidence.confidence,
    confidenceReason: "No directly relevant approved reference was retrieved.",
    followUpQuestions: [
      "What evidence is available on the nearest related topic?",
      "Which organisations are covered in the current evidence base?",
    ],
    generatedBy: "fallback",
  };
}

function uniqueLimit(values: string[], limit: number) {
  return [...new Set(values)].slice(0, limit);
}
