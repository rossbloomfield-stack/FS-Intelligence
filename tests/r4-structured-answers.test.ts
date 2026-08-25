import {describe,expect,it} from "vitest";
import {planIntelligenceQuery} from "@/lib/intelligence/query-planner";
import {buildStructuredAnswer,type StructuredKnowledge} from "@/lib/intelligence/structured-answer";
import type {EvidenceReference} from "@/lib/intelligence/evidence";

const aib={id:"aib-id",slug:"aib",name:"AIB",sector:"banking_payments",jurisdiction:"IE"};
const boi={id:"boi-id",slug:"bank-of-ireland",name:"Bank of Ireland",sector:"banking_payments",jurisdiction:"IE"};
const empty:StructuredKnowledge={strategyProfiles:[],financialMetrics:[],digitalCapabilities:[],digitalBenchmarks:[],aiInitiatives:[],competitorUpdates:[],timelineEvents:[],products:[]};
const aibReference:EvidenceReference={id:"ref-1",sourceId:"source-1",title:"AIB Group results",publisher:"AIB Group plc",url:"https://aib.example/results",publicationDate:"2026-03-01",sourceType:"company_results",primary:true,classification:"primary_company",claimSupported:"Official AIB strategy source",supportStrength:"supporting",rank:1};

describe("R4 structured answers",()=>{
 it("renders comparison structure without inventing capability assessments",()=>{
  const plan=planIntelligenceQuery("Compare AIB and Bank of Ireland",[aib,boi]);
  const answer=buildStructuredAnswer(plan,empty,[aibReference]);
  expect(answer?.kind).toBe("company_comparison");
  if(answer?.kind!=="company_comparison")throw new Error("comparison expected");
  expect(answer.companies[0].digitalAssessment).toBeNull();
  expect(answer.companies[0].evidenceReferenceIds).toEqual(["ref-1"]);
  expect(answer.limitations).toContain("Digital capability evidence is unavailable for one or more organisations.");
 });
 it("uses verified structured fields when present",()=>{
  const knowledge:StructuredKnowledge={...empty,digitalBenchmarks:[{id:"digital-1",organisation_id:"aib-id",category:"mobile",assessment:"Strong mobile servicing evidence",maturity:4}],aiInitiatives:[{id:"ai-1",organisation_id:"aib-id",use_case:"Service assistant",maturity:"production",objective:"Service efficiency",last_changed:"2026-02-01"}]};
  const plan=planIntelligenceQuery("Summarise AIB's digital strategy",[aib]);
  const answer=buildStructuredAnswer(plan,knowledge,[aibReference]);
  expect(answer?.kind).toBe("company_cards");
  if(answer?.kind!=="company_cards")throw new Error("company cards expected");
  expect(answer.companies[0].digitalAssessment).toBe("Strong mobile servicing evidence");
  expect(answer.companies[0].aiAssessment).toContain("production");
 });
 it("returns a professional insufficient-evidence product state",()=>{
  const plan=planIntelligenceQuery("Compare mortgage protection products",[]);
  const answer=buildStructuredAnswer(plan,empty,[]);
  expect(answer).toMatchObject({kind:"product_comparison",products:[]});
  expect(answer?.limitations).toContain("No verified product records match this question.");
 });
 it("returns timeline mode for historical questions",()=>{
  const plan=planIntelligenceQuery("How has AIB changed since 2025?",[aib]);
  const answer=buildStructuredAnswer(plan,{...empty,timelineEvents:[{id:"event-1",date:"2025-01-01",label:"Strategy update",summary:"Verified update",organisationNames:["AIB"],sourceId:"source-1",referenceId:null}]},[aibReference]);
  expect(answer).toMatchObject({kind:"timeline",events:[{id:"event-1"}]});
  if(answer?.kind!=="timeline")throw new Error("timeline expected");
  expect(answer.events[0].referenceId).toBe("ref-1");
 });
});
