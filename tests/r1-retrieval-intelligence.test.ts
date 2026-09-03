import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { r1RetrievalQuestions } from "../evals/r1-retrieval-questions";
import { resolveOrganisations } from "@/lib/intelligence/entity-resolver";
import { decomposeIntelligenceQuery } from "@/lib/intelligence/query-decomposition";
import { planIntelligenceQuery } from "@/lib/intelligence/query-planner";
import {
  retrieveHybridFinancialIntelligence,
  type ApprovedSourceChunkRow,
  type RetrievalCandidateList,
} from "@/lib/intelligence/retriever";
import {
  defaultRetrievalConfig,
  getRetrievalConfig,
} from "@/lib/intelligence/retrieval-config";

const organisations = [
  {id:"irish-life",slug:"irish-life",name:"Irish Life",sector:"life_pensions_wealth",jurisdiction:"IE"},
  {id:"zurich",slug:"zurich",name:"Zurich",sector:"life_pensions_wealth",jurisdiction:"IE"},
  {id:"aviva",slug:"aviva",name:"Aviva",sector:"life_pensions_wealth",jurisdiction:"IE"},
  {id:"aib",slug:"aib",name:"AIB",sector:"banking_payments",jurisdiction:"IE"},
  {id:"boi",slug:"bank-of-ireland",name:"Bank of Ireland",sector:"banking_payments",jurisdiction:"IE"},
  {id:"ptsb",slug:"ptsb",name:"PTSB",sector:"banking_payments",jurisdiction:"IE"},
  {id:"revolut",slug:"revolut",name:"Revolut",sector:"banking_payments",jurisdiction:"IE"},
];

function row({
  chunk,
  source,
  domain,
  title,
  content,
  date = "2026-08-20",
  primary = true,
  relevance = 0.7,
  organisations: names = [],
  hash,
}: {
  chunk:number;source:string;domain:string;title:string;content:string;date?:string;
  primary?:boolean;relevance?:number;organisations?:string[];hash?:string;
}): ApprovedSourceChunkRow {
  return {
    chunk_id:chunk,source_item_id:`item-${source}`,evidence_source_id:source,
    title,publisher:domain,url:`https://${domain}/${source}`,publication_date:date,
    source_type:primary?"company_results":"industry_analysis",primary_source:primary,
    credibility_tier:primary?1:3,evidence_classification:primary?"primary_company":"secondary_analysis",
    canonical_domain:domain,source_class:primary?"company_investor":"media",categorisation:"Digital strategy",
    geography:"Ireland",source_weight:primary?0.95:0.65,chunk_content:content,section_label:"Strategy",
    page_number:chunk,content_hash:hash??`hash-${chunk}`,organisation_names:names,relevance,
  };
}

function fixtureLists(): RetrievalCandidateList[] {
  const lexical = [
    row({chunk:1,source:"aib-annual",domain:"aib.ie",title:"AIB annual report",content:"AIB digital advice strategy investment and customer platform.",organisations:["AIB"],relevance:0.94}),
    row({chunk:2,source:"aib-annual",domain:"aib.ie",title:"AIB annual report",content:"AIB digital advice technology investment and mobile distribution.",organisations:["AIB"],relevance:0.9}),
    row({chunk:3,source:"aib-annual",domain:"aib.ie",title:"AIB annual report",content:"AIB customer digital strategy priorities and investment.",organisations:["AIB"],relevance:0.86}),
    row({chunk:4,source:"boi-results",domain:"bankofireland.com",title:"Bank of Ireland results",content:"Bank of Ireland combines digital banking, wealth and advice growth.",organisations:["Bank of Ireland"],relevance:0.78}),
    row({chunk:5,source:"cbi-guidance",domain:"centralbank.ie",title:"Consumer protection guidance",content:"Digital advice must support customer understanding and suitability.",relevance:0.7}),
    row({chunk:6,source:"vendor-release",domain:"vendor.example",title:"Technology partnership",content:"A digital advice platform partnership supports hybrid adviser journeys.",primary:false,relevance:0.62}),
    row({chunk:7,source:"duplicate-wire",domain:"aggregator.example",title:"Technology partnership",content:"A digital advice platform partnership supports hybrid adviser journeys.",primary:false,relevance:0.6,hash:"hash-6"}),
  ];
  const semantic = [
    row({chunk:8,source:"zurich-update",domain:"zurich.ie",title:"Zurich proposition update",content:"Zurich expanded hybrid financial advice and digital customer journeys.",organisations:["Zurich"],relevance:0.91}),
    lexical[3],
    row({chunk:9,source:"customer-study",domain:"research.example",title:"Advice customer research",content:"Customers value human reassurance alongside digital financial guidance.",primary:false,relevance:0.82}),
    lexical[0],
    lexical[4],
  ];
  return [
    {channel:"lexical",subquery:{id:"direct",query:"digital advice strategy",purpose:"direct"},rows:lexical},
    {channel:"semantic",subquery:{id:"facet",query:"hybrid guidance customer journey",purpose:"semantic facet"},rows:semantic},
  ];
}

describe("R1 query understanding and decomposition",()=>{
  it("provides at least thirty cross-intent benchmark questions",()=>{
    expect(r1RetrievalQuestions.length).toBeGreaterThanOrEqual(30);
    expect(new Set(r1RetrievalQuestions.map(item=>item.category)).size).toBe(8);
  });

  it.each(r1RetrievalQuestions)("plans $id",(testCase)=>{
    const resolved=resolveOrganisations(testCase.question,organisations);
    const plan=planIntelligenceQuery(testCase.question,resolved);
    expect(plan.intent).toBe(testCase.expectedIntent);
    const queries=decomposeIntelligenceQuery(testCase.question,plan,4);
    expect(queries.length).toBeGreaterThanOrEqual(testCase.minimumQueries);
    expect(queries.length).toBeLessThanOrEqual(4);
    if(testCase.requiresRecency)expect(plan.freshVerificationRequired).toBe(true);
  });

  it("extracts a rolling period, geography, metric and signal type",()=>{
    const plan=planIntelligenceQuery("What hard signals show AIB profit momentum in Ireland over the past 12 months?",resolveOrganisations("AIB",organisations));
    expect(plan.timeframe.rollingMonths).toBe(12);
    expect(plan.jurisdictions).toContain("IE");
    expect(plan.requestedMetrics).toContain("profit");
    expect(plan.signalTypes).toContain("hard");
  });
});

describe("R1 hybrid ranking",()=>{
  it("fuses lexical and semantic candidates, removes duplicates and caps each document",()=>{
    const question="Compare AIB and Bank of Ireland digital advice strategies";
    const plan=planIntelligenceQuery(question,resolveOrganisations(question,organisations));
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:fixtureLists(),now:new Date("2026-09-03")});
    expect(result.metrics.lexicalCandidateCount).toBe(7);
    expect(result.metrics.semanticCandidateCount).toBe(5);
    expect(result.metrics.duplicatesRemoved).toBeGreaterThanOrEqual(1);
    expect(result.metrics.uniqueDocumentCount).toBeGreaterThanOrEqual(5);
    expect(result.references.find(item=>item.sourceId==="aib-annual")?.passages?.length).toBeLessThanOrEqual(2);
    expect(result.references.some(item=>item.sourceId==="boi-results")).toBe(true);
  });

  it("improves document breadth over the previous top-match behaviour",()=>{
    const lists=fixtureLists();
    const oldTopFive=new Set(lists[0].rows.slice(0,5).map(item=>item.evidence_source_id)).size;
    const question="Who is best positioned in digital financial advice?";
    const plan=planIntelligenceQuery(question,[]);
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:lists,now:new Date("2026-09-03")});
    expect(oldTopFive).toBe(3);
    expect(result.metrics.uniqueDocumentCount).toBeGreaterThan(oldTopFive);
    expect(result.metrics.maxDocumentConcentration).toBeLessThanOrEqual(2/result.metrics.selectedEvidenceCount);
  });

  it("uses metadata and authority without excluding relevant independent evidence",()=>{
    const question="What digital advice changes matter in Ireland?";
    const plan=planIntelligenceQuery(question,[]);
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:fixtureLists(),now:new Date("2026-09-03")});
    expect(result.references[0].primary).toBe(true);
    expect(result.references.some(item=>item.sourceId==="customer-study")).toBe(true);
  });

  it("applies an explicit rolling timeframe",()=>{
    const recent=row({chunk:20,source:"recent",domain:"recent.example",title:"Recent AIB strategy",content:"AIB digital strategy",date:"2026-08-01",organisations:["AIB"]});
    const old=row({chunk:21,source:"old",domain:"old.example",title:"Old AIB strategy",content:"AIB digital strategy",date:"2024-01-01",organisations:["AIB"]});
    const question="What has AIB done in digital strategy over the past 12 months?";
    const plan=planIntelligenceQuery(question,resolveOrganisations(question,organisations));
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:[{channel:"lexical",subquery:{id:"direct",query:question,purpose:"direct"},rows:[old,recent]}],now:new Date("2026-09-03")});
    expect(result.references.map(item=>item.sourceId)).toEqual(["recent"]);
  });

  it("returns an explicit insufficient-evidence state for an empty search",()=>{
    const question="What evidence exists on an uncovered credit-union platform?";
    const plan=planIntelligenceQuery(question,[]);
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:[]});
    expect(result.evidence.coverage).toBe("insufficient");
    expect(result.evidence.confidence).toBe("insufficient");
    expect(result.gaps[0]).toContain("No approved source");
  });

  it("does not let diversity controls remove all relevant evidence",()=>{
    const question="What is AIB's strategy?";
    const plan=planIntelligenceQuery(question,resolveOrganisations(question,organisations));
    const only=row({chunk:30,source:"aib-only",domain:"aib.ie",title:"AIB strategy",content:"AIB strategy and growth priorities",organisations:["AIB"]});
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:[{channel:"semantic",subquery:{id:"direct",query:question,purpose:"direct"},rows:[only]}]});
    expect(result.references).toHaveLength(1);
    expect(result.evidence.coverage).toBe("limited");
  });

  it("keeps selected citations tied to retrieved source identifiers",()=>{
    const question="What matters in digital advice?";
    const plan=planIntelligenceQuery(question,[]);
    const lists=fixtureLists();
    const candidateIds=new Set(lists.flatMap(list=>list.rows.map(item=>item.evidence_source_id)));
    const result=retrieveHybridFinancialIntelligence({question,plan,candidateLists:lists});
    expect(result.references.every(item=>candidateIds.has(item.sourceId))).toBe(true);
    expect(new Set(result.references.map(item=>item.sourceId)).size).toBe(result.references.length);
  });
});

describe("R1 configuration and database contract",()=>{
  it("bounds tunable retrieval parameters",()=>{
    const config=getRetrievalConfig({
      ...process.env,
      INTELLIGENCE_FINAL_EVIDENCE_COUNT:"999",
      INTELLIGENCE_MAX_DECOMPOSITION_QUERIES:"0",
    });
    expect(config.finalEvidenceCount).toBe(20);
    expect(config.maximumDecompositionQueries).toBe(1);
    expect(defaultRetrievalConfig.maximumChunksPerDocument).toBe(2);
  });

  it("defines approved-only lexical and semantic RPCs plus private diagnostics",()=>{
    const migration=readFileSync(join(process.cwd(),"supabase/migrations/20260903214020_r1_retrieval_intelligence.sql"),"utf8");
    expect(migration).toContain("search_approved_source_chunks_lexical");
    expect(migration).toContain("search_approved_source_chunks_semantic");
    expect(migration).toContain("using hnsw");
    expect(migration).toContain("alter table public.retrieval_diagnostics enable row level security");
    expect(migration).toContain("revoke all on table public.retrieval_diagnostics from public, anon, authenticated");
  });
});
