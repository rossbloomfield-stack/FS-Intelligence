import { describe, expect, it } from "vitest";
import { scoreMateriality } from "@/schemas/intelligence";

const rationale = "The evidence indicates a material and time-sensitive Irish market impact.";

describe("scoreMateriality", () => {
  it("calculates the total deterministically", () => {
    const result = scoreMateriality({
      strategicSignificance: 5,
      customerImpact: 4,
      commercialImpact: 3,
      regulatoryRiskImpact: 2,
      irelandCompetitiveRelevance: 5,
      immediacy: 3,
      rationale,
    });

    expect(result.total).toBe(22);
    expect(result.classification).toBe("critical");
  });

  it.each([
    [[2, 2, 2, 2, 2, 1], "exclude"],
    [[2, 2, 2, 2, 2, 2], "watchlist"],
    [[3, 3, 3, 3, 3, 2], "significant"],
    [[4, 4, 4, 4, 3, 3], "critical"],
  ] as const)("classifies the boundary scores as %s", (scores, classification) => {
    const result = scoreMateriality({
      strategicSignificance: scores[0],
      customerImpact: scores[1],
      commercialImpact: scores[2],
      regulatoryRiskImpact: scores[3],
      irelandCompetitiveRelevance: scores[4],
      immediacy: scores[5],
      rationale,
    });

    expect(result.classification).toBe(classification);
  });
});
