import { z } from "zod";

export const trendDirectionSchema = z.enum(["new", "up", "unchanged", "down", "resolved"]);
export const evidenceConfidenceSchema = z.enum(["high", "medium", "low", "insufficient"]);

export const boardSignalSchema = z.object({
  id: z.string(),
  category: z.enum(["opportunity", "threat", "customer_shift", "regulatory_risk", "technology_shift", "market_pressure"]),
  title: z.string(),
  summary: z.string(),
  score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  rag: z.enum(["red", "amber", "green", "grey"]),
  trend: trendDirectionSchema,
  evidenceConfidence: evidenceConfidenceSchema,
  sourceCount: z.number().int().nonnegative().optional(),
  primarySourceCount: z.number().int().nonnegative().optional(),
  href: z.string().optional(),
});

export type BoardSignal = z.infer<typeof boardSignalSchema>;
export type TrendDirection = z.infer<typeof trendDirectionSchema>;
export type EvidenceConfidence = z.infer<typeof evidenceConfidenceSchema>;
