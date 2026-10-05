import { describe, expect, it } from "vitest";
import { aiVisibilityScopeSchema, compareVisibilityScopes, normalizeVisibilityRows, parseCsv } from "@/lib/market-research/ai-visibility-import";

const scope = aiVisibilityScopeSchema.parse({ brand: "irish_life", platform: "ChatGPT", market: "Ireland", periodStart: "2026-09-01", periodEnd: "2026-09-30", metricDefinition: "Brand mention share of prompts checked" });

describe("AI visibility exports", () => {
  it("parses BOMs, quoted delimiters, escaped quotes and embedded newlines", () => {
    expect(parseCsv('\uFEFFBrand,Prompt,Notes\r\nIrish Life,"What, if anything?","first line\nsecond line; with ""quotes"""')).toEqual([
      ["Brand", "Prompt", "Notes"],
      ["Irish Life", "What, if anything?", 'first line\nsecond line; with "quotes"'],
    ]);
  });

  it("detects tab-delimited exports and preserves unmatched fields", () => {
    const parsed = normalizeVisibilityRows(parseCsv("Brand\tAI prompt\tResponses checked\tCustom measure\nIrish Life\tFind an adviser\t1,200\tcontext"), scope, "csv");
    expect(parsed.rows[0].brandMention).toBe("Irish Life");
    expect(parsed.rows[0].denominator).toBe(1200);
    expect(parsed.columnMapping.denominator).toBe("Responses checked");
    expect(parsed.rows[0].raw["Custom measure"]).toBe("context");
    expect(parsed.unmatchedColumns).toEqual(["Custom measure"]);
  });

  it("retains empty metrics as unavailable, not zero, and records invalid numeric values", () => {
    const parsed = normalizeVisibilityRows(parseCsv("Brand,Visibility,Denominator\nIrish Life,,20\nIrish Life,unknown,0"), scope, "csv");
    expect(parsed.rows[0].visibilityValue).toBeNull();
    expect(parsed.rows[1].visibilityValue).toBeNull();
    expect(parsed.rows[1].denominator).toBe(0);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.rows[1].raw.Visibility).toBe("unknown");
  });

  it("rejects malformed or empty exports", () => {
    expect(() => parseCsv('Brand,Prompt\nIrish Life,"unclosed')).toThrow("unclosed quoted field");
    expect(() => normalizeVisibilityRows([["Brand"]], scope, "csv")).toThrow("header and at least one data row");
  });

  it("blocks comparison when platform, market, period or metric definition differs", () => {
    const same = { ...scope, brand: "unio" as const };
    expect(compareVisibilityScopes(scope, same)).toEqual({ compatible: true, mismatches: [] });
    const different = { ...same, platform: "Gemini", periodStart: "2026-08-01", metricDefinition: "Citation count" };
    expect(compareVisibilityScopes(scope, different)).toEqual({ compatible: false, mismatches: ["platform", "reporting period", "metric definition"] });
  });
});
