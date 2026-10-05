export type BrandProfile = {
  id: "irish_life" | "unio";
  version: string;
  name: string;
  approvedDomains: string[];
  market: "Ireland";
  audiences: string[];
  objectives: string[];
  serviceDescriptions: string[];
  voiceRules: string[];
  negativeRules: string[];
  visual: { logoAssets: string[]; colours: string[]; fonts: string[]; imageStyle: string[] };
  approvedClaims: string[];
  unresolvedClaims: string[];
  sourcePages: Array<{ url: string; accessedAt: string; fieldsSupported: string[] }>;
};

// Versioned public-page-derived voice profiles. Facts and claims remain source-linked;
// unknown visual tokens are intentionally left blank rather than guessed.
export const brandProfiles: Record<BrandProfile["id"], BrandProfile> = {
  irish_life: {
    id: "irish_life", version: "2026-10-05.1", name: "Irish Life", approvedDomains: ["irishlife.ie"], market: "Ireland",
    audiences: ["individuals and families planning for retirement, protection, health and financial wellbeing"],
    objectives: ["help people understand options and take practical next steps"],
    serviceDescriptions: ["pensions and retirement planning", "financial advice", "life insurance", "health and financial planning"],
    voiceRules: ["warm, clear and encouraging", "use everyday Irish English", "explain financial terms in plain language", "focus on the customer's next useful step"],
    negativeRules: ["avoid guarantees or assured financial outcomes", "do not describe tied/intermediary services as independent", "do not invent fees, adviser details or eligibility"],
    visual: { logoAssets: [], colours: [], fonts: [], imageStyle: ["use authentic, approved customer and adviser photography only; do not invent named advisers or offices"] },
    approvedClaims: [], unresolvedClaims: ["independence status must be checked against the exact service disclosure before use"],
    sourcePages: [
      { url: "https://www.irishlife.ie/", accessedAt: "2026-10-05", fieldsSupported: ["approvedDomains", "serviceDescriptions", "voiceRules"] },
      { url: "https://www.irishlife.ie/get-pensions-advice/", accessedAt: "2026-10-05", fieldsSupported: ["audiences", "serviceDescriptions", "voiceRules"] },
      { url: "https://www.irishlife.ie/plan-your-retirement/", accessedAt: "2026-10-05", fieldsSupported: ["serviceDescriptions", "voiceRules", "negativeRules"] },
      { url: "https://www.irishlife.ie/contact-us/", accessedAt: "2026-10-05", fieldsSupported: ["service boundaries", "contact-flow pattern", "regulatory disclosure"] },
      { url: "https://www.irishlife.ie/buy-a-new-plan/", accessedAt: "2026-10-05", fieldsSupported: ["advice enquiry journey", "service terminology", "tied/intermediary disclosure"] },
    ],
  },
  unio: {
    id: "unio", version: "2026-10-05.1", name: "Unio", approvedDomains: ["unio.ie"], market: "Ireland",
    audiences: ["individuals, families, business owners and employers seeking wealth, financial planning, pension or employee-benefit support"],
    objectives: ["make complex wealth and retirement decisions feel clearer and personal"],
    serviceDescriptions: ["wealth management", "financial planning", "pensions and retirement", "investments", "employee benefits"],
    voiceRules: ["confident but human", "future-focused and practical", "talk about the customer's goals and circumstances", "avoid jargon and pressure"],
    negativeRules: ["do not claim every service is independent without service-level evidence", "do not invent returns, fees, adviser identities or guarantees", "do not transfer Irish Life claims or visual tokens into Unio content"],
    visual: { logoAssets: [], colours: [], fonts: [], imageStyle: ["use only approved Unio assets; visual brand tokens still require review"] },
    approvedClaims: ["Unio Financial Services Ltd, trading as Unio, Unio Employee Benefits and Unio Wealth Management, is regulated by the Central Bank of Ireland"],
    unresolvedClaims: ["firm-wide or service-specific independent-advice status requires current disclosure verification"],
    sourcePages: [
      { url: "https://www.unio.ie/", accessedAt: "2026-10-05", fieldsSupported: ["approvedDomains", "serviceDescriptions", "audiences", "voiceRules"] },
      { url: "https://www.unio.ie/wealth", accessedAt: "2026-10-05", fieldsSupported: ["serviceDescriptions", "voiceRules"] },
      { url: "https://www.unio.ie/pensions", accessedAt: "2026-10-05", fieldsSupported: ["serviceDescriptions", "audiences", "voiceRules"] },
      { url: "https://www.unio.ie/about/team", accessedAt: "2026-10-05", fieldsSupported: ["team page exists; do not infer advisers from profile without retrieval"] },
      { url: "https://www.unio.ie/contact", accessedAt: "2026-10-05", fieldsSupported: ["contact journey", "office presence; do not imply a specific adviser is available"] },
      { url: "https://www.unio.ie/about", accessedAt: "2026-10-05", fieldsSupported: ["brand principles", "tone of voice", "regulatory disclosure"] },
    ],
  },
};
