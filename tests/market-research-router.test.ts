import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeResearchIntent } from "@/lib/market-research/semrush-skill";
import { isReadOnlyCapability, isSemrushResearchCapabilityAllowed } from "@/lib/market-research/semrush-tool-policy";
import { callSemrushReadOnlyTool, discoverSemrushCapabilities } from "@/lib/market-research/semrush-mcp";

describe("market research intent routing", () => {
  it("routes a paraphrased content opportunity request without requiring a provider name", () => {
    const result = routeResearchIntent({ question: "What should Unio write about to win more pension enquiries?" });
    expect(result.intent).toBe("content_opportunities");
    expect(result.useSemrush).toBe(true);
    expect(result.brand).toBe("unio");
    expect(result.market).toBe("ie");
  });

  it("recognises competitor discoverability phrased without SEO terminology", () => {
    const result = routeResearchIntent({ question: "Why are competitors getting found before us?", priorDomain: "irishlife.ie", priorBrand: "irish_life" });
    expect(result.intent).toBe("competitor_visibility");
    expect(result.domain).toBe("irishlife.ie");
    expect(result.useSemrush).toBe(true);
  });

  it("selects search research automatically before a net-new brand page draft", () => {
    const result = routeResearchIntent({ question: "Write a new page to attract financial advice searches for Unio." });
    expect(result.intent).toBe("draft_create");
    expect(result.useSemrush).toBe(true);
    expect(result.brand).toBe("unio");
  });

  it("separates AI-answer visibility from organic visibility intent", () => {
    const result = routeResearchIntent({ question: "How is Irish Life brand coverage doing versus competitors on AI visibility?" });
    expect(result.intent).toBe("ai_visibility");
    expect(result.brand).toBe("irish_life");
  });

  it("does not make an external provider call when the user restricts sources", () => {
    const result = routeResearchIntent({ question: "Find content gaps, but use only the supplied data." });
    expect(result.intent).toBe("content_opportunities");
    expect(result.suppliedDataOnly).toBe(true);
    expect(result.useSemrush).toBe(false);
  });

  it("treats an edit to an existing page as a draft operation, not new research", () => {
    const result = routeResearchIntent({ question: "Shorten the hero and change the photograph, keeping the approved copy elsewhere.", priorQuestions: ["Create a Dublin adviser page for Unio"], priorBrand: "unio" });
    expect(result.intent).toBe("visual_reference");
    expect(result.useSemrush).toBe(false);
    expect(result.brand).toBe("unio");
  });
});

describe("Semrush MCP tool safety", () => {
  it.each([
    ["domain_organic_keywords", "Get organic keywords for a domain", true],
    ["list_projects", "List existing projects", true],
    ["create_project", "Create a project", false],
    ["run_site_audit", "Run a Site Audit campaign", false],
    ["update_campaign", "Update an existing tracking campaign", false],
  ])("classifies %s as read-only=%s", (name, description, readOnly) => {
    expect(isReadOnlyCapability(name, description)).toBe(readOnly);
  });

  it("only exposes known read-only search reports to live chat research", () => {
    expect(isSemrushResearchCapabilityAllowed("keyword_research", true)).toBe(true);
    expect(isSemrushResearchCapabilityAllowed("execute_report", true)).toBe(true);
    expect(isSemrushResearchCapabilityAllowed("site_audit", true)).toBe(false);
    expect(isSemrushResearchCapabilityAllowed("create_project", false)).toBe(false);
    expect(isSemrushResearchCapabilityAllowed("unknown_report", true)).toBe(false);
  });

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("discovers the current stateless MCP capability contract before exposing tools", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "domain_organic_keywords", description: "Get organic keywords for a domain", inputSchema: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"] } }] } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const tools = await discoverSemrushCapabilities("test-key");
    expect(tools.map((tool) => tool.name)).toEqual(["domain_organic_keywords"]);
    expect(tools[0].readOnly).toBe(true);
    const firstRequest = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { method: string; params: { _meta: Record<string, unknown> } };
    expect(firstRequest.method).toBe("server/discover");
    expect(firstRequest.params._meta["io.modelcontextprotocol/protocolVersion"]).toBe("2026-07-28");
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>)["Mcp-Method"]).toBe("server/discover");
  });

  it("validates discovered tool parameters and only calls the discovered read-only tool", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "ok" }] } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const catalog = [{ name: "domain_organic_keywords", description: "Get organic keywords for a domain", inputSchema: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"], additionalProperties: false }, readOnly: true }];
    await expect(callSemrushReadOnlyTool({ apiKey: "test-key", tool: "domain_organic_keywords", input: { unexpected: true }, catalog })).rejects.toThrow("Missing required provider parameter: domain");
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(callSemrushReadOnlyTool({ apiKey: "test-key", tool: "create_project", input: {}, catalog })).rejects.toThrow("not discovered as read-only");
    expect(fetchMock).not.toHaveBeenCalled();
    await callSemrushReadOnlyTool({ apiKey: "test-key", tool: "domain_organic_keywords", input: { domain: "irishlife.ie" }, catalog });
    const call = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { params: { name: string; arguments: { domain: string } } };
    expect(call.params.name).toBe("domain_organic_keywords");
    expect(call.params.arguments.domain).toBe("irishlife.ie");
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>)["Mcp-Name"]).toBe("domain_organic_keywords");
  });
});
