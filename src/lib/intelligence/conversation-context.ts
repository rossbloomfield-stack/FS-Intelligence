import type { IntelligenceQueryIntent } from "@/lib/intelligence/query-planner";

const contextualReference =
  /\b(it|its|they|their|them|those|these|that|this|both|either|former|latter|same|which one|which is|which has)\b/i;

const followUpOpening = /^(and\b|also\b|what about\b|how about\b|why\b|show me\b|go deeper\b)/i;

/**
 * Conversation history is retrieval context only when the current question
 * actually depends on it. Unconditionally concatenating prior questions
 * contaminates entity and lexical retrieval for a new topic.
 */
export function buildContextualRetrievalQuestion({
  question,
  priorQuestions,
  intent,
  hasExplicitEntity = false,
}: {
  question: string;
  priorQuestions: string[];
  intent?: IntelligenceQueryIntent;
  hasExplicitEntity?: boolean;
}) {
  const current = question.trim();
  const previous = priorQuestions.at(-1)?.trim();
  if (!previous) return current;

  const wordCount = current.split(/\s+/).filter(Boolean).length;
  const needsContext =
    !hasExplicitEntity &&
    (intent === "follow_up" ||
      ((contextualReference.test(current) || followUpOpening.test(current)) &&
        wordCount <= 24));

  return needsContext ? `${previous} ${current}` : current;
}
