import { z } from "zod";

const date=z.iso.date();
const sourceId=z.uuid();
const organisationSlug=z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const supportedText=z.string().trim().min(3).max(4000);
const confidence=z.enum(["high","medium","low","insufficient"]);

export const strategyProfileRecord=z.object({
 type:z.literal("company_strategy_profile"),organisationSlug,strategySummary:supportedText,
 strategicPriorities:z.array(supportedText).default([]),growthPriorities:z.array(supportedText).default([]),costPriorities:z.array(supportedText).default([]),
 distributionStrategy:z.array(supportedText).default([]),digitalStrategy:z.array(supportedText).default([]),aiStrategy:z.array(supportedText).default([]),
 customerStrategy:z.array(supportedText).default([]),productStrategy:z.array(supportedText).default([]),acquisitionStrategy:z.array(supportedText).default([]),
 technologyPriorities:z.array(supportedText).default([]),keyRisks:z.array(supportedText).default([]),effectiveAt:date,confidence,
 evidence:z.array(z.object({sourceId,claimSupported:supportedText,supportStrength:z.enum(["direct","corroborating","contextual"])})).min(1),
});

export const financialMetricRecord=z.object({
 type:z.literal("financial_metric"),organisationSlug,metric:z.string().trim().min(2).max(120),value:z.number().finite(),unit:z.string().trim().min(1).max(40),
 periodStart:date.nullable().default(null),periodEnd:date,reportedAt:date,sourceId,notes:supportedText.nullable().default(null),
});

export const productRecord=z.object({
 type:z.literal("product"),organisationSlug,slug:organisationSlug,name:supportedText.max(240),category:z.string().trim().min(2).max(120),
 targetAudience:supportedText.nullable().default(null),keyFeatures:z.array(supportedText).default([]),pricing:supportedText.nullable().default(null),fees:supportedText.nullable().default(null),
 distributionChannels:z.array(supportedText).default([]),adviceStatus:supportedText.nullable().default(null),onlineJourney:supportedText.nullable().default(null),
 applicationMethod:supportedText.nullable().default(null),digitalServiceCapabilities:z.array(supportedText).default([]),calculators:z.array(supportedText).default([]),
 keyWarnings:z.array(supportedText).default([]),status:z.enum(["active","withdrawn","announced","unknown"]),sourceId,lastVerifiedAt:date,
});

export const digitalCapabilityRecord=z.object({
 type:z.literal("digital_capability"),organisationSlug,capability:z.string().trim().min(2).max(120),
 status:z.enum(["available","partial","pilot","planned","not_available","insufficient_evidence"]),maturity:z.number().int().min(1).max(5).nullable().default(null),
 assessment:supportedText.nullable().default(null),sourceId,lastVerifiedAt:date,
});

export const customerSignalRecord=z.object({
 type:z.literal("customer_signal"),classification:z.string().trim().min(2).max(120),signal:supportedText,sampleSize:z.number().int().positive().nullable().default(null),
 market:z.string().trim().min(2).max(120),methodology:supportedText,limitations:supportedText,sourceId,surveyDate:date,
});

export const intelligenceCorpusRecord=z.discriminatedUnion("type",[strategyProfileRecord,financialMetricRecord,productRecord,digitalCapabilityRecord,customerSignalRecord]);
export const intelligenceCorpusBatch=z.object({schemaVersion:z.literal("1.0"),batchId:z.string().trim().min(3).max(120),records:z.array(intelligenceCorpusRecord).min(1).max(1000)});
export type IntelligenceCorpusBatch=z.infer<typeof intelligenceCorpusBatch>;

export function validateIntelligenceCorpusBatch(input:unknown){return intelligenceCorpusBatch.parse(input)}
