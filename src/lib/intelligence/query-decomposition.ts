import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";

export type RetrievalSubquery = {
  id: string;
  query: string;
  purpose: string;
};

const expansionTerms: Partial<
  Record<IntelligenceQueryPlan["intent"], string[]>
> = {
  market_overview: [
    "strategy",
    "competition",
    "growth",
    "risk",
    "customer",
    "digital",
    "technology",
    "AI",
    "regulation",
  ],
  company_strategy: [
    "strategy",
    "growth",
    "investment",
    "customer",
    "digital",
    "technology",
    "risk",
  ],
  company_comparison: [
    "strategy",
    "growth",
    "financial",
    "digital",
    "wealth",
    "customer",
    "technology",
    "AI",
    "risk",
  ],
  product_comparison: [
    "product",
    "proposition",
    "features",
    "pricing",
    "fees",
    "journey",
    "distribution",
  ],
  digital_experience: [
    "digital",
    "mobile",
    "online",
    "customer",
    "platform",
    "self service",
    "advice",
  ],
  ai_transformation: [
    "AI",
    "artificial intelligence",
    "generative AI",
    "GenAI",
    "agentic",
    "automation",
    "technology",
  ],
  regulatory_question: [
    "regulation",
    "guidance",
    "requirements",
    "implementation",
    "supervision",
  ],
  market_trend: [
    "strategy",
    "growth",
    "market",
    "customer",
    "digital",
    "technology",
    "risk",
  ],
  strategic_recommendation: [
    "strategy",
    "competition",
    "growth",
    "risk",
    "customer",
    "digital",
    "technology",
    "regulation",
  ],
};

const needTerms: Record<string, string> = {
  strategy_profile: "strategy priorities growth investment operating model",
  financial_metrics: "financial results performance profit revenue assets investment",
  company_results: "results performance outlook guidance",
  digital_capabilities: "digital mobile online onboarding self-service platform",
  ai_initiatives: "AI artificial intelligence GenAI automation use cases production",
  products: "products propositions features pricing fees distribution advice",
  competitor_pages: "customer journey product page digital experience proposition",
  pricing: "pricing fees rates charges",
  primary_regulation: "regulation legislation official requirements guidance",
  regulatory_items: "regulatory change implementation supervision compliance",
  recent_material_events: "announcement launch partnership acquisition investment change",
  strategic_themes: "market trend strategic signal momentum change",
  strategic_patterns: "competitive advantage threat opportunity implication",
  ownership_events: "ownership acquisition merger disposal transaction",
  organisation_relationships: "parent subsidiary ownership partnership",
  customer_signals: "customer behaviour sentiment trust switching affordability adoption",
  market_research: "market research survey customer evidence",
  historical_reports: "historical change trend development timeline",
};

export function buildRetrievalSearchQuery(
  question: string,
  plan: IntelligenceQueryPlan,
) {
  const organisations = plan.organisations.flatMap((item) => [
    item.name,
    item.slug.replaceAll("-", " "),
  ]);
  return uniqueTerms([
    question,
    ...organisations,
    ...plan.people,
    ...plan.products,
    ...plan.markets,
    ...plan.jurisdictions,
    ...plan.regulations,
    ...plan.themes,
    ...plan.requestedMetrics,
    ...plan.signalTypes,
    ...(expansionTerms[plan.intent] ?? []),
  ]).join(" ").slice(0, 1000);
}

export function decomposeIntelligenceQuery(
  question: string,
  plan: IntelligenceQueryPlan,
  maximumQueries = 4,
): RetrievalSubquery[] {
  const queries: RetrievalSubquery[] = [
    {
      id: "direct",
      query: buildRetrievalSearchQuery(question, plan),
      purpose: "Direct question and resolved entities",
    },
  ];
  const complex =
    plan.comparisonRequested ||
    plan.strategicInterpretationRequired ||
    plan.evidenceNeeds.length >= 2;
  if (!complex || maximumQueries <= 1) return queries;

  const entityNames = plan.organisations.map((item) => item.name);
  if (plan.comparisonRequested && entityNames.length > 1) {
    for (const organisation of entityNames) {
      queries.push({
        id: `entity-${queries.length}`,
        query: uniqueTerms([
          organisation,
          ...plan.themes,
          ...plan.products,
          ...(expansionTerms[plan.intent] ?? []),
        ]).join(" "),
        purpose: `Independent evidence for ${organisation}`,
      });
      if (queries.length >= maximumQueries) return deduplicateQueries(queries);
    }
  }

  const needGroups = chunk(plan.evidenceNeeds, 2);
  for (const needs of needGroups) {
    const terms = needs.flatMap((need) => (needTerms[need] ?? need).split(" "));
    queries.push({
      id: `facet-${queries.length}`,
      query: uniqueTerms([
        ...entityNames,
        ...plan.products,
        ...plan.regulations,
        ...plan.themes,
        ...plan.strategicQuestionTypes,
        ...terms,
      ]).join(" "),
      purpose: `Evidence facets: ${needs.join(", ")}`,
    });
    if (queries.length >= maximumQueries) break;
  }
  return deduplicateQueries(queries).slice(0, maximumQueries);
}

function uniqueTerms(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.replaceAll("_", " ")),
    ),
  ];
}

function deduplicateQueries(queries: RetrievalSubquery[]) {
  const seen = new Set<string>();
  return queries.filter((item) => {
    const key = item.query.toLocaleLowerCase("en-IE").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chunk<T>(values: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    groups.push(values.slice(index, index + size));
  }
  return groups;
}
