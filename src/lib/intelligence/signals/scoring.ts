import type { SignalScoreComponents } from "@/schemas/signal-intelligence";

export const SIGNAL_SCORING_VERSION = "r3-score-v1";

export type ScoreInput = {
  evidenceDirectness: number[];
  sourceAuthority: number[];
  extractionCertainty: number[];
  entityCertainty: number[];
  independentSourceCount: number;
  contradictionWeight: number;
  temporalConsistency: number;
  competitiveProximity: number;
  themeRelevance: number;
  customerImpact: number;
  commercialImpact: number;
  technologyImpact: number;
  regulatoryImpact: number;
  timeHorizon: number;
  novelty: number;
  magnitude: "unknown" | "minimal" | "low" | "moderate" | "high" | "transformational";
  observationDates: Array<string | null>;
  entityCount: number;
};

export function scoreSignal(input: ScoreInput) {
  const corroboration = clamp(input.independentSourceCount <= 1 ? 0.35 : input.independentSourceCount === 2 ? 0.68 : Math.min(1, 0.75 + input.independentSourceCount * 0.05));
  const confidenceComponents = {
    evidenceDirectness: average(input.evidenceDirectness),
    sourceAuthority: average(input.sourceAuthority),
    independentCorroboration: corroboration,
    extractionCertainty: average(input.extractionCertainty),
    entityCertainty: average(input.entityCertainty),
    temporalConsistency: clamp(input.temporalConsistency),
    contradictionPenalty: clamp(input.contradictionWeight),
  };
  const confidence = 100 * clamp(
    0.25 * confidenceComponents.evidenceDirectness +
    0.2 * confidenceComponents.sourceAuthority +
    0.16 * confidenceComponents.independentCorroboration +
    0.16 * confidenceComponents.extractionCertainty +
    0.12 * confidenceComponents.entityCertainty +
    0.11 * confidenceComponents.temporalConsistency -
    0.3 * confidenceComponents.contradictionPenalty,
  );
  const relevanceComponents = {
    competitiveProximity: clamp(input.competitiveProximity),
    themeRelevance: clamp(input.themeRelevance),
    customerImpact: clamp(input.customerImpact),
    commercialImpact: clamp(input.commercialImpact),
    technologyImpact: clamp(input.technologyImpact),
    regulatoryImpact: clamp(input.regulatoryImpact),
    timeHorizon: clamp(input.timeHorizon),
  };
  const strategicRelevance = weightedAverage(Object.values(relevanceComponents), [0.2, 0.2, 0.14, 0.16, 0.1, 0.12, 0.08]);
  const magnitude = magnitudeValue(input.magnitude);
  const momentum = calculateMomentum(input.observationDates, input.independentSourceCount, input.entityCount);
  const signalScore = 100 * clamp(
    0.3 * (confidence / 100) + 0.28 * strategicRelevance + 0.16 * clamp(input.novelty) + 0.14 * magnitude + 0.12 * momentum,
  );
  return {
    confidence: round(confidence, 2),
    confidenceLabel: confidenceLabel(confidence),
    confidenceComponents,
    strategicRelevance: round(strategicRelevance, 4),
    relevanceComponents,
    novelty: round(clamp(input.novelty), 4),
    magnitude: input.magnitude,
    momentum: round(momentum, 4),
    signalScore: round(signalScore, 3),
    scoringVersion: SIGNAL_SCORING_VERSION,
  };
}

export function confidenceLabel(value: number) {
  if (value >= 85) return "very_high" as const;
  if (value >= 70) return "high" as const;
  if (value >= 50) return "moderate" as const;
  if (value >= 30) return "low" as const;
  return "very_low" as const;
}

export function lifecycleFor(input: { confidence: number; independentSourceCount: number; observationCount: number; contradictionWeight: number }) {
  if (input.contradictionWeight >= 0.6) return "contradicted" as const;
  if (input.confidence >= 85 && input.observationCount >= 4 && input.independentSourceCount >= 3) return "mature" as const;
  if (input.confidence >= 70 && input.independentSourceCount >= 2) return "confirmed" as const;
  if (input.observationCount >= 2 || input.confidence >= 50) return "active" as const;
  return "emerging" as const;
}

export function explainScore(score: ReturnType<typeof scoreSignal>) {
  const confidenceReasons = [
    `evidence directness ${percent(score.confidenceComponents.evidenceDirectness)}`,
    `source authority ${percent(score.confidenceComponents.sourceAuthority)}`,
    `independent corroboration ${percent(score.confidenceComponents.independentCorroboration)}`,
  ];
  if (score.confidenceComponents.contradictionPenalty > 0) confidenceReasons.push(`contradiction penalty ${percent(score.confidenceComponents.contradictionPenalty)}`);
  return `Confidence reflects ${confidenceReasons.join(", ")}. Strategic relevance is ${percent(score.strategicRelevance)}; novelty ${percent(score.novelty)}; momentum ${percent(score.momentum)}.`;
}

function calculateMomentum(dates: Array<string | null>, independentSources: number, entities: number) {
  const valid = dates.map((value) => value ? Date.parse(value) : Number.NaN).filter(Number.isFinite).sort((a, b) => b - a);
  if (!valid.length) return 0.2;
  const newest = valid[0];
  const recent = valid.filter((value) => newest - value <= 90 * 86_400_000).length;
  return clamp(0.2 + Math.min(0.45, recent * 0.09) + Math.min(0.2, independentSources * 0.05) + Math.min(0.15, entities * 0.04));
}
function magnitudeValue(value: ScoreInput["magnitude"]) { return ({ unknown: 0.35, minimal: 0.15, low: 0.3, moderate: 0.55, high: 0.8, transformational: 1 })[value]; }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + clamp(value), 0) / values.length : 0; }
function weightedAverage(values: number[], weights: number[]) { return values.reduce((sum, value, index) => sum + value * weights[index], 0) / weights.reduce((sum, value) => sum + value, 0); }
function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
function round(value: number, precision: number) { const factor = 10 ** precision; return Math.round(value * factor) / factor; }
function percent(value: number) { return `${Math.round(value * 100)}%`; }

// Keeps the exported structural type close to the persisted component contract.
export type StoredScoreComponents = Pick<SignalScoreComponents, "evidenceDirectness" | "sourceAuthority" | "independentCorroboration" | "extractionCertainty" | "entityCertainty" | "temporalConsistency" | "contradictionPenalty">;
