import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { recoverGraphFailure } from "@/lib/intelligence/graph/fail-soft";
import { sourceRecordSchema, verifiedEventSchema } from "@/schemas/agents";

describe("production intelligence stability", () => {
  it("keeps agent URL fields schema-compatible and validates HTTP(S) after generation", () => {
    const jsonSchema=JSON.stringify(z.toJSONSchema(verifiedEventSchema));
    expect(jsonSchema).not.toContain('"format":"uri"');

    const base={title:"AIB results",publisher:"AIB",sourceType:"company_results",publicationDate:"2026-03-03",primarySource:true,credibilityTier:1,notes:null};
    expect(sourceRecordSchema.safeParse({...base,url:"https://aib.ie/results",canonicalUrl:"http://aib.ie/results"}).success).toBe(true);
    expect(sourceRecordSchema.safeParse({...base,url:"ftp://aib.ie/results",canonicalUrl:"https://aib.ie/results"}).success).toBe(false);
    expect(sourceRecordSchema.safeParse({...base,url:"not a URL",canonicalUrl:"https://aib.ie/results"}).success).toBe(false);
  });

  it("uses a non-recursive private RLS predicate with accepted evidence and admin access", () => {
    const migration=readFileSync(join(process.cwd(),"supabase/migrations/20260928071500_r4_graph_rls_stability.sql"),"utf8");
    expect(migration).toContain("private.can_read_intelligence_relationship");
    expect(migration).toContain("security definer");
    expect(migration).toContain("observation.review_status='accepted'");
    expect(migration).toContain("public.is_admin()");
    expect(migration).toContain("using ((select private.can_read_intelligence_relationship(id)))");
    expect(migration).toContain("using ((select private.can_read_intelligence_relationship(relationship_id)))");
  });

  it("degrades graph enrichment without failing a recognised-company request", () => {
    const graphError=new Error('infinite recursion detected in policy for relation "intelligence_relationship_observations"');
    const onError=vi.fn();

    const graph=recoverGraphFailure(graphError,()=>({entityIds:[],relationships:[],relationshipIds:[],graphPaths:[],durationMs:1}),onError);

    expect(graph).toMatchObject({entityIds:[],relationships:[],relationshipIds:[],graphPaths:[]});
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBe(graphError);
    const retriever=readFileSync(join(process.cwd(),"src/lib/intelligence/graph/retriever.ts"),"utf8");
    const route=readFileSync(join(process.cwd(),"src/app/api/intelligence/chat/route.ts"),"utf8");
    expect(retriever).toContain("recoverGraphFailure(error");
    expect(route).toContain('onError:error=>logRouteError(error,requestId,"graph_retrieval")');
  });
});
