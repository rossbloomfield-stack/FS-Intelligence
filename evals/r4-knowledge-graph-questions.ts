export type R4EvaluationQuestion = {
  category: "entity" | "comparative" | "technology" | "relationship" | "trend" | "multi_signal" | "historical" | "regulatory" | "international" | "challenge";
  question: string;
  expectedEvidence: string[];
};

const cases: Record<R4EvaluationQuestion["category"], string[]> = {
  entity: [
    "What is Zurich Ireland's current digital strategy?", "What has AIB been doing across AI and customer engagement?",
    "Summarise Bank of Ireland's current wealth activity.", "What capabilities is Irish Life developing?",
    "What has materially changed at Aviva Ireland?", "What is PTSB prioritising in digital?",
    "What products and propositions are most relevant at New Ireland?", "What is Revolut doing in Irish financial services?",
  ],
  comparative: [
    "Compare Aviva and Zurich on digital advice.", "Compare AIB and Bank of Ireland on AI capability.",
    "How do Irish Life and Zurich differ in customer engagement?", "Which is moving faster in wealth: AIB or Bank of Ireland?",
    "Compare Vhi and Laya on digital servicing.", "How do PTSB and Revolut differ in mobile engagement?",
    "Compare New Ireland and Royal London on protection propositions.", "Compare Irish Life and Aviva on financial wellness.",
  ],
  technology: [
    "Which technology vendors appear across multiple Irish competitors?", "Which advice platforms are gaining traction among insurers?",
    "What CRM technologies are evidenced across Irish providers?", "Which firms have explicit AI implementation evidence?",
    "Where are customer-service platforms being modernised?", "Which open-finance technologies should we watch?",
    "Which vendors support digital financial planning in Europe?", "What technology relationships have changed in the last year?",
  ],
  relationship: [
    "Which insurers use financial-planning technology?", "Which companies partner with the same AI vendors?",
    "Which products are connected to digital-advice capabilities?", "Who supplies technology to Irish wealth providers?",
    "Which executives lead transformation capabilities?", "Which firms distribute through employer channels?",
    "Which regulations affect digital advice products?", "Which Irish firms share technology partners with UK leaders?",
  ],
  trend: [
    "Which firms are increasing AI capability?", "Where is digital-advice activity accelerating?",
    "Which customer-engagement themes are strengthening?", "Is financial-wellness activity increasing in Ireland?",
    "Which competitors have rising technology momentum?", "What market capabilities have weakened in the last six months?",
    "Which firms show proposition activity above their own baseline?", "What themes have gained the most independent corroboration?",
  ],
  multi_signal: [
    "What evidence suggests digital advice investment is accelerating?", "What do hiring and vendor partnerships collectively suggest about AI?",
    "Which competitors show aligned proposition, technology and talent evidence?", "What cross-source evidence indicates greater self-service investment?",
    "Where do hard and soft signals point in the same direction?", "Which emerging patterns have primary-source support?",
    "What does product, hiring and leadership evidence suggest about wealth priorities?", "Which signals collectively indicate cost transformation?",
  ],
  historical: [
    "How has Zurich's proposition evolved since 2024?", "What changed in PTSB after the BAWAG announcement?",
    "How has Bank of Ireland's wealth strategy changed over three years?", "How has AIB's AI activity evolved since 2024?",
    "Which technology relationships are now historical?", "How has Irish Life's digital engagement activity changed?",
    "What strategic themes have persisted across annual reports?", "Which competitor relationships were superseded in the last year?",
  ],
  regulatory: [
    "Which competitors are most affected by current digital-advice regulation?", "What relationships connect CPC 2025 to product journeys?",
    "Which regulations affect customer-facing AI?", "What current regulatory evidence matters for pensions providers?",
    "How does DORA connect to technology modernisation?", "Which consultations must not be treated as final rules?",
    "What implementation deadlines affect Irish insurers?", "Which regulatory relationships have strong primary evidence?",
  ],
  international: [
    "Which international developments could influence Irish customer expectations?", "What UK digital-advice capabilities have not yet reached Ireland?",
    "Which European vendors are gaining traction with comparable insurers?", "Where do Nordic financial-wellness propositions provide a useful benchmark?",
    "Which Australian hybrid-advice developments matter for Ireland?", "What Canadian pension technology is relevant to Irish providers?",
    "Which global AI service patterns have multiple company implementations?", "How does Irish digital servicing compare with selected international leaders?",
  ],
  challenge: [
    "Is Revolut clearly ahead of traditional Irish providers in personalised engagement?", "Zurich is the market leader in digital advice. Is that supported?",
    "AIB invests more in AI than Bank of Ireland. Prove it.", "No Irish insurer uses agentic AI. Is that conclusion defensible?",
    "Digital advice always improves profitability. What does the evidence actually show?", "Vendor announcements prove implementation success. Challenge that premise.",
    "Hiring activity means a product launch is imminent. Is that warranted?", "Ireland is behind every international leader in self-service. Test the claim.",
  ],
};

const expectedByCategory: Record<R4EvaluationQuestion["category"], string[]> = {
  entity: ["entity resolution", "signals", "timeline", "citations"],
  comparative: ["two entities", "capabilities", "confidence", "citations"],
  technology: ["vendor relationships", "independent sources", "time validity"],
  relationship: ["bounded graph path", "relationship provenance", "citations"],
  trend: ["historical baseline", "momentum", "dates", "confidence"],
  multi_signal: ["multiple evidence categories", "corroboration", "pattern", "citations"],
  historical: ["historical evidence", "validity period", "current distinction"],
  regulatory: ["primary regulatory source", "status", "legal disclaimer"],
  international: ["geography", "Irish read-across", "source diversity"],
  challenge: ["premise challenge", "counter-evidence", "uncertainty"],
};

export const r4KnowledgeGraphQuestions: R4EvaluationQuestion[] = Object.entries(cases).flatMap(
  ([category, questions]) => questions.map((question) => ({
    category: category as R4EvaluationQuestion["category"],
    question,
    expectedEvidence: expectedByCategory[category as R4EvaluationQuestion["category"]],
  })),
);
