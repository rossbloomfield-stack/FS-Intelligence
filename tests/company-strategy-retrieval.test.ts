import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fallbackAnalysis } from "@/lib/intelligence/analysis";
import { makeEvidencePackage, type EvidenceReference } from "@/lib/intelligence/evidence";
import {
  companyStrategyFacets,
  decomposeIntelligenceQuery,
} from "@/lib/intelligence/query-decomposition";
import { planIntelligenceQuery } from "@/lib/intelligence/query-planner";
import {
  retrieveHybridFinancialIntelligence,
  type ApprovedSourceChunkRow,
  type RetrievalCandidateList,
} from "@/lib/intelligence/retriever";
import type { StructuredKnowledge } from "@/lib/intelligence/structured-answer";

const aib = {
  id: "aib-id",
  slug: "aib",
  name: "AIB",
  sector: "banking_payments",
  jurisdiction: "IE",
};

function strategyRow({
  chunk,
  source,
  facet,
  signalType,
  primary,
  content,
}: {
  chunk: number;
  source: string;
  facet: (typeof companyStrategyFacets)[number];
  signalType: "hard" | "soft";
  primary: boolean;
  content: string;
}): ApprovedSourceChunkRow {
  return {
    chunk_id: chunk,
    source_item_id: `item-${source}`,
    evidence_source_id: source,
    title: `${source} AIB strategy`,
    publisher: primary ? "AIB Group" : "Independent publisher",
    url: `https://${source}.example/aib`,
    publication_date: "2026-08-15",
    source_type: primary ? "company_results" : "financial_news",
    primary_source: primary,
    credibility_tier: primary ? 1 : 3,
    evidence_classification: primary ? "primary_company" : "secondary_analysis",
    canonical_domain: `${source}.example`,
    source_class: primary ? "company_investor" : "media",
    categorisation: "Company strategy",
    geography: "Ireland",
    source_weight: primary ? 0.95 : 0.72,
    chunk_content: content,
    section_label: "Strategy",
    page_number: chunk,
    content_hash: `hash-${chunk}`,
    organisation_ids: [aib.id],
    organisation_names: [aib.name],
    signal_type: signalType,
    strategy_facet: facet,
    relevance: 0.95 - chunk / 100,
  };
}

describe("current company-strategy retrieval", () => {
  it("decomposes the exact AIB question into four declared evidence facets", () => {
    const question = "What is AIB’s strategy?";
    const plan = planIntelligenceQuery(question, [aib]);
    const subqueries = decomposeIntelligenceQuery(question, plan, 4);

    expect(plan.intent).toBe("company_strategy");
    expect(plan.timeframe.label).toBe("current");
    expect(subqueries.map((subquery) => subquery.facet)).toEqual(
      companyStrategyFacets,
    );
    expect(subqueries.map((subquery) => subquery.purpose)).toEqual([
      expect.stringContaining("Declared strategy"),
      expect.stringContaining("execution"),
      expect.stringContaining("Independent"),
      expect.stringContaining("soft signals"),
    ]);
  });

  it("reserves evidence breadth across strategy facets before general score fill", () => {
    const question = "What is AIB’s strategy?";
    const plan = planIntelligenceQuery(question, [aib]);
    const rows = [
      strategyRow({chunk: 1, source: "annual-report", facet: "declared_strategy", signalType: "hard", primary: true, content: "AIB states its strategic priorities and growth plan."}),
      strategyRow({chunk: 2, source: "results-update", facet: "recent_execution", signalType: "hard", primary: true, content: "AIB reports delivery against its digital and customer priorities."}),
      strategyRow({chunk: 3, source: "market-news", facet: "independent_context", signalType: "hard", primary: false, content: "Independent reporting places AIB's strategy in competitive context."}),
      strategyRow({chunk: 4, source: "aib-careers", facet: "soft_signal", signalType: "soft", primary: true, content: "AIB is recruiting roles related to data and digital capability."}),
      strategyRow({chunk: 5, source: "second-report", facet: "declared_strategy", signalType: "hard", primary: true, content: "AIB repeats its strategy and priorities in an investor report."}),
    ];
    const lists: RetrievalCandidateList[] = companyStrategyFacets.map((facet) => ({
      channel: "lexical",
      subquery: {id: facet, query: `AIB ${facet}`, purpose: facet, facet},
      rows: rows.filter((row) => row.strategy_facet === facet),
    }));
    const result = retrieveHybridFinancialIntelligence({
      question,
      plan,
      candidateLists: lists,
      now: new Date("2026-09-01"),
    });

    expect(
      new Set(result.references.flatMap((reference) => reference.strategyFacets ?? [])),
    ).toEqual(new Set(companyStrategyFacets));
    expect(
      result.references.find((reference) => reference.sourceId === "aib-careers")
        ?.signalTypes,
    ).toEqual(["soft"]);
  });

  it("does not call a company-strategy answer strong when core facets are missing", () => {
    const question = "What is AIB’s strategy?";
    const plan = planIntelligenceQuery(question, [aib]);
    const rows = Array.from({ length: 9 }, (_, index) =>
      strategyRow({
        chunk: 20 + index,
        source: `context-${index}`,
        facet: index % 2 ? "independent_context" : "soft_signal",
        signalType: index % 2 ? "hard" : "soft",
        primary: index % 2 === 0,
        content: `AIB contextual strategy signal ${index}.`,
      }),
    );
    const result = retrieveHybridFinancialIntelligence({
      question,
      plan,
      candidateLists: [{
        channel: "lexical",
        subquery: {id: "context-only", query: question, purpose: "context"},
        rows,
      }],
      now: new Date("2026-09-01"),
    });

    expect(result.evidence.coverage).toBe("limited");
    expect(result.gaps.join(" ")).toContain("declared-strategy");
    expect(result.gaps.join(" ")).toContain("recent-execution");
  });

  it("produces an evidence-honest fallback with directional soft signals", () => {
    const question = "What is AIB’s strategy?";
    const plan = planIntelligenceQuery(question, [aib]);
    const references: EvidenceReference[] = [
      {
        id: "ref-1", sourceId: "annual-report", title: "AIB annual report", publisher: "AIB Group", url: "https://aib.example/annual", publicationDate: "2026-03-01", sourceType: "company_results", primary: true, classification: "primary_company", claimSupported: "AIB sets out customer, capital and digital priorities.", supportStrength: "supporting", rank: 1, strategyFacets: ["declared_strategy"], signalTypes: ["hard"],
      },
      {
        id: "ref-2", sourceId: "results", title: "AIB results", publisher: "AIB Group", url: "https://aib.example/results", publicationDate: "2026-08-01", sourceType: "company_results", primary: true, classification: "primary_company", claimSupported: "AIB reports progress against customer and digital priorities.", supportStrength: "supporting", rank: 2, strategyFacets: ["recent_execution"], signalTypes: ["hard"],
      },
      {
        id: "ref-3", sourceId: "careers", title: "AIB careers", publisher: "AIB Group", url: "https://aib.example/careers", publicationDate: "2026-08-15", sourceType: "careers", primary: true, classification: "primary_company", claimSupported: "AIB advertised data and digital capability roles.", supportStrength: "supporting", rank: 3, strategyFacets: ["soft_signal"], signalTypes: ["soft"],
      },
    ];
    const emptyKnowledge: StructuredKnowledge = {
      strategyProfiles: [{
        id: "profile-1", organisation_id: aib.id, organisation_name: aib.name,
        strategy_summary: "AIB's stated strategy centres on customer relationships, disciplined capital deployment and digital execution.",
        strategic_priorities: ["Deepen customer relationships", "Invest in digital execution"],
        growth_priorities: [], cost_priorities: [], distribution_strategy: [], digital_strategy: ["Digital execution"], ai_strategy: [], customer_strategy: ["Customer relationships"], product_strategy: [], acquisition_strategy: [], technology_priorities: [], key_risks: [], effective_at: "2026-03-01", confidence: "high", sourceReferenceIds: ["ref-1", "ref-3"], sourceClaims: [
          {referenceId: "ref-1", claimSupported: "Declared strategy", supportStrength: "direct"},
          {referenceId: "ref-3", claimSupported: "Directional hiring context", supportStrength: "contextual"},
        ],
      }],
      financialMetrics: [], digitalCapabilities: [], digitalBenchmarks: [],
      aiInitiatives: [], competitorUpdates: [], timelineEvents: [], products: [],
    };
    const evidence = makeEvidencePackage(references, "2026-09-01T00:00:00.000Z", "adequate");
    const answer = fallbackAnalysis(evidence, {
      question,
      plan,
      knowledge: emptyKnowledge,
      freshnessAssessment: {requiresFreshResearch: false, reason: "Persistent evidence is recent enough for retrieval.", knowledgeCutoff: "2026-08-15"},
      gaps: ["No approved independent news or market context matched this company."],
    });

    expect(answer.headline).toContain("customer relationships");
    expect(answer.evidenceFindings.map((finding) => finding.title)).toContain(
      "Directional soft signals",
    );
    expect(
      answer.evidenceFindings.find((finding) => finding.title === "Directional soft signals")
        ?.analysis,
    ).toContain("not proof of strategy delivery");
    expect(
      answer.evidenceFindings.find((finding) => finding.title === "Declared strategy")
        ?.referenceIds,
    ).toEqual(["ref-1"]);
    expect(answer.counterEvidence.join(" ")).toContain("independent news");
  });

  it("defines an additive organisation-scoped RPC and full profile hydration", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260928210000_company_strategy_retrieval.sql"),
      "utf8",
    );
    const route = readFileSync(
      join(process.cwd(), "src/app/api/intelligence/chat/route.ts"),
      "utf8",
    );

    expect(migration).toContain("search_approved_company_strategy_chunks");
    expect(migration).toContain("requested_organisation_ids uuid[]");
    expect(migration).toContain("signal_type text");
    expect(migration).toContain("strategy_facet text");
    expect(migration).toContain("security invoker");
    expect(route).toContain("strategic_priorities,growth_priorities,cost_priorities");
    expect(route).toContain("company_strategy_profile_sources");
    expect(route).toContain("freshnessAssessment:retrieval.freshnessAssessment,gaps");
  });
});
