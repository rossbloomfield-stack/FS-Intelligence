import { z } from "zod";

export const researchIntentSchema = z.enum([
  "content_opportunities",
  "competitor_visibility",
  "website_review",
  "backlink_research",
  "paid_search_research",
  "traffic_audience",
  "ai_visibility",
  "draft_create",
  "artifact_edit",
  "visual_reference",
  "implementation_brief",
  "existing_intelligence",
  "unknown",
]);

export type ResearchIntent = z.infer<typeof researchIntentSchema>;

export const researchRouteSchema = z.object({
  intent: researchIntentSchema,
  useSemrush: z.boolean(),
  requiresResearch: z.boolean(),
  suppliedDataOnly: z.boolean(),
  domain: z.string().nullable(),
  brand: z.enum(["irish_life", "unio"]).nullable(),
  market: z.string(),
  reason: z.string(),
});

export type ResearchRoute = z.infer<typeof researchRouteSchema>;

const semrushIntents = new Set<ResearchIntent>([
  "content_opportunities",
  "competitor_visibility",
  "website_review",
  "backlink_research",
  "paid_search_research",
  "traffic_audience",
  "ai_visibility",
]);

const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+)/i;

/**
 * A conservative, schema-validated first-pass router. It uses groups of intent
 * signals and conversation context, not a single provider keyword. Ambiguous
 * requests stay in the existing intelligence flow rather than spending units.
 */
export function routeResearchIntent({ question, priorQuestions = [], priorDomain = null, priorBrand = null, market = "ie" }: {
  question: string;
  priorQuestions?: string[];
  priorDomain?: string | null;
  priorBrand?: "irish_life" | "unio" | null;
  market?: string;
}): ResearchRoute {
  const text = question.trim();
  const lower = text.toLowerCase();
  const context = priorQuestions.slice(-4).join(" ").toLowerCase();
  const suppliedDataOnly = /\b(only|just)\s+(use|using)\s+(the\s+)?(supplied|provided|uploaded)\s+(data|files?|sources?)\b|\b(use|using)\s+(only|just)\s+(the\s+)?(supplied|provided|uploaded)\s+(data|files?|sources?)\b|\bwithout (web|external) research\b/.test(lower);

  const domainMatch = lower.match(domainPattern);
  const domain = domainMatch?.[1]?.toLowerCase().replace(/^www\./, "") ?? priorDomain;
  const brand = domain?.includes("irishlife") || /\birish life\b/.test(lower)
    ? "irish_life"
    : domain?.includes("unio") || /\bunio\b/.test(lower)
      ? "unio"
      : priorBrand;

  const scores: Array<[ResearchIntent, number]> = [
    ["content_opportunities", score(lower, [
      [/\b(content|topics?|pages?)\b.{0,35}\b(opportunit|write|create|rank|attract|enquir|demand)\w*/i, 3],
      [/\bwhat should .{0,45}\b(write|publish|cover)\b/i, 3],
      [/\b(keyword|search term|search demand|content gap|organic visibility|search visibility)\w*/i, 2],
      [/\b(pension|advice|mortgage|insurance) enquiries\b/i, 1],
    ])],
    ["competitor_visibility", score(lower, [
      [/\b(competitor|competitors|versus|vs\.?|compared with)\b/i, 2],
      [/\b(found|visible|visibility|rank|ranking|search results|outperform)\w*/i, 2],
      [/\b(brand coverage|share of voice|brand mentions)\b/i, 3],
    ])],
    ["website_review", score(lower, [
      [/\b(website|site|landing page|web page)\b/i, 2],
      [/\b(improve|review|audit|fix|conversion|enquiries|enquiries|journey)\w*/i, 2],
      [/\b(advice|adviser|financial adviser)\b/i, 1],
    ])],
    ["backlink_research", score(lower, [[/\b(backlinks?|referring domains?|link gaps?)\b/i, 4]])],
    ["paid_search_research", score(lower, [[/\b(paid search|ppc|paid keywords?|competitor ads|search ads)\b/i, 4]])],
    ["traffic_audience", score(lower, [
      [/\b(traffic|acquisition channels?|audience composition|visits)\b/i, 2],
      [/\bmarket share of traffic\b/i, 2],
    ])],
    ["ai_visibility", score(lower, [
      [/\b(ai visibility|ai overview|ai answer|generative search|chatgpt visibility|brand mentions?)\b/i, 3],
      [/\b(ai|artificial intelligence)\b/i, 1],
      [/\b(brand coverage|citation share|share of voice)\b/i, 2],
    ])],
    ["visual_reference", score(lower, [
      [/\b(visual reference|page concept|mock ?up|show me what .* looks like|design concept)\b/i, 3],
      [/\b(desktop and mobile|page preview)\b/i, 2],
    ])],
    ["artifact_edit", score(lower, [
      [/\b(shorten|rewrite|change|replace|revise|edit|make .* shorter|keep .* copy)\b/i, 2],
      [/\b(that page|the hero|this version|second opportunity|that paragraph|the photograph)\b/i, 2],
    ])],
    ["draft_create", score(lower, [
      [/\b(create|write|draft|build)\b/i, 1],
      [/\b(page|landing page|adviser page|article|content|copy)\b/i, 2],
    ])],
    ["implementation_brief", score(lower, [[/\b(codex|implementation|developer)\b/i, 2], [/\b(brief|specification|build plan)\b/i, 2]])],
  ];

  const explicitEditFollowup = /\b(that page|the second opportunity|this version|the hero|that paragraph)\b/.test(lower)
    && /\b(shorten|change|edit|revise|make|replace)\b/.test(lower);
  let intent = scores.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
  let confidence = scores.sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0;

  if (/\b(ai visibility|ai brand coverage|brand mentions? in ai answers|ai answer citations?)\b/.test(lower)) {
    intent = "ai_visibility";
    confidence = Math.max(confidence, 4);
  }

  if (/\b(?:write|create|draft)\b.{0,55}\b(?:new\s+)?(?:page|landing page|adviser page|article)\b/i.test(lower)) {
    intent = "draft_create";
    confidence = Math.max(confidence, 4);
  }

  if (explicitEditFollowup && priorQuestions.length) {
    intent = /\b(image|photograph|visual|layout|desktop|mobile)\b/.test(lower) ? "visual_reference" : "artifact_edit";
    confidence = 4;
  } else if (intent === "draft_create" && confidence < 3 && /\b(advice|adviser|financial planning|pension)\b/.test(context)) {
    intent = "draft_create";
  } else if (confidence < 2) {
    intent = semrushIntents.has(intent) ? intent : "unknown";
    if (intent === "unknown") {
      intent = /\b(regulation|market|company|strategy|financial services)\b/.test(lower) ? "existing_intelligence" : "unknown";
    }
  }

  const useSemrush = (semrushIntents.has(intent) || intent === "draft_create") && !suppliedDataOnly;
  const requiresResearch = semrushIntents.has(intent) || intent === "draft_create";
  const reason = suppliedDataOnly
    ? "The user restricted this request to supplied evidence."
    : useSemrush
      ? `Intent ${intent} requires search visibility, website, competitor or market data.`
      : intent === "artifact_edit" || intent === "visual_reference"
        ? "The request refers to existing content or a visual and does not need a new provider query."
        : intent === "draft_create"
          ? "A content draft is requested; use relevant research evidence when a suitable brand and scope are available."
          : "The request belongs to existing market-intelligence sources or needs clarification.";

  return researchRouteSchema.parse({
    intent,
    useSemrush,
    requiresResearch,
    suppliedDataOnly,
    domain,
    brand,
    market: /^[a-z]{2}$/i.test(market) ? market.toLowerCase() : "ie",
    reason,
  });
}

function score(text: string, rules: Array<[RegExp, number]>): number {
  return rules.reduce((total, [pattern, points]) => total + (pattern.test(text) ? points : 0), 0);
}
