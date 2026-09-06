import type { ResolvedEntity } from "@/schemas/signal-intelligence";

export type IntelligenceEntityCandidate = {
  id: string;
  canonicalName: string;
  aliases: string[];
  geography: string | null;
};

export function resolveObservationEntity(rawText: string | null, candidates: IntelligenceEntityCandidate[], threshold = 0.82): ResolvedEntity {
  if (!rawText) return { id: null, canonicalName: null, rawText: null, confidence: 0, ambiguous: false };
  const query = normalise(rawText);
  const ranked = candidates.map((candidate) => ({
    candidate,
    score: Math.max(...[candidate.canonicalName, ...candidate.aliases].map((alias) => similarity(query, normalise(alias)))),
  })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score < threshold) return { id: null, canonicalName: null, rawText, confidence: best?.score ?? 0, ambiguous: false };
  if (second && best.score - second.score < 0.08) return { id: null, canonicalName: null, rawText, confidence: best.score, ambiguous: true };
  return { id: best.candidate.id, canonicalName: best.candidate.canonicalName, rawText, confidence: best.score, ambiguous: false };
}

function similarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.length >= 4 && (left.includes(right) || right.includes(left))) return 0.9;
  const a = new Set(left.split(" ").filter(Boolean));
  const b = new Set(right.split(" ").filter(Boolean));
  const intersection = [...a].filter((value) => b.has(value)).length;
  return intersection / Math.max(1, new Set([...a, ...b]).size);
}
function normalise(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
