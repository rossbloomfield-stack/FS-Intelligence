sed: --: No such file or directory
import { z } from "zod";

export const sourceRecordSchema=z.object({url:z.url(),canonicalUrl:z.url(),title:z.string(),publisher:z.string(),sourceType:z.string(),publicationDate:z.string().nullable(),primarySource:z.boolean(),credibilityTier:z.number().int().min(1).max(8),notes:z.string().nullable()});
export const discoveredEventSchema=z.object({title:z.string(),organisationNames:z.array(z.string()),sector:z.string(),eventDate:z.string().nullable(),announcementDate:z.string().nullable(),sourcePublicationDate:z.string(),factualSummary:z.string(),sources:z.array(sourceRecordSchema).min(1),potentialIrishRelevance:z.string(),evidenceLimitations:z.array(z.string()),discoveryAgent:z.string()});
export const discoveryOutputSchema=z.object({events:z.array(discoveredEventSchema),organisationsSearched:z.array(z.string()),coverageLimitations:z.array(z.string())});
export const verifiedEventSchema=discoveredEventSchema.extend({evidenceClassification:z.enum(["primary_source_confirmed","multiple_source_confirmed","company_claim_only","analyst_interpretation","market_speculation"]),verifiedClaims:z.array(z.object({claim:z.string(),sourceUrls:z.array(z.url()).min(1)})),verificationWarnings:z.array(z.string()),includeForScoring:z.boolean()});
export const verificationOutputSchema=z.object({events:z.array(verifiedEventSchema)});
export const materialityOutputSchema=z.object({scores:z.array(z.object({eventTitle:z.string(),strategicSignificance:z.number().int().min(1).max(5),customerImpact:z.number().int().min(1).max(5),commercialImpact:z.number().int().min(1).max(5),regulatoryRiskImpact:z.number().int().min(1).max(5),irelandCompetitiveRelevance:z.number().int().min(1).max(5),immediacy:z.number().int().min(1).max(5),rationale:z.string().min(20)}))});
export const briefingSchema=z.object({executiveHeadline:z.string(),overallAssessment:z.string(),conclusions:z.array(z.object({whatChanged:z.string(),whyItMatters:z.string()})).min(5).max(7),boardTalkingPoints:z.array(z.string()).max(6),leadershipDecisions:z.array(z.object({decision:z.string(),whyNow:z.string(),consequenceOfDelay:z.string(),recommendedOwner:z.string(),recommendedTiming:z.string()})).max(5),questionsForNextWeek:z.array(z.string()).length(5),coverageNote:z.string(),coveringEmail:z.object({subject:z.string(),body:z.string()})});
export const qaOutputSchema=z.object({passed:z.boolean(),criticalIssues:z.array(z.string()),warnings:z.array(z.string()),recommendedFixes:z.array(z.string())});
export type DiscoveryOutput=z.infer<typeof discoveryOutputSchema>;
export type VerificationOutput=z.infer<typeof verificationOutputSchema>;
export type MaterialityOutput=z.infer<typeof materialityOutputSchema>;
export type Briefing=z.infer<typeof briefingSchema>;
