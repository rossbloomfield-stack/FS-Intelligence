import {describe,expect,it} from "vitest";
import {intelligenceCorpusBatch} from "@/schemas/intelligence-corpus";

const sourceId="11111111-1111-4111-8111-111111111111";
describe("R5 corpus contract",()=>{
 it("accepts a source-linked financial metric",()=>{expect(intelligenceCorpusBatch.safeParse({schemaVersion:"1.0",batchId:"results-2026",records:[{type:"financial_metric",organisationSlug:"aib-group",metric:"profit_before_tax",value:1,unit:"EUR million",periodStart:null,periodEnd:"2026-06-30",reportedAt:"2026-07-31",sourceId,notes:null}]}).success).toBe(true)});
 it("rejects records without evidence lineage",()=>{expect(intelligenceCorpusBatch.safeParse({schemaVersion:"1.0",batchId:"strategy-2026",records:[{type:"company_strategy_profile",organisationSlug:"aib-group",strategySummary:"Evidence-backed strategy",effectiveAt:"2026-06-30",confidence:"high",evidence:[]}]}).success).toBe(false)});
 it("rejects invented maturity precision",()=>{expect(intelligenceCorpusBatch.safeParse({schemaVersion:"1.0",batchId:"capability-2026",records:[{type:"digital_capability",organisationSlug:"aib-group",capability:"digital_onboarding",status:"available",maturity:9,assessment:"Verified capability",sourceId,lastVerifiedAt:"2026-08-01"}]}).success).toBe(false)});
});
