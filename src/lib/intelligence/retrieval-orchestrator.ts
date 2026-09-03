import "server-only";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import type { createClient } from "@/lib/supabase/server";
import { backfillApprovedEmbeddings } from "@/lib/intelligence/embedding-backfill";
import { decomposeIntelligenceQuery } from "@/lib/intelligence/query-decomposition";
import {
  retrieveHybridFinancialIntelligence,
  type ApprovedSourceChunkRow,
  type DomainAvailability,
  type RetrievalCandidateList,
} from "@/lib/intelligence/retriever";
import {
  getRetrievalConfig,
  type RetrievalConfig,
} from "@/lib/intelligence/retrieval-config";
import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";

type DatabaseClient = Awaited<ReturnType<typeof createClient>>;
export type SemanticStatus = "available" | "unavailable" | "failed";

export async function retrieveIntelligenceEvidence({
  db,
  question,
  plan,
  domainAvailability,
  now = new Date(),
  config = getRetrievalConfig(),
}: {
  db: DatabaseClient;
  question: string;
  plan: IntelligenceQueryPlan;
  domainAvailability: DomainAvailability;
  now?: Date;
  config?: RetrievalConfig;
}) {
  const startedAt = Date.now();
  const subqueries = decomposeIntelligenceQuery(
    question,
    plan,
    config.maximumDecompositionQueries,
  );
  const lexicalResults = await Promise.all(
    subqueries.map(async (subquery): Promise<RetrievalCandidateList> => {
      const result = await db.rpc("search_approved_source_chunks_lexical", {
        search_query: subquery.query,
        result_limit: config.lexicalCandidateCount,
      });
      if (result.error) {
        throw new Error(`Lexical retrieval failed: ${result.error.message}`);
      }
      return {
        channel: "lexical",
        subquery,
        rows: (result.data ?? []) as ApprovedSourceChunkRow[],
      };
    }),
  );

  let semanticStatus: SemanticStatus = "unavailable";
  let semanticResults: RetrievalCandidateList[] = [];
  if (process.env.OPENAI_API_KEY && config.embeddingDimensions === 1536) {
    try {
      const embeddingResult = await embedMany({
        model: openai.embedding(config.embeddingModel),
        values: subqueries.map((item) => item.query),
        maxParallelCalls: 1,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(9_000),
        providerOptions: {
          openai: { dimensions: config.embeddingDimensions },
        },
      });
      semanticResults = await searchSemanticCandidates({
        db,
        subqueries,
        embeddings: embeddingResult.embeddings,
        config,
      });
      if (semanticResults.every((result) => result.rows.length === 0)) {
        const backfill = await backfillApprovedEmbeddings(100);
        if (backfill.processed > 0) {
          semanticResults = await searchSemanticCandidates({
            db,
            subqueries,
            embeddings: embeddingResult.embeddings,
            config,
          });
        }
      }
      semanticStatus = "available";
    } catch (error) {
      semanticStatus = "failed";
      console.warn(
        JSON.stringify({
          level: "warning",
          message: "Semantic retrieval unavailable; lexical retrieval retained",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  const retrieval = retrieveHybridFinancialIntelligence({
    question,
    plan,
    candidateLists: [...lexicalResults, ...semanticResults],
    now,
    domainAvailability,
    config,
  });
  return {
    ...retrieval,
    subqueries,
    config,
    semanticStatus,
    retrievalDurationMs: Date.now() - startedAt,
  };
}

async function searchSemanticCandidates({
  db,
  subqueries,
  embeddings,
  config,
}: {
  db: DatabaseClient;
  subqueries: ReturnType<typeof decomposeIntelligenceQuery>;
  embeddings: number[][];
  config: RetrievalConfig;
}) {
  return Promise.all(
    subqueries.map(async (subquery, index): Promise<RetrievalCandidateList> => {
      const result = await db.rpc("search_approved_source_chunks_semantic", {
        query_embedding: JSON.stringify(embeddings[index]),
        query_embedding_model: config.embeddingModel,
        result_limit: config.semanticCandidateCount,
      });
      if (result.error) {
        throw new Error(`Semantic retrieval failed: ${result.error.message}`);
      }
      return {
        channel: "semantic",
        subquery,
        rows: (result.data ?? []) as ApprovedSourceChunkRow[],
      };
    }),
  );
}
