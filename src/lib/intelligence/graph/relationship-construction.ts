import { createHash } from "node:crypto";
import type {
  RelationshipCandidate,
  RelationshipScore,
  RelationshipScoreInput,
} from "@/schemas/knowledge-graph";

export type ObservationForRelationship = {
  observationType: string;
  observationText: string;
  theme: string | null;
  capability: string | null;
  product: string | null;
  market: string | null;
  direction: string | null;
  eventDate: string | null;
};

const productEvents = new Set([
  "product_launch", "product_change", "feature_launch", "feature_change",
  "product_withdrawal", "proposition_change", "digital_service_change", "customer_journey_change",
]);
const technologyEvents = new Set([
  "technology_adoption", "platform_change", "ai_adoption", "data_capability",
  "automation", "implementation", "technology_relationship",
]);
const capabilityBuildingEvents = new Set([
  "hiring_activity", "capability_hiring", "team_expansion", "careers_change",
  "transformation_programme",
]);

export function deriveRelationshipCandidates(
  observation: ObservationForRelationship,
): RelationshipCandidate[] {
  const candidates: RelationshipCandidate[] = [];
  const subject = observation.capability ?? observation.theme;

  if (observation.product && productEvents.has(observation.observationType)) {
    candidates.push(candidate(
      observation.observationType === "product_withdrawal" ? "WITHDREW" : "OFFERS",
      "product",
      observation.product,
      "explicit",
      observation,
    ));
  }

  if (subject && capabilityBuildingEvents.has(observation.observationType)) {
    candidates.push(candidate(
      "DEVELOPING_CAPABILITY",
      "capability",
      subject,
      "inferred",
      observation,
    ));
  } else if (subject && technologyEvents.has(observation.observationType)) {
    candidates.push(candidate(
      observation.observationType === "implementation" ? "HAS_CAPABILITY" : "BUILDING_CAPABILITY",
      "capability",
      subject,
      observation.observationType === "implementation" ? "explicit" : "inferred",
      observation,
    ));
  } else if (subject && ["investment_priority", "technology_investment"].includes(observation.observationType)) {
    candidates.push(candidate("INVESTING_IN", "strategic_theme", subject, "explicit", observation));
  } else if (subject && ["strategic_priority", "strategic_change"].includes(observation.observationType)) {
    candidates.push(candidate("PRIORITISES", "strategic_theme", subject, "explicit", observation));
  } else if (subject && productEvents.has(observation.observationType) && !observation.product) {
    candidates.push(candidate("LAUNCHED_CAPABILITY", "capability", subject, "explicit", observation));
  }

  if (observation.market && observation.observationType === "market_entry") {
    candidates.push(candidate("ENTERED_MARKET", "market", observation.market, "explicit", observation));
  }
  if (observation.market && observation.observationType === "market_exit") {
    candidates.push(candidate("EXITED_MARKET", "market", observation.market, "explicit", observation));
  }

  return uniqueCandidates(candidates);
}

function candidate(
  relationshipType: RelationshipCandidate["relationshipType"],
  targetEntityType: RelationshipCandidate["targetEntityType"],
  targetEntityName: string,
  basis: RelationshipCandidate["basis"],
  observation: ObservationForRelationship,
): RelationshipCandidate {
  return {
    relationshipType,
    targetEntityType,
    targetEntityName: titleCase(targetEntityName),
    basis,
    validFrom: observation.eventDate,
    validTo: null,
    rationale: observation.observationText,
  };
}

function uniqueCandidates(candidates: RelationshipCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.relationshipType}:${item.targetEntityType}:${normaliseEntityKey(item.targetEntityName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function relationshipStableKey(
  sourceEntityId: string,
  relationshipType: string,
  targetEntityId: string,
) {
  return `r4:${createHash("sha256")
    .update(`${sourceEntityId}:${relationshipType}:${targetEntityId}`)
    .digest("hex")}`;
}

export function entityCanonicalKey(entityType: string, canonicalName: string) {
  return `${entityType}:${normaliseEntityKey(canonicalName)}`;
}

export function normaliseEntityKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function scoreRelationship(input: RelationshipScoreInput): RelationshipScore {
  const components = {
    evidenceDirectness: clamp(input.evidenceDirectness),
    sourceAuthority: clamp(input.sourceAuthority),
    extractionConfidence: clamp(input.extractionConfidence),
    entityConfidence: clamp(input.entityConfidence),
    corroboration: clamp(input.independentSourceCount / 4),
    basisStrength: input.basis === "explicit" ? 1 : 0.62,
    contradictionPenalty: clamp(input.contradictionCount * 0.18),
  };
  const positive =
    components.evidenceDirectness * 0.27 +
    components.sourceAuthority * 0.2 +
    components.extractionConfidence * 0.16 +
    components.entityConfidence * 0.15 +
    components.corroboration * 0.1 +
    components.basisStrength * 0.12;
  return {
    confidence: clamp(positive - components.contradictionPenalty),
    components,
  };
}

export function relationshipStatus(
  basis: "explicit" | "inferred",
  confidence: number,
): "current" | "emerging" | "uncertain" {
  if (confidence < 0.58) return "uncertain";
  if (basis === "inferred" || confidence < 0.74) return "emerging";
  return "current";
}

export function explainRelationshipScore(score: RelationshipScore, basis: string) {
  const strongest = Object.entries(score.components)
    .filter(([key]) => key !== "contradictionPenalty")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());
  return `${basis === "explicit" ? "Explicit" : "Inferred"} relationship; strongest support: ${strongest.join(", ")}.`;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
