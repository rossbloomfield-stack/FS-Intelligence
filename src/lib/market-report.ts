export type SignalKind = "Hard signal" | "Soft signal";

export type MarketFinding = {
  title: string;
  interpretation: string;
  implication: string;
  signalKind: SignalKind;
  strength: "High" | "Medium" | "Emerging";
  direction: "Accelerating" | "Stable" | "Emerging";
  sourceLabel: string;
  sourceUrl: string;
};

export type CompetitorFocus = {
  organisation: string;
  market: "Ireland" | "UK" | "Ireland & UK";
  sector: "Banking" | "Insurance" | "Wealth & pensions" | "Payments";
  focus: string;
  evidence: string;
  maturity: "Executing" | "Scaling" | "Repositioning";
  irishReadAcross: string;
  sourceUrl: string;
};

export const reportMeta = {
  period: "Market position at 9 August 2026",
  headline: "Execution, distribution and applied AI are reshaping competitive advantage",
  assessment:
    "The strongest hard signals point to digital servicing, operating efficiency and deeper customer relationships moving from transformation programmes into measurable delivery. Softer signals—especially hiring, partnership and proposition activity—suggest the next competitive boundary will be personalised, AI-assisted financial guidance delivered across integrated ecosystems.",
};

export const findings: Record<"ai" | "regulation" | "customer" | "actions", MarketFinding[]> = {
  ai: [
    {
      title: "AI is moving from experimentation to production economics",
      interpretation: "Major UK banks are disclosing live use cases and quantified value, while Irish firms continue to emphasise governance, resilience and controlled scaling.",
      implication: "Measure production value and control effectiveness together; pilot counts are no longer a meaningful success metric.",
      signalKind: "Hard signal", strength: "High", direction: "Accelerating",
      sourceLabel: "Lloyds Banking Group 2025 annual report", sourceUrl: "https://www.lloydsbankinggroup.com/investors/annual-report.html",
    },
    {
      title: "Customer-facing AI is converging with human advice",
      interpretation: "Strategy language, recruitment and product announcements increasingly position AI as an augmentation layer for service and advice rather than a standalone channel.",
      implication: "Define the future adviser and service-colleague operating model before technology choices harden it by default.",
      signalKind: "Soft signal", strength: "Medium", direction: "Emerging",
      sourceLabel: "Aviva 2025 annual report", sourceUrl: "https://www.aviva.com/investors/annual-reports/",
    },
    {
      title: "Modernisation is shifting from channels to the core estate",
      interpretation: "Cloud, data, identity and workflow simplification now appear as connected operating-model investments rather than isolated technology upgrades.",
      implication: "Assess transformation by end-to-end journey economics, resilience and release velocity—not by front-end change alone.",
      signalKind: "Hard signal", strength: "High", direction: "Accelerating",
      sourceLabel: "NatWest Group annual report", sourceUrl: "https://www.natwestgroup.com/investors/annual-reports.html",
    },
  ],
  regulation: [
    {
      title: "Operational resilience has entered the evidence phase",
      interpretation: "Supervisors increasingly expect firms to demonstrate that important services remain within tolerance under severe but plausible disruption.",
      implication: "Connect board risk appetite to tested service outcomes, third-party dependencies and remediated weaknesses.",
      signalKind: "Hard signal", strength: "High", direction: "Accelerating",
      sourceLabel: "Central Bank of Ireland — DORA", sourceUrl: "https://www.centralbank.ie/regulation/digital-operational-resilience-act-dora",
    },
    {
      title: "Consumer protection is becoming an outcomes discipline",
      interpretation: "Irish and UK regimes are converging on evidence of fair value, customer understanding and support for customers in vulnerable circumstances.",
      implication: "Instrument journeys so customer outcomes can be demonstrated by segment, channel and product—not inferred from policy compliance.",
      signalKind: "Hard signal", strength: "High", direction: "Stable",
      sourceLabel: "Central Bank of Ireland — Consumer Protection Code", sourceUrl: "https://www.centralbank.ie/regulation/consumer-protection/consumer-protection-codes-regulations",
    },
    {
      title: "AI accountability will extend into model supply chains",
      interpretation: "Regulatory language points towards stronger inventories, traceability and human accountability for automated decisions, including third-party models.",
      implication: "Create one accountable inventory across models, vendors, data, decisions and customer redress before use cases scale.",
      signalKind: "Soft signal", strength: "Medium", direction: "Emerging",
      sourceLabel: "European Commission — AI Act", sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    },
  ],
  customer: [
    {
      title: "Mobile-first has become the service baseline",
      interpretation: "High digital adoption and faster onboarding are changing expectations for immediacy, transparency and control across banking, insurance and wealth.",
      implication: "Benchmark the complete resolution journey, including failure and human hand-off—not only digital entry points.",
      signalKind: "Hard signal", strength: "High", direction: "Stable",
      sourceLabel: "Lloyds Banking Group 2025 annual report", sourceUrl: "https://www.lloydsbankinggroup.com/investors/annual-report.html",
    },
    {
      title: "Affordability pressure is increasing demand for guidance",
      interpretation: "Persistent attention to household costs, savings resilience and protection gaps suggests customers need clearer trade-offs and more proactive support.",
      implication: "Use life-event and affordability signals to trigger relevant help while enforcing consent, suitability and vulnerability controls.",
      signalKind: "Soft signal", strength: "Medium", direction: "Accelerating",
      sourceLabel: "Central Statistics Office — household finance", sourceUrl: "https://www.cso.ie/en/statistics/householdfinanceandconsumption/",
    },
    {
      title: "Trust increasingly depends on recovery from failure",
      interpretation: "Fraud, outages and difficult claims or complaints journeys create disproportionate reputational effects even when core digital adoption is strong.",
      implication: "Treat recovery, reassurance and redress as designed customer journeys with board-visible outcome measures.",
      signalKind: "Soft signal", strength: "Medium", direction: "Accelerating",
      sourceLabel: "Financial Services and Pensions Ombudsman", sourceUrl: "https://www.fspo.ie/publications/",
    },
  ],
  actions: [
    {
      title: "Set one value-and-control standard for production AI",
      interpretation: "The market is separating firms that can scale governed use cases from firms accumulating disconnected pilots.",
      implication: "Within 30 days, agree minimum evidence for value, customer outcome, model risk, data lineage and accountable ownership.",
      signalKind: "Hard signal", strength: "High", direction: "Accelerating",
      sourceLabel: "Supporting market evidence", sourceUrl: "https://www.lloydsbankinggroup.com/investors/annual-report.html",
    },
    {
      title: "Benchmark integrated customer relationships",
      interpretation: "Leading firms are using broader propositions and personalisation to increase engagement and share of wallet.",
      implication: "Compare the group’s next-best-action, advice and cross-product journeys against Irish and UK leaders by customer outcome and economics.",
      signalKind: "Soft signal", strength: "Medium", direction: "Emerging",
      sourceLabel: "Supporting market evidence", sourceUrl: "https://investorrelations.bankofireland.com/",
    },
    {
      title: "Move resilience reporting from activity to service evidence",
      interpretation: "Regulatory implementation is moving towards demonstrable performance under disruption.",
      implication: "Run an integrated review of important business services, third parties, test evidence, open weaknesses and customer impact.",
      signalKind: "Hard signal", strength: "High", direction: "Accelerating",
      sourceLabel: "Supporting regulatory evidence", sourceUrl: "https://www.centralbank.ie/regulation/digital-operational-resilience-act-dora",
    },
  ],
};

export const competitorFocus: CompetitorFocus[] = [
  { organisation:"AIB", market:"Ireland", sector:"Banking", focus:"Customer-first growth, sustainability and operational efficiency and resilience", evidence:"2024–2026 strategy priorities remain the clearest declared frame for execution.", maturity:"Executing", irishReadAcross:"Irish benchmark for relationship depth, resilient operations and sustainable finance.", sourceUrl:"https://www.aib.ie/content/dam/frontdoor/investorrelations/docs/resultscentre/annualreport/2025/aib-group-plc-afr-report-2025.pdf" },
  { organisation:"Bank of Ireland", market:"Ireland & UK", sector:"Banking", focus:"Customer growth, digital engagement, efficiency and returns across an integrated group", evidence:"Current results and strategy materials emphasise stronger relationships and disciplined transformation.", maturity:"Executing", irishReadAcross:"Sets the domestic benchmark for bancassurance and cross-group customer value.", sourceUrl:"https://investorrelations.bankofireland.com/" },
  { organisation:"PTSB", market:"Ireland", sector:"Banking", focus:"Digital-led growth, customer experience and scaled competition in personal and business banking", evidence:"Public strategy and results position investment in digital capability alongside franchise growth.", maturity:"Scaling", irishReadAcross:"Important challenger signal for switching, mortgages and SME propositions.", sourceUrl:"https://www.ptsb.ie/about-us/investor-relations/" },
  { organisation:"Irish Life", market:"Ireland", sector:"Wealth & pensions", focus:"Integrated health, protection, pensions and wealth propositions with digital and adviser enablement", evidence:"The group proposition spans employer, adviser and direct customer relationships.", maturity:"Scaling", irishReadAcross:"Primary domestic comparator for integrated financial wellbeing and distribution.", sourceUrl:"https://www.irishlifegroup.ie/" },
  { organisation:"Vhi", market:"Ireland", sector:"Insurance", focus:"Member health outcomes, digital care and an expanded healthcare-services ecosystem", evidence:"Services and corporate material increasingly connect insurance with access to care.", maturity:"Scaling", irishReadAcross:"Signals movement from claims funding towards managed health outcomes.", sourceUrl:"https://www1.vhi.ie/about" },
  { organisation:"Laya Healthcare", market:"Ireland", sector:"Insurance", focus:"Accessible healthcare, member experience and digital health services", evidence:"Customer propositions combine cover with clinical and digital support services.", maturity:"Scaling", irishReadAcross:"Raises expectations for service accessibility and preventative support.", sourceUrl:"https://www.layahealthcare.ie/aboutus/" },
  { organisation:"FBD", market:"Ireland", sector:"Insurance", focus:"Profitable domestic growth, pricing discipline and digitally supported customer service", evidence:"Investor materials retain a focused Irish general-insurance strategy.", maturity:"Executing", irishReadAcross:"Key signal for motor, farm, SME and household insurance economics.", sourceUrl:"https://www.fbdgroup.com/investor-relations/" },
  { organisation:"Aviva", market:"Ireland & UK", sector:"Insurance", focus:"Capital-light growth, deeper customer relationships and a more integrated insurance, wealth and retirement proposition", evidence:"Annual reporting emphasises customer growth, efficiency and disciplined execution.", maturity:"Scaling", irishReadAcross:"Relevant benchmark for cross-product relationships and UK-to-Ireland capability transfer.", sourceUrl:"https://www.aviva.com/investors/annual-reports/" },
  { organisation:"Zurich", market:"Ireland & UK", sector:"Insurance", focus:"Protection, commercial insurance and adviser-enabled life and investment propositions", evidence:"Group strategy combines disciplined underwriting with customer and distribution growth.", maturity:"Executing", irishReadAcross:"Major comparator across Irish life, pensions, investments and general insurance.", sourceUrl:"https://www.zurich.com/investor-relations/results-and-reports" },
  { organisation:"AXA", market:"Ireland & UK", sector:"Insurance", focus:"Technical insurance performance, prevention services and simplified customer journeys", evidence:"Strategic materials emphasise organic growth, technical excellence and customer service.", maturity:"Executing", irishReadAcross:"Relevant to claims, prevention and digitally enabled general insurance.", sourceUrl:"https://www.axa.com/en/investor/annual-reports" },
  { organisation:"Allianz", market:"Ireland & UK", sector:"Insurance", focus:"Scalable insurance platforms, productivity and customer-centric digital capability", evidence:"Group reporting connects profitable growth with simplification and technology.", maturity:"Scaling", irishReadAcross:"Provides a multinational benchmark for platform reuse and operating leverage.", sourceUrl:"https://www.allianz.com/en/investor_relations/results-reports/annual-report.html" },
  { organisation:"Lloyds Banking Group", market:"UK", sector:"Banking", focus:"Mobile-first growth, mass affluent relationships, AI value and integrated financial services", evidence:"The 2025 report describes Grow, Focus and Change priorities and quantified live AI delivery.", maturity:"Scaling", irishReadAcross:"Leading indicator for digital servicing, AI economics and ecosystem competition.", sourceUrl:"https://www.lloydsbankinggroup.com/investors/annual-report.html" },
  { organisation:"NatWest Group", market:"UK", sector:"Banking", focus:"Relationship banking, simple digital experiences, data-led growth and disciplined efficiency", evidence:"Public reporting centres on serving customer needs across an increasingly digital franchise.", maturity:"Scaling", irishReadAcross:"Useful benchmark for SME relationships, digital engagement and personalisation.", sourceUrl:"https://www.natwestgroup.com/investors/annual-reports.html" },
  { organisation:"Barclays", market:"UK", sector:"Banking", focus:"Higher-return UK banking, payments and investment-bank execution with cost discipline", evidence:"Strategy materials frame a multi-year plan around returns, simplification and focused investment.", maturity:"Executing", irishReadAcross:"Signals competitive investment in payments, affluent customers and operating efficiency.", sourceUrl:"https://home.barclays/investor-relations/reports-and-events/annual-reports/" },
  { organisation:"HSBC", market:"UK", sector:"Banking", focus:"Simplification around internationally connected customers, wealth and transaction banking", evidence:"Annual reporting describes a more focused organisation built around areas of distinctive advantage.", maturity:"Repositioning", irishReadAcross:"Relevant to internationally active Irish firms, wealth and cross-border payments.", sourceUrl:"https://www.hsbc.com/investors/results-and-announcements/annual-report" },
  { organisation:"Santander UK", market:"UK", sector:"Banking", focus:"Digital simplification, customer franchise economics and group-platform leverage", evidence:"Results materials emphasise transformation, efficiency and sustainable returns.", maturity:"Repositioning", irishReadAcross:"A comparator for platform standardisation and consumer banking economics.", sourceUrl:"https://www.santander.co.uk/about-santander/investor-relations" },
  { organisation:"Nationwide", market:"UK", sector:"Banking", focus:"Member value, service differentiation and integration of the Virgin Money franchise", evidence:"Corporate reporting emphasises mutual value alongside integration and modernisation.", maturity:"Repositioning", irishReadAcross:"Tests whether service and member-value positioning can outperform price-led competition.", sourceUrl:"https://www.nationwide.co.uk/about-us/investor-relations/results-and-accounts/" },
  { organisation:"Standard Chartered", market:"UK", sector:"Banking", focus:"Cross-border corporate banking and affluent wealth in high-growth international corridors", evidence:"Strategy centres on network differentiation, wealth and returns.", maturity:"Executing", irishReadAcross:"Relevant benchmark for Irish exporters and internationally mobile affluent customers.", sourceUrl:"https://www.sc.com/en/investors/financial-results/" },
  { organisation:"Legal & General", market:"UK", sector:"Wealth & pensions", focus:"Institutional retirement, asset management and retirement solutions", evidence:"Strategic reporting prioritises scalable retirement and investment capabilities.", maturity:"Repositioning", irishReadAcross:"Leading indicator for pension consolidation, retirement income and institutional capital.", sourceUrl:"https://group.legalandgeneral.com/en/investors/results-reports-and-presentations" },
  { organisation:"Phoenix Group", market:"UK", sector:"Wealth & pensions", focus:"Pensions and savings growth, retirement solutions and cash generation", evidence:"Investor reporting positions the group as a scaled long-term savings and retirement business.", maturity:"Scaling", irishReadAcross:"Relevant to pension consolidation, customer migration and retirement propositions.", sourceUrl:"https://www.thephoenixgroup.com/investors/results-reports-and-events/annual-reports" },
  { organisation:"M&G", market:"UK", sector:"Wealth & pensions", focus:"Asset management, wealth distribution and capital-efficient growth", evidence:"Strategy materials connect investment capabilities with broader distribution and efficiency.", maturity:"Executing", irishReadAcross:"Comparator for adviser platforms, investment manufacturing and wealth economics.", sourceUrl:"https://www.mandg.com/investors/annual-report" },
  { organisation:"Admiral", market:"UK", sector:"Insurance", focus:"Data-led motor insurance, disciplined pricing and selective diversification", evidence:"Reporting retains strong emphasis on customer, pricing and analytical capability.", maturity:"Executing", irishReadAcross:"A leading benchmark for data-driven underwriting and direct distribution.", sourceUrl:"https://admiralgroup.co.uk/investor-relations/results-reports-and-presentations" },
  { organisation:"Revolut", market:"Ireland & UK", sector:"Payments", focus:"Primary-account relationships, broader financial products and international scale", evidence:"Product expansion continues beyond payments into a wider consumer finance relationship.", maturity:"Scaling", irishReadAcross:"Raises the competitive baseline for speed, product breadth and mobile engagement.", sourceUrl:"https://www.revolut.com/news/" },
  { organisation:"Wise", market:"UK", sector:"Payments", focus:"Low-cost cross-border infrastructure for consumers, businesses and banks", evidence:"Reporting emphasises direct customer growth and adoption of Wise Platform by institutions.", maturity:"Scaling", irishReadAcross:"Relevant to transparent international payments and embedded infrastructure.", sourceUrl:"https://wise.com/owners/" },
];
