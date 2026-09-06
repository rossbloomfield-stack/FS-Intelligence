import { createHash } from "node:crypto";
import type { ExtractedObservation } from "@/schemas/signal-intelligence";

export type EvidencePassageInput = {
  chunkId: number;
  content: string;
  sectionLabel: string | null;
  pageNumber: number | null;
};

export function anchorAndValidateObservations(observations: ExtractedObservation[], passages: EvidencePassageInput[]) {
  const accepted: Array<ExtractedObservation & { chunkId: number; sectionLabel: string | null; pageNumber: number | null; stableEvidenceHash: string }> = [];
  const rejected: Array<{ observation: ExtractedObservation; reason: string }> = [];
  for (const observation of observations) {
    const matches = passages.filter((passage) => passage.content.includes(observation.evidenceText));
    if (matches.length !== 1) {
      rejected.push({ observation, reason: matches.length ? "Evidence anchor is ambiguous" : "Evidence text is not present in a supplied passage" });
      continue;
    }
    const passage = matches[0];
    const actualStart = passage.content.indexOf(observation.evidenceText);
    const actualEnd = actualStart + observation.evidenceText.length;
    if (observation.evidenceStart !== null && observation.evidenceStart !== actualStart) {
      rejected.push({ observation, reason: "Evidence start offset does not match source passage" });
      continue;
    }
    if (observation.evidenceEnd !== null && observation.evidenceEnd !== actualEnd) {
      rejected.push({ observation, reason: "Evidence end offset does not match source passage" });
      continue;
    }
    accepted.push({ ...observation, evidenceStart: actualStart, evidenceEnd: actualEnd, chunkId: passage.chunkId, sectionLabel: passage.sectionLabel, pageNumber: passage.pageNumber, stableEvidenceHash: createHash("sha256").update(`${passage.chunkId}:${observation.evidenceText}`).digest("hex") });
  }
  return { accepted, rejected };
}
