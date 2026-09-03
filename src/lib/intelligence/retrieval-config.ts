export type RetrievalConfig = {
  semanticCandidateCount: number;
  lexicalCandidateCount: number;
  maximumDecompositionQueries: number;
  rerankCandidateCount: number;
  finalEvidenceCount: number;
  maximumChunksPerDocument: number;
  maximumDocumentsPerDomain: number;
  recencyWeight: number;
  minimumRelevance: number;
  reciprocalRankConstant: number;
  embeddingModel: string;
  embeddingDimensions: number;
};

export const defaultRetrievalConfig: RetrievalConfig = {
  semanticCandidateCount: 40,
  lexicalCandidateCount: 40,
  maximumDecompositionQueries: 4,
  rerankCandidateCount: 80,
  finalEvidenceCount: 14,
  maximumChunksPerDocument: 2,
  maximumDocumentsPerDomain: 4,
  recencyWeight: 0.12,
  minimumRelevance: 0.015,
  reciprocalRankConstant: 60,
  embeddingModel: "text-embedding-3-small",
  embeddingDimensions: 1536,
};

export function getRetrievalConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RetrievalConfig {
  return {
    semanticCandidateCount: integer(
      environment.INTELLIGENCE_SEMANTIC_CANDIDATES,
      defaultRetrievalConfig.semanticCandidateCount,
      10,
      100,
    ),
    lexicalCandidateCount: integer(
      environment.INTELLIGENCE_LEXICAL_CANDIDATES,
      defaultRetrievalConfig.lexicalCandidateCount,
      10,
      100,
    ),
    maximumDecompositionQueries: integer(
      environment.INTELLIGENCE_MAX_DECOMPOSITION_QUERIES,
      defaultRetrievalConfig.maximumDecompositionQueries,
      1,
      6,
    ),
    rerankCandidateCount: integer(
      environment.INTELLIGENCE_RERANK_CANDIDATES,
      defaultRetrievalConfig.rerankCandidateCount,
      20,
      120,
    ),
    finalEvidenceCount: integer(
      environment.INTELLIGENCE_FINAL_EVIDENCE_COUNT,
      defaultRetrievalConfig.finalEvidenceCount,
      6,
      20,
    ),
    maximumChunksPerDocument: integer(
      environment.INTELLIGENCE_MAX_CHUNKS_PER_DOCUMENT,
      defaultRetrievalConfig.maximumChunksPerDocument,
      1,
      4,
    ),
    maximumDocumentsPerDomain: integer(
      environment.INTELLIGENCE_MAX_DOCUMENTS_PER_DOMAIN,
      defaultRetrievalConfig.maximumDocumentsPerDomain,
      2,
      8,
    ),
    recencyWeight: decimal(
      environment.INTELLIGENCE_RECENCY_WEIGHT,
      defaultRetrievalConfig.recencyWeight,
      0,
      0.5,
    ),
    minimumRelevance: decimal(
      environment.INTELLIGENCE_MIN_RELEVANCE,
      defaultRetrievalConfig.minimumRelevance,
      0,
      1,
    ),
    reciprocalRankConstant: integer(
      environment.INTELLIGENCE_RRF_K,
      defaultRetrievalConfig.reciprocalRankConstant,
      10,
      100,
    ),
    embeddingModel:
      environment.INTELLIGENCE_EMBEDDING_MODEL?.trim() ||
      defaultRetrievalConfig.embeddingModel,
    embeddingDimensions: integer(
      environment.INTELLIGENCE_EMBEDDING_DIMENSIONS,
      defaultRetrievalConfig.embeddingDimensions,
      256,
      1536,
    ),
  };
}

function integer(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function decimal(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}
