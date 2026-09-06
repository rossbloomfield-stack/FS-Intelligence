import { z } from "zod";

export const observationTypes = [
  "strategic_priority", "strategic_change", "investment_priority", "market_entry", "market_exit", "growth_target", "transformation_programme",
  "product_launch", "product_change", "product_withdrawal", "proposition_change", "pricing_change", "feature_launch", "feature_change", "customer_journey_change", "digital_service_change",
  "technology_adoption", "platform_change", "ai_adoption", "data_capability", "automation", "technology_investment", "vendor_selection", "implementation",
  "partnership", "supplier_relationship", "distribution_agreement", "technology_relationship", "ecosystem_relationship",
  "acquisition", "disposal", "merger", "funding", "financial_performance", "cost_change", "organisational_change",
  "executive_appointment", "executive_departure", "hiring_activity", "capability_hiring", "team_expansion", "restructuring",
  "customer_growth", "customer_decline", "adoption_change", "digital_adoption", "customer_satisfaction", "customer_complaint", "engagement_change",
  "regulation_proposed", "regulation_finalised", "implementation_deadline", "regulatory_guidance", "regulatory_enforcement", "supervisory_priority", "regulatory_risk",
  "market_growth", "market_decline", "market_share_change", "consumer_behaviour_change", "technology_trend", "distribution_change",
  "webpage_change", "navigation_change", "proposition_language_change", "app_update", "pricing_page_change", "careers_change",
] as const;

export const observationTypeSchema = z.enum(observationTypes);
export const signalDirectionSchema = z.enum(["increasing", "decreasing", "new", "expanding", "contracting", "stable", "mixed", "unknown"]);
export const signalMagnitudeSchema = z.enum(["unknown", "minimal", "low", "moderate", "high", "transformational"]);
export const signalLifecycleSchema = z.enum(["emerging", "active", "confirmed", "mature", "superseded", "contradicted", "expired", "dismissed"]);

const nullableDate = z.iso.date().nullable();

export const extractedObservationSchema = z.object({
  observationType: observationTypeSchema,
  eventType: z.string().trim().min(1).max(80).nullable(),
  rawEntityText: z.string().trim().min(1).max(200).nullable(),
  theme: z.string().trim().min(1).max(120).nullable(),
  capability: z.string().trim().min(1).max(120).nullable(),
  product: z.string().trim().min(1).max(160).nullable(),
  market: z.string().trim().min(1).max(120).nullable(),
  geography: z.string().trim().min(1).max(120).nullable(),
  observationText: z.string().trim().min(12).max(800),
  evidenceText: z.string().trim().min(8).max(4_000),
  evidenceStart: z.number().int().min(0).nullable(),
  evidenceEnd: z.number().int().positive().nullable(),
  metricName: z.string().trim().min(1).max(120).nullable(),
  metricValue: z.number().finite().nullable(),
  metricUnit: z.string().trim().min(1).max(40).nullable(),
  metricCurrency: z.string().trim().min(3).max(3).nullable(),
  metricPeriod: z.string().trim().min(1).max(80).nullable(),
  metricScope: z.string().trim().min(1).max(160).nullable(),
  previousValue: z.number().finite().nullable(),
  direction: signalDirectionSchema.nullable(),
  eventDate: nullableDate,
  extractionConfidence: z.number().min(0).max(1),
  evidenceDirectness: z.number().min(0).max(1),
  materiality: z.number().min(0).max(1),
  signalWorthy: z.boolean(),
  reviewReason: z.string().trim().max(400).nullable(),
});

export const observationExtractionSchema = z.object({
  observations: z.array(extractedObservationSchema).max(12),
});

export type ExtractedObservation = z.infer<typeof extractedObservationSchema>;

export type ResolvedEntity = {
  id: string | null;
  canonicalName: string | null;
  rawText: string | null;
  confidence: number;
  ambiguous: boolean;
};

export type SignalScoreComponents = {
  evidenceDirectness: number;
  sourceAuthority: number;
  independentCorroboration: number;
  extractionCertainty: number;
  entityCertainty: number;
  temporalConsistency: number;
  contradictionPenalty: number;
  competitiveProximity: number;
  themeRelevance: number;
  customerImpact: number;
  commercialImpact: number;
  technologyImpact: number;
  regulatoryImpact: number;
  timeHorizon: number;
  novelty: number;
  magnitude: number;
  momentum: number;
};

export type RetrievedMarketSignal = {
  id: string;
  title: string;
  summary: string;
  signalType: string;
  status: string;
  direction: string | null;
  eventDate: string | null;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  confidenceScore: number;
  strategicRelevance: number;
  novelty: number;
  magnitude: string | null;
  momentum: number;
  signalScore: number;
  themes: string[];
  capabilities: string[];
  geographies: string[];
  corroborationCount: number;
  independentSourceCount: number;
  contradictionCount: number;
  reasoningSummary: string | null;
  relevance: number;
};

export const signalReviewActionSchema = z.object({
  action: z.enum(["mark_important", "unmark_important", "dismiss", "restore", "merge_signal", "detach_observation", "reject_observation", "correct_entity", "rerun_extraction"]),
  targetSignalId: z.string().uuid().optional(),
  observationId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  note: z.string().trim().max(1_000).optional(),
});

export const signalBackfillSchema = z.object({
  limit: z.number().int().min(1).max(5).default(3),
  sourceClass: z.string().trim().max(100).optional(),
});
