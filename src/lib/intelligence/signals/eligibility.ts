const highValueTypes = /annual report|interim report|results|strategy|product|pricing|regulat|consultation|guidance|enforcement|careers|job|appointment|partnership|technology|app release/i;
const materialTerms = /launch|invest|acquir|merg|appoint|hire|recruit|partner|implement|increase|decrease|growth|target|withdraw|price|fee|require|consult|enforce|artificial intelligence|\bAI\b|digital|customer|platform|advice/i;
const boilerplate = /cookie policy|privacy preference|all rights reserved|accept cookies|footer navigation|terms of use/i;

export type EligibilityInput = {
  title: string;
  sourceClass?: string | null;
  contentType?: string | null;
  publicationDate?: string | null;
  text: string;
  sourceAuthority: number;
  changeClassification?: "none" | "cosmetic" | "minor" | "material" | "unknown";
};

export function assessSignalEligibility(input: EligibilityInput, threshold = 0.5) {
  const meaningfulLength = Math.min(1, input.text.trim().length / 1_000);
  const documentPriority = highValueTypes.test(`${input.title} ${input.sourceClass ?? ""} ${input.contentType ?? ""}`) ? 1 : 0.35;
  const termPriority = materialTerms.test(input.text) ? 1 : 0.1;
  const boilerplatePenalty = boilerplate.test(input.text) ? 0.45 : 0;
  const changeAdjustment = input.changeClassification === "material" ? 0.15 : input.changeClassification === "cosmetic" || input.changeClassification === "none" ? -0.5 : 0;
  const score = clamp(0.22 * meaningfulLength + 0.24 * documentPriority + 0.24 * termPriority + 0.3 * input.sourceAuthority + changeAdjustment - boilerplatePenalty);
  const reasons = [
    documentPriority === 1 ? "high-value document class" : "general document class",
    termPriority === 1 ? "material market language present" : "limited material market language",
    `source authority ${input.sourceAuthority.toFixed(2)}`,
  ];
  if (boilerplatePenalty) reasons.push("boilerplate detected");
  if (input.changeClassification) reasons.push(`${input.changeClassification} change`);
  return { eligible: score >= threshold, score, reasons };
}

export function assessChangeSignificance(previousText: string | null, currentText: string) {
  if (!previousText) return "unknown" as const;
  const normalise = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
  const previous = normalise(previousText);
  const current = normalise(currentText);
  if (previous === current) return "none" as const;
  const previousTokens = new Set(previous.split(/\W+/).filter(Boolean));
  const currentTokens = new Set(current.split(/\W+/).filter(Boolean));
  const overlap = [...previousTokens].filter((token) => currentTokens.has(token)).length;
  const similarity = overlap / Math.max(1, new Set([...previousTokens, ...currentTokens]).size);
  if (similarity > 0.96) return "cosmetic" as const;
  if (similarity > 0.82 && !materialTerms.test(currentText)) return "minor" as const;
  return "material" as const;
}

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
