export type ObservationFingerprint = {
  entityId: string | null;
  observationType: string;
  eventType: string | null;
  theme: string | null;
  product: string | null;
  eventDate: string | null;
  observationText: string;
};

export function observationSimilarity(left: ObservationFingerprint, right: ObservationFingerprint) {
  if (left.entityId && right.entityId && left.entityId !== right.entityId) return 0;
  let score = left.entityId && left.entityId === right.entityId ? 0.28 : 0.08;
  if (left.observationType === right.observationType) score += 0.22;
  if (left.eventType && left.eventType === right.eventType) score += 0.08;
  if (left.theme && normalise(left.theme) === normalise(right.theme ?? "")) score += 0.16;
  if (left.product && normalise(left.product) === normalise(right.product ?? "")) score += 0.1;
  score += 0.12 * tokenSimilarity(left.observationText, right.observationText);
  if (nearbyDates(left.eventDate, right.eventDate, 45)) score += 0.12;
  return Math.min(1, score);
}

export function sourceFamilyKey(input: { canonicalUrl: string; publisher: string; title: string }) {
  const host = safeHost(input.canonicalUrl);
  const title = normalise(input.title).replace(/\b(press release|news|announcement|update)\b/g, "").trim();
  return `${host}:${title.slice(0, 120)}`;
}

export function areDirectionsContradictory(left: string | null, right: string | null) {
  const opposite: Record<string, string[]> = {
    increasing: ["decreasing", "contracting"], expanding: ["decreasing", "contracting"],
    decreasing: ["increasing", "expanding", "new"], contracting: ["increasing", "expanding", "new"],
  };
  return Boolean(left && right && opposite[left]?.includes(right));
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(normalise(left).split(" ").filter((item) => item.length > 2));
  const b = new Set(normalise(right).split(" ").filter((item) => item.length > 2));
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / Math.max(1, new Set([...a, ...b]).size);
}
function nearbyDates(left: string | null, right: string | null, days: number) {
  if (!left || !right) return false;
  return Math.abs(Date.parse(left) - Date.parse(right)) <= days * 86_400_000;
}
function normalise(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function safeHost(value: string) { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return "unknown"; } }
