import "server-only";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRetrievalConfig } from "@/lib/intelligence/retrieval-config";

type MissingEmbeddingRow = {
  chunk_id: number;
  title: string;
  section_label: string | null;
  content: string;
};

export async function backfillApprovedEmbeddings(requestedLimit = 40) {
  const config = getRetrievalConfig();
  const limit = Math.min(100, Math.max(1, requestedLimit));
  if (!process.env.OPENAI_API_KEY) {
    return { status: "unavailable" as const, processed: 0, remaining: null };
  }
  if (config.embeddingDimensions !== 1536) {
    throw new Error("R1 semantic retrieval currently requires 1536 dimensions");
  }
  const db = createAdminClient();
  const { data, error } = await db.rpc(
    "get_approved_source_chunks_missing_embedding",
    {
      requested_model: config.embeddingModel,
      requested_dimensions: config.embeddingDimensions,
      result_limit: limit,
    },
  );
  if (error) throw new Error(`Could not load embedding worklist: ${error.message}`);
  const rows = (data ?? []) as MissingEmbeddingRow[];
  if (!rows.length) {
    return { status: "complete" as const, processed: 0, remaining: 0 };
  }
  const result = await embedMany({
    model: openai.embedding(config.embeddingModel),
    values: rows.map((row) =>
      [row.title, row.section_label, row.content].filter(Boolean).join("\n\n"),
    ),
    maxParallelCalls: 2,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(20_000),
    providerOptions: { openai: { dimensions: config.embeddingDimensions } },
  });
  const updates = await Promise.all(
    rows.map((row, index) =>
      db
        .from("source_chunks")
        .update({
          embedding: JSON.stringify(result.embeddings[index]),
          embedding_model: config.embeddingModel,
          embedding_dimensions: config.embeddingDimensions,
        })
        .eq("id", row.chunk_id),
    ),
  );
  const failed = updates.find((update) => update.error);
  if (failed?.error) throw new Error(`Could not persist embedding: ${failed.error.message}`);
  return {
    status: rows.length === limit ? ("partial" as const) : ("complete" as const),
    processed: rows.length,
    remaining: rows.length === limit ? null : 0,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
    tokens: result.usage.tokens,
  };
}
