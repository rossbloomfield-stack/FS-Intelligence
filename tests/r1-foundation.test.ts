import { afterEach, describe, expect, it } from "vitest";
import { isApprovedEmail } from "@/lib/auth/access";
import { answerForEvidenceCount } from "@/lib/intelligence/evidence-readiness";

describe("R1 controlled access",()=>{
 const original=process.env.APPROVED_USER_EMAILS;
 afterEach(()=>{if(original===undefined)delete process.env.APPROVED_USER_EMAILS;else process.env.APPROVED_USER_EMAILS=original;});
 it("fails closed when no allowlist is configured",()=>{delete process.env.APPROVED_USER_EMAILS;delete process.env.ADMIN_EMAILS;expect(isApprovedEmail("person@example.com")).toBe(false);});
 it("allows the approved Ross Bloomfield account",()=>{delete process.env.APPROVED_USER_EMAILS;expect(isApprovedEmail("rossbloomfield@icloud.com")).toBe(true);});
 it("matches approved addresses case-insensitively",()=>{process.env.APPROVED_USER_EMAILS="masses_bonds_0l@icloud.com";expect(isApprovedEmail("MASSES_BONDS_0L@ICLOUD.COM")).toBe(true);});
});
describe("R1 evidence gate",()=>{
 it("refuses to speculate when the corpus is empty",()=>{expect(answerForEvidenceCount(0)).toContain("Evidence currently insufficient");expect(answerForEvidenceCount(0)).toContain("not generated a speculative answer");});
 it("does not imply synthesis is enabled",()=>{expect(answerForEvidenceCount(3)).toContain("synthesis is not enabled");});
});
