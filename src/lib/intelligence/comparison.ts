import type { TrendDirection } from "@/schemas/executive";

export type ComparableSignal = {
  id: string;
  score: number;
  classification?: string;
  evidenceCount?: number;
  maturity?: number;
};

export function compareSignals(current: ComparableSignal, previous?: ComparableSignal): { trend: TrendDirection; explanation: string } {
  if (!previous) return { trend: "new", explanation: "No matching signal was published in the previous reporting period." };
  const delta = current.score - previous.score;
  if (delta > 0) return { trend: "up", explanation: `Board Signal Score increased by ${delta}.` };
  if (delta < 0) return { trend: "down", explanation: `Board Signal Score decreased by ${Math.abs(delta)}.` };
  const evidenceDelta = (current.evidenceCount ?? 0) - (previous.evidenceCount ?? 0);
  if (evidenceDelta > 0) return { trend: "up", explanation: "The score is unchanged, but supporting evidence increased." };
  if (evidenceDelta < 0) return { trend: "down", explanation: "The score is unchanged, but supporting evidence weakened." };
  return { trend: "unchanged", explanation: "No material structured change was identified." };
}

export function resolvedSignals(current: ComparableSignal[], previous: ComparableSignal[]) {
  const currentIds = new Set(current.map((item) => item.id));
  return previous.filter((item) => !currentIds.has(item.id)).map((item) => ({ ...item, trend: "resolved" as const }));
}
