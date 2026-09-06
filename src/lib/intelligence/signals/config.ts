export type SignalIntelligenceConfig = {
  extractionEnabled: boolean;
  generationEnabled: boolean;
  contradictionDetectionEnabled: boolean;
  retrievalEnabled: boolean;
  intelligenceFeedEnabled: boolean;
  signalDetailEnabled: boolean;
  adminReviewEnabled: boolean;
  extractionModel: string;
  eligibilityThreshold: number;
  materialityThreshold: number;
  entityMatchThreshold: number;
  signalMatchThreshold: number;
  maximumEvidenceLength: number;
  maximumObservationsPerDocument: number;
  signalRetrievalCount: number;
};

export const defaultSignalIntelligenceConfig: SignalIntelligenceConfig = {
  extractionEnabled: true,
  generationEnabled: true,
  contradictionDetectionEnabled: true,
  retrievalEnabled: true,
  intelligenceFeedEnabled: true,
  signalDetailEnabled: true,
  adminReviewEnabled: true,
  extractionModel: "gpt-5.4-mini",
  eligibilityThreshold: 0.5,
  materialityThreshold: 0.55,
  entityMatchThreshold: 0.82,
  signalMatchThreshold: 0.78,
  maximumEvidenceLength: 24_000,
  maximumObservationsPerDocument: 12,
  signalRetrievalCount: 12,
};

export function getSignalIntelligenceConfig(environment: NodeJS.ProcessEnv = process.env): SignalIntelligenceConfig {
  return {
    extractionEnabled: flag(environment.R3_OBSERVATION_EXTRACTION, true),
    generationEnabled: flag(environment.R3_SIGNAL_GENERATION, true),
    contradictionDetectionEnabled: flag(environment.R3_CONTRADICTION_DETECTION, true),
    retrievalEnabled: flag(environment.R3_SIGNAL_RETRIEVAL, true),
    intelligenceFeedEnabled: flag(environment.R3_INTELLIGENCE_FEED, true),
    signalDetailEnabled: flag(environment.R3_SIGNAL_DETAIL, true),
    adminReviewEnabled: flag(environment.R3_SIGNAL_REVIEW, true),
    extractionModel: environment.R3_EXTRACTION_MODEL?.trim() || environment.OPENAI_RESEARCH_MODEL?.trim() || defaultSignalIntelligenceConfig.extractionModel,
    eligibilityThreshold: decimal(environment.R3_ELIGIBILITY_THRESHOLD, 0.5),
    materialityThreshold: decimal(environment.R3_MATERIALITY_THRESHOLD, 0.55),
    entityMatchThreshold: decimal(environment.R3_ENTITY_MATCH_THRESHOLD, 0.82),
    signalMatchThreshold: decimal(environment.R3_SIGNAL_MATCH_THRESHOLD, 0.78),
    maximumEvidenceLength: integer(environment.R3_MAX_EVIDENCE_LENGTH, 24_000, 4_000, 60_000),
    maximumObservationsPerDocument: integer(environment.R3_MAX_OBSERVATIONS_PER_DOCUMENT, 12, 1, 20),
    signalRetrievalCount: integer(environment.R3_SIGNAL_RETRIEVAL_COUNT, 12, 1, 30),
  };
}

function flag(value: string | undefined, fallback: boolean) {
  return value === undefined ? fallback : value === "true";
}
function decimal(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}
function integer(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
