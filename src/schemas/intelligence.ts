import { z } from "zod";

export const runStatuses = ["queued","discovering","verifying","scoring","analysing","synthesising","quality_check","awaiting_approval","publishing","completed","failed","cancelled"] as const;
export const RunStatus = z.enum(runStatuses);
export const materialitySchema = z.object({
  strategicSignificance: z.number().int().min(1).max(5), customerImpact: z.number().int().min(1).max(5),
  commercialImpact: z.number().int().min(1).max(5), regulatoryRiskImpact: z.number().int().min(1).max(5),
  irelandCompetitiveRelevance: z.number().int().min(1).max(5), immediacy: z.number().int().min(1).max(5),
  rationale: z.string().min(20),
});
export type MaterialityInput = z.infer<typeof materialitySchema>;
export function scoreMateriality(input: MaterialityInput) {
  const total = input.strategicSignificance + input.customerImpact + input.commercialImpact + input.regulatoryRiskImpact + input.irelandCompetitiveRelevance + input.immediacy;
  return { ...input, total, classification: total >= 22 ? "critical" : total >= 17 ? "significant" : total >= 12 ? "watchlist" : "exclude" } as const;
}
export const candidateEventSchema = z.object({
  title: z.string(), organisationIds: z.array(z.uuid()), sector: z.string(), eventDate: z.iso.date().nullable(),
  announcementDate: z.iso.date().nullable(), sourcePublicationDate: z.iso.date(), factualSummary: z.string(),
  sourceIds: z.array(z.uuid()), potentialIrishRelevance: z.string(), evidenceLimitations: z.array(z.string()), discoveryAgent: z.string(),
});
export const qaSchema = z.object({ passed: z.boolean(), criticalIssues: z.array(z.string()), warnings: z.array(z.string()), recommendedFixes: z.array(z.string()) });
