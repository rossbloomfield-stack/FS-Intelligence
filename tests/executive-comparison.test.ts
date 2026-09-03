import { describe, expect, it } from "vitest";
import { compareSignals, resolvedSignals } from "@/lib/intelligence/comparison";
import { boardSignalSchema } from "@/schemas/executive";

describe("executive signal comparison", () => {
  it("marks a signal new when no prior report exists", () => expect(compareSignals({id:"ai",score:4})).toEqual({trend:"new",explanation:"No matching signal was published in the previous reporting period."}));
  it("uses deterministic score movement", () => expect(compareSignals({id:"ai",score:5,evidenceCount:2},{id:"ai",score:4,evidenceCount:5}).trend).toBe("up"));
  it("uses evidence movement when the score is unchanged", () => expect(compareSignals({id:"ai",score:4,evidenceCount:3},{id:"ai",score:4,evidenceCount:2}).trend).toBe("up"));
  it("identifies resolved canonical signals", () => expect(resolvedSignals([], [{id:"old",score:3}])[0].trend).toBe("resolved"));
});

describe("board signal contract", () => {
  it("accepts insufficient evidence and accessible RAG data", () => expect(boardSignalSchema.parse({id:"x",category:"threat",title:"Unknown",summary:"Evidence currently insufficient.",score:1,rag:"grey",trend:"new",evidenceConfidence:"insufficient"}).rag).toBe("grey"));
  it("rejects scores outside the Board Signal range", () => expect(()=>boardSignalSchema.parse({id:"x",category:"threat",title:"X",summary:"Y",score:6,rag:"red",trend:"up",evidenceConfidence:"high"})).toThrow());
});
