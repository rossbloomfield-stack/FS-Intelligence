import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {z} from "zod";

describe("intelligence chat request contract",()=>{
 const page=readFileSync(join(process.cwd(),"src/app/intelligence/page.tsx"),"utf8");
 const client=readFileSync(join(process.cwd(),"src/components/intelligence-chat/intelligence-chat.tsx"),"utf8");

 it("uses a server-generated UUID as the stable AI SDK chat id",()=>{
  const id=crypto.randomUUID();
  expect(z.string().uuid().safeParse(id).success).toBe(true);
  expect(page).toContain("conversationId={crypto.randomUUID()}");
  expect(client).toContain("useChat<IntelligenceUIMessage>({id:conversationId,transport:chatTransport})");
 });

 it("keeps database failures observable instead of silently discarding errors",()=>{
  const route=readFileSync(join(process.cwd(),"src/app/api/intelligence/chat/route.ts"),"utf8");
  expect(route).toContain("assertSupabaseSuccess(chunkResult,\"search_approved_source_chunks\")");
  expect(route).toContain("X-Request-Id");
 });
});
