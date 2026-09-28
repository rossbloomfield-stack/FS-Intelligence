import { describe, expect, it } from "vitest";
import { buildContextualRetrievalQuestion } from "@/lib/intelligence/conversation-context";

describe("conversation-aware retrieval", () => {
  it("does not contaminate a new substantive company question with prior topics", () => {
    expect(
      buildContextualRetrievalQuestion({
        question: "What is AIB's strategy?",
        priorQuestions: ["What are today's most important market developments?"],
      }),
    ).toBe("What is AIB's strategy?");
  });

  it("uses only the immediately preceding question for a genuine follow-up", () => {
    expect(
      buildContextualRetrievalQuestion({
        question: "Which is stronger in wealth?",
        priorQuestions: [
          "What matters this week?",
          "Compare AIB and Bank of Ireland's digital strategies.",
        ],
      }),
    ).toBe(
      "Compare AIB and Bank of Ireland's digital strategies. Which is stronger in wealth?",
    );
  });

  it("does not prepend history when the current question names its entity", () => {
    expect(
      buildContextualRetrievalQuestion({
        question: "What is AIB's strategy this year?",
        priorQuestions: ["Compare Aviva and Zurich."],
        hasExplicitEntity: true,
      }),
    ).toBe("What is AIB's strategy this year?");
  });
});
