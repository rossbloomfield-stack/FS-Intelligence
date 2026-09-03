import type { IntelligenceQueryIntent } from "@/lib/intelligence/query-planner";

export type R1RetrievalEvaluationQuestion = {
  id: string;
  category:
    | "factual"
    | "comparative"
    | "trend"
    | "strategic"
    | "entity"
    | "technology"
    | "regulatory"
    | "contradictory";
  question: string;
  expectedIntent: IntelligenceQueryIntent;
  minimumQueries: number;
  requiresRecency: boolean;
};

export const r1RetrievalQuestions: R1RetrievalEvaluationQuestion[] = [
  {id:"fact-zurich-advice",category:"factual",question:"What digital advice proposition does Zurich Ireland currently offer?",expectedIntent:"digital_experience",minimumQueries:1,requiresRecency:true},
  {id:"fact-boi-wealth",category:"factual",question:"What is Bank of Ireland doing in wealth?",expectedIntent:"company_profile",minimumQueries:1,requiresRecency:false},
  {id:"fact-aib-ai",category:"factual",question:"What is AIB doing with AI?",expectedIntent:"ai_transformation",minimumQueries:1,requiresRecency:false},
  {id:"fact-revolut-ireland",category:"factual",question:"What services does Revolut currently provide in Ireland?",expectedIntent:"company_profile",minimumQueries:1,requiresRecency:true},
  {id:"compare-aviva-zurich",category:"comparative",question:"Compare Aviva and Zurich's digital advice strategies.",expectedIntent:"company_comparison",minimumQueries:3,requiresRecency:false},
  {id:"compare-aib-boi",category:"comparative",question:"Compare AIB and Bank of Ireland's digital strategies.",expectedIntent:"company_comparison",minimumQueries:3,requiresRecency:false},
  {id:"compare-pensions",category:"comparative",question:"Compare Irish Life and Zurich pension propositions.",expectedIntent:"company_comparison",minimumQueries:3,requiresRecency:false},
  {id:"compare-mortgage-protection",category:"comparative",question:"Compare mortgage protection products in Ireland.",expectedIntent:"product_comparison",minimumQueries:2,requiresRecency:false},
  {id:"trend-digital-advice",category:"trend",question:"What has changed in Irish digital financial advice during the past year?",expectedIntent:"digital_experience",minimumQueries:2,requiresRecency:false},
  {id:"trend-ai-insurance",category:"trend",question:"How is AI adoption changing among Irish insurers?",expectedIntent:"ai_transformation",minimumQueries:2,requiresRecency:false},
  {id:"trend-customer-switching",category:"trend",question:"What are the strongest recent signals of changing customer switching behaviour?",expectedIntent:"customer_signal",minimumQueries:2,requiresRecency:false},
  {id:"trend-open-finance",category:"trend",question:"Where is open finance gaining momentum?",expectedIntent:"market_trend",minimumQueries:2,requiresRecency:false},
  {id:"strategy-digital",category:"strategic",question:"What emerging developments could materially affect Irish Life's digital strategy?",expectedIntent:"company_strategy",minimumQueries:2,requiresRecency:false},
  {id:"strategy-competitor-threat",category:"strategic",question:"What are competitors doing that could threaten MyIrishLife?",expectedIntent:"market_overview",minimumQueries:2,requiresRecency:false},
  {id:"strategy-ai-priority",category:"strategic",question:"What AI investments should an Irish insurer prioritise over the next 12 months?",expectedIntent:"ai_transformation",minimumQueries:2,requiresRecency:false},
  {id:"strategy-wealth",category:"strategic",question:"How could Bank of Ireland use its banking relationship to grow wealth?",expectedIntent:"company_profile",minimumQueries:1,requiresRecency:false},
  {id:"strategy-disruption",category:"strategic",question:"What could materially disrupt Irish pensions over the next three years?",expectedIntent:"future_scenario",minimumQueries:2,requiresRecency:false},
  {id:"entity-aviva-investment",category:"entity",question:"What evidence is there that Aviva is increasing digital investment?",expectedIntent:"evidence_request",minimumQueries:1,requiresRecency:false},
  {id:"entity-aib-strategy",category:"entity",question:"How has AIB's strategy changed in the past 12 months?",expectedIntent:"company_strategy",minimumQueries:2,requiresRecency:false},
  {id:"entity-ptsb-bawag",category:"entity",question:"What has changed in PTSB's strategy since the BAWAG acquisition announcement?",expectedIntent:"company_strategy",minimumQueries:2,requiresRecency:false},
  {id:"entity-zurich",category:"entity",question:"How is Zurich differentiating in the Irish market?",expectedIntent:"company_strategy",minimumQueries:2,requiresRecency:false},
  {id:"technology-vendors",category:"technology",question:"Which technology vendors are being adopted by Irish financial-services competitors?",expectedIntent:"market_overview",minimumQueries:2,requiresRecency:false},
  {id:"technology-agentic",category:"technology",question:"Where is agentic AI moving into production in financial services?",expectedIntent:"ai_transformation",minimumQueries:2,requiresRecency:false},
  {id:"technology-platform",category:"technology",question:"Which competitors are modernising core technology platforms?",expectedIntent:"market_overview",minimumQueries:2,requiresRecency:false},
  {id:"technology-value",category:"technology",question:"Which banks report measurable value from generative AI?",expectedIntent:"ai_transformation",minimumQueries:2,requiresRecency:false},
  {id:"reg-digital-advice",category:"regulatory",question:"What regulatory developments could materially influence digital advice?",expectedIntent:"regulatory_question",minimumQueries:2,requiresRecency:true},
  {id:"reg-cpc",category:"regulatory",question:"What does the Consumer Protection Code 2025 mean for digital product journeys?",expectedIntent:"regulatory_question",minimumQueries:2,requiresRecency:true},
  {id:"reg-dora",category:"regulatory",question:"How should DORA affect digital-product decisions?",expectedIntent:"regulatory_question",minimumQueries:2,requiresRecency:true},
  {id:"reg-fida",category:"regulatory",question:"What should insurers be doing now for FIDA?",expectedIntent:"regulatory_question",minimumQueries:2,requiresRecency:true},
  {id:"reg-ai-act",category:"regulatory",question:"How does the AI Act affect customer-facing financial-services AI?",expectedIntent:"regulatory_question",minimumQueries:2,requiresRecency:true},
  {id:"mixed-ai-value",category:"contradictory",question:"Is the evidence that generative AI is producing financial value consistent across banks?",expectedIntent:"evidence_request",minimumQueries:1,requiresRecency:false},
  {id:"mixed-digital-advice",category:"contradictory",question:"Are competitors uniformly accelerating investment in digital advice?",expectedIntent:"digital_experience",minimumQueries:2,requiresRecency:false},
  {id:"mixed-customer-ai",category:"contradictory",question:"Does customer evidence support wider use of AI in financial advice?",expectedIntent:"evidence_request",minimumQueries:1,requiresRecency:false},
  {id:"mixed-regulation",category:"contradictory",question:"What evidence supports and challenges the view that regulation will slow digital advice?",expectedIntent:"evidence_request",minimumQueries:1,requiresRecency:false},
  {id:"latest-briefing",category:"trend",question:"What are today's most relevant financial-services developments for an Irish CEO?",expectedIntent:"market_overview",minimumQueries:2,requiresRecency:true},
  {id:"financial-growth",category:"comparative",question:"Which Irish bank is growing fastest based on the latest reported results?",expectedIntent:"financial_performance",minimumQueries:2,requiresRecency:true},
];
