import { describe, expect, it } from "vitest";
import { brandProfiles } from "@/lib/market-research/brand-profiles";

describe("versioned market-research brand profiles", () => {
  it("keeps Irish Life and Unio domains, voice rules and profile versions separate", () => {
    expect(brandProfiles.irish_life.approvedDomains).toEqual(["irishlife.ie"]);
    expect(brandProfiles.unio.approvedDomains).toEqual(["unio.ie"]);
    expect(brandProfiles.irish_life.version).toBeTruthy();
    expect(brandProfiles.unio.version).toBeTruthy();
    expect(brandProfiles.irish_life.negativeRules.join(" ")).toMatch(/independent/i);
    expect(brandProfiles.unio.negativeRules.join(" ")).toMatch(/Irish Life/i);
  });

  it("does not invent visual tokens or approved claims where the source profile has none", () => {
    expect(brandProfiles.irish_life.visual.colours).toEqual([]);
    expect(brandProfiles.irish_life.visual.logoAssets).toEqual([]);
    expect(brandProfiles.irish_life.approvedClaims).toEqual([]);
    expect(brandProfiles.irish_life.sourcePages.length).toBeGreaterThanOrEqual(3);
    expect(brandProfiles.unio.sourcePages.length).toBeGreaterThanOrEqual(4);
  });
});
