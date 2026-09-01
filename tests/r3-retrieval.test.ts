import {describe,expect,it} from "vitest";
import {resolveOrganisations} from "@/lib/intelligence/entity-resolver";
import {planIntelligenceQuery} from "@/lib/intelligence/query-planner";
import {retrieveFinancialIntelligence,type IntelligenceSourceRow} from "@/lib/intelligence/retriever";
import {answerForRetrieval} from "@/lib/intelligence/evidence-readiness";

const organisations=[
 {id:"aib-id",slug:"aib",name:"AIB",sector:"banking_payments",jurisdiction:"IE"},
 {id:"boi-id",slug:"bank-of-ireland",name:"Bank of Ireland",sector:"banking_payments",jurisdiction:"IE"},
 {id:"new-ireland-id",slug:"new-ireland-assurance",name:"New Ireland Assurance",sector:"life_pensions_wealth",jurisdiction:"IE"},
];
const sources:IntelligenceSourceRow[]=[
 {id:"aib-source",title:"AIB Group 2025 Financial Results",publisher:"AIB Group plc",url:"https://aib.example/results",publication_date:"2026-03-01",source_type:"company_results",primary_source:true,credibility_tier:1,evidence_classification:"primary_company",notes:"Official AIB performance and strategy source."},
 {id:"reg-source",title:"Consumer Protection Code 2025",publisher:"Central Bank of Ireland",url:"https://centralbank.example/cpc",publication_date:"2025-03-24",source_type:"regulatory",primary_source:true,credibility_tier:1,evidence_classification:"primary_regulatory",notes:"Primary regulatory requirements."},
 {id:"dora-source",title:"Digital Operational Resilience Act",publisher:"European Union",url:"https://europa.example/dora",publication_date:"2022-12-27",source_type:"legislation",primary_source:true,credibility_tier:1,evidence_classification:"primary_legislation",notes:"Official DORA legal text."},
];

describe("R3 query planning",()=>{
 it("resolves aliases without confusing New Ireland with its owner",()=>{
  expect(resolveOrganisations("Compare BOI and New Ireland",organisations).map(item=>item.slug)).toEqual(["bank-of-ireland","new-ireland-assurance"]);
 });
 it("plans a multi-company comparison with structured evidence needs",()=>{
  const resolved=resolveOrganisations("Compare AIB and Bank of Ireland's digital strategies",organisations);
  const plan=planIntelligenceQuery("Compare AIB and Bank of Ireland's digital strategies",resolved);
  expect(plan.intent).toBe("company_comparison");
  expect(plan.evidenceNeeds).toContain("digital_capabilities");
  expect(plan.organisations).toHaveLength(2);
 });
 it("requires fresh validation for regulatory questions",()=>{
  const plan=planIntelligenceQuery("What does CPC 2025 mean today?",[]);
  expect(plan.intent).toBe("regulatory_question");
  expect(plan.freshVerificationRequired).toBe(true);
 });
 it("distinguishes product comparison from company comparison",()=>{
  const plan=planIntelligenceQuery("Compare mortgage protection products",[]);
  expect(plan.intent).toBe("product_comparison");
  expect(plan.products).toEqual(["mortgage_protection"]);
 });
});

describe("R3 hybrid retrieval gate",()=>{
 it("returns company-specific evidence instead of every approved source",()=>{
  const plan=planIntelligenceQuery("What is AIB's financial performance?",resolveOrganisations("What is AIB's financial performance?",organisations));
  const result=retrieveFinancialIntelligence("What is AIB's financial performance?",plan,sources,new Date("2026-04-01"),{financial_metrics:0,company_results:1});
  expect(result.references.map(item=>item.sourceId)).toEqual(["aib-source"]);
  expect(result.gaps).toContain("Structured evidence is not populated for: financial_metrics.");
 });
 it("fails closed when no source directly matches",()=>{
  const plan=planIntelligenceQuery("How is Zurich differentiating in health insurance?",[]);
  const result=retrieveFinancialIntelligence("How is Zurich differentiating in health insurance?",plan,sources);
  expect(result.references).toHaveLength(0);
  expect(result.evidence.confidence).toBe("insufficient");
 });
 it("prefers primary regulatory evidence for regulatory intent",()=>{
  const plan=planIntelligenceQuery("What does DORA require?",[]);
  const result=retrieveFinancialIntelligence("What does DORA require?",plan,sources);
  expect(result.references[0]?.sourceId).toBe("dora-source");
  expect(result.freshnessAssessment.requiresFreshResearch).toBe(true);
 });
});

describe("approved evidence answer",()=>{
 it("surfaces bounded factual findings with matching evidence markers",()=>{
  const plan=planIntelligenceQuery("What is AIB's strategy?",resolveOrganisations("What is AIB's strategy?",organisations));
  const result=retrieveFinancialIntelligence("What is AIB's strategy?",plan,sources);
  const answer=answerForRetrieval(result.references,result.gaps);
  expect(answer).toContain("What the approved evidence shows");
  expect(answer).toContain("Official AIB performance and strategy source. [1]");
  expect(answer).not.toContain("synthesis is not enabled");
 });
});
