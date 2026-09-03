// @vitest-environment node

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { r1RetrievalQuestions } from "../evals/r1-retrieval-questions";
import { attachAliases, resolveOrganisations } from "@/lib/intelligence/entity-resolver";
import { planIntelligenceQuery } from "@/lib/intelligence/query-planner";

vi.mock("server-only", () => ({}));

const runLive = process.env.RUN_R1_LIVE_EVAL === "true";

describe.skipIf(!runLive)("R1 live production-corpus evaluation", () => {
  it("compares all R1 questions with the previous direct lexical path", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url, "NEXT_PUBLIC_SUPABASE_URL is required").toBeTruthy();
    expect(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is required").toBeTruthy();
    expect(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required").toBeTruthy();
    const db = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [{ data: organisationRows, error: organisationError }, { data: aliasRows, error: aliasError }] =
      await Promise.all([
        db.from("organisations").select("id,slug,name,sector,jurisdiction").eq("active", true),
        db.from("organisation_aliases").select("organisation_id,alias"),
      ]);
    expect(organisationError).toBeNull();
    expect(aliasError).toBeNull();
    const catalogue = attachAliases(organisationRows ?? [], aliasRows ?? []);
    const { retrieveIntelligenceEvidence } = await import(
      "@/lib/intelligence/retrieval-orchestrator"
    );

    const evaluate = async (item: (typeof r1RetrievalQuestions)[number]) => {
      const plan = planIntelligenceQuery(
        item.question,
        resolveOrganisations(item.question, catalogue),
      );
      const baseline = await db.rpc("search_approved_source_chunks", {
        search_query: item.question,
        result_limit: 5,
      });
      expect(baseline.error).toBeNull();
      const result = await retrieveIntelligenceEvidence({
        db: db as never,
        question: item.question,
        plan,
        domainAvailability: {},
        now: new Date("2026-09-03T22:00:00Z"),
      });
      const baselineRows = (baseline.data ?? []) as Array<{ evidence_source_id: string }>;
      return {
        id: item.id,
        category: item.category,
        baselineUniqueDocuments: new Set(
          baselineRows.map((row) => row.evidence_source_id),
        ).size,
        r1SelectedEvidence: result.metrics.selectedEvidenceCount,
        r1UniqueDocuments: result.metrics.uniqueDocumentCount,
        r1UniqueDomains: result.metrics.uniqueDomainCount,
        maximumDocumentConcentration: result.metrics.maxDocumentConcentration,
        coverage: result.metrics.coverage,
        citationIntegrity: result.references.every((reference) =>
          result.diagnostics.some((candidate) => candidate.sourceId === reference.sourceId),
        ),
        semanticStatus: result.semanticStatus,
        retrievalDurationMs: result.retrievalDurationMs,
      };
    };

    const records: Array<Awaited<ReturnType<typeof evaluate>>> = [];
    records.push(await evaluate(r1RetrievalQuestions[0]));
    for (let offset = 1; offset < r1RetrievalQuestions.length; offset += 4) {
      records.push(
        ...(await Promise.all(r1RetrievalQuestions.slice(offset, offset + 4).map(evaluate))),
      );
    }
    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const summary = {
      questionCount: records.length,
      baselineAverageUniqueDocuments: average(
        records.map((record) => record.baselineUniqueDocuments),
      ),
      r1AverageSelectedEvidence: average(records.map((record) => record.r1SelectedEvidence)),
      r1AverageUniqueDocuments: average(records.map((record) => record.r1UniqueDocuments)),
      r1AverageUniqueDomains: average(records.map((record) => record.r1UniqueDomains)),
      r1AverageMaximumDocumentConcentration: average(
        records.map((record) => record.maximumDocumentConcentration),
      ),
      citationIntegrityRate:
        records.filter((record) => record.citationIntegrity).length / records.length,
      semanticAvailabilityRate:
        records.filter((record) => record.semanticStatus === "available").length /
        records.length,
      averageRetrievalDurationMs: average(records.map((record) => record.retrievalDurationMs)),
      coverage: Object.fromEntries(
        ["strong", "adequate", "limited", "insufficient"].map((coverage) => [
          coverage,
          records.filter((record) => record.coverage === coverage).length,
        ]),
      ),
    };
    console.info("R1_LIVE_EVALUATION", JSON.stringify({ summary, records }));
    expect(records).toHaveLength(r1RetrievalQuestions.length);
    expect(summary.citationIntegrityRate).toBe(1);
    expect(summary.semanticAvailabilityRate).toBe(1);
    expect(summary.r1AverageUniqueDocuments).toBeGreaterThanOrEqual(
      summary.baselineAverageUniqueDocuments,
    );
  }, 180_000);
});
