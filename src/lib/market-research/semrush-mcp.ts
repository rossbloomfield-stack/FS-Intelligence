import { isReadOnlyCapability } from "@/lib/market-research/semrush-tool-policy";

const ENDPOINT = "https://mcp.semrush.com/v2/mcp";
const PROTOCOL_VERSION = "2026-07-28";
const LEGACY_PROTOCOL_VERSION = "2025-11-25";
const MAX_RESPONSE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 8_000;

export type SemrushMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
};

export class SemrushMcpError extends Error {
  constructor(readonly state: "authorization_expired" | "subscription_restricted" | "quota_exhausted" | "rate_limited" | "temporary_failure" | "capability_unsupported", message: string) {
    super(message);
    this.name = "SemrushMcpError";
  }
}

class LegacyProtocolRequired extends Error {}

type RpcEnvelope = { result?: unknown; error?: { code?: number; message?: string } };

export async function discoverSemrushCapabilities(apiKey: string | undefined): Promise<SemrushMcpTool[]> {
  if (!apiKey?.trim()) throw new SemrushMcpError("authorization_expired", "The Semrush server API key is not configured.");
  try {
    return await discoverModern(apiKey);
  } catch (error) {
    if (!(error instanceof LegacyProtocolRequired)) throw error;
  }
  return discoverLegacy(apiKey);
}

async function discoverModern(apiKey: string): Promise<SemrushMcpTool[]> {
  const discovered = await modernRpc(apiKey, "server/discover", {}, 1);
  if (discovered.error) throw new LegacyProtocolRequired();
  const allTools: SemrushMcpTool[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page += 1) {
    const response = await modernRpc(apiKey, "tools/list", cursor ? { cursor } : {}, page + 2);
    if (response.error) throw mapProviderError(response.error.message ?? "Semrush tool discovery failed.", response.error.code);
    const result = response.result as { tools?: unknown[]; nextCursor?: string } | undefined;
    for (const candidate of result?.tools ?? []) {
      const tool = parseTool(candidate);
      if (tool) allTools.push(tool);
    }
    cursor = typeof result?.nextCursor === "string" ? result.nextCursor : undefined;
    if (!cursor) break;
  }
  return allTools;
}

async function discoverLegacy(apiKey: string): Promise<SemrushMcpTool[]> {
  let sessionId: string | null = null;
  try {
    const initialized = await rpc(apiKey, "initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "fs-intelligence", version: "1.0.0" },
    }, null, 1);
    if (!initialized.result) throw new SemrushMcpError("temporary_failure", "Semrush did not return an MCP initialization result.");
    const initSession = initialized.sessionId;
    sessionId = initSession;
    await notifyInitialized(apiKey, sessionId);

    const allTools: SemrushMcpTool[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const response = await rpc(apiKey, "tools/list", cursor ? { cursor } : {}, sessionId, page + 2);
      const result = response.result as { tools?: unknown[]; nextCursor?: string } | undefined;
      for (const candidate of result?.tools ?? []) { const tool = parseTool(candidate); if (tool) allTools.push(tool); }
      cursor = typeof result?.nextCursor === "string" ? result.nextCursor : undefined;
      if (!cursor) break;
    }
    return allTools;
  } finally {
    if (sessionId) await closeSession(apiKey, sessionId).catch(() => undefined);
  }
}

function parseTool(candidate: unknown): SemrushMcpTool | null {
  if (!candidate || typeof candidate !== "object") return null;
  const tool = candidate as Record<string, unknown>;
  if (typeof tool.name !== "string" || typeof tool.inputSchema !== "object" || !tool.inputSchema) return null;
  const description = typeof tool.description === "string" ? tool.description : "";
  return { name: tool.name, description, inputSchema: tool.inputSchema as Record<string, unknown>, readOnly: isReadOnlyCapability(tool.name, description) };
}

export async function callSemrushReadOnlyTool({ apiKey, tool, input, catalog }: {
  apiKey: string | undefined;
  tool: string;
  input: unknown;
  catalog: SemrushMcpTool[];
}): Promise<unknown> {
  if (!apiKey?.trim()) throw new SemrushMcpError("authorization_expired", "The Semrush server API key is not configured.");
  const capability = catalog.find((item) => item.name === tool);
  if (!capability || !capability.readOnly) throw new SemrushMcpError("capability_unsupported", "The requested capability was not discovered as read-only.");
  validateJsonSchemaInput(capability.inputSchema, input);

  try {
    const result = await modernRpc(apiKey, "tools/call", { name: capability.name, arguments: input }, 1, capability.name);
    if (result.error?.code === -32601) throw new LegacyProtocolRequired();
    if (result.error) throw mapProviderError(result.error.message ?? "Semrush tool call failed.", result.error.code);
    return result.result;
  } catch (error) {
    if (!(error instanceof LegacyProtocolRequired)) throw error;
  }
  const initialized = await rpc(apiKey, "initialize", {
      protocolVersion: LEGACY_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "fs-intelligence", version: "1.0.0" },
  }, null, 1);
  const sessionId = initialized.sessionId;
  try {
    await notifyInitialized(apiKey, sessionId);
    const result = await rpc(apiKey, "tools/call", { name: capability.name, arguments: input }, sessionId, 2);
    if (result.error) throw mapProviderError(result.error.message ?? "Semrush tool call failed.", result.error.code);
    return result.result;
  } finally { if (sessionId) await closeSession(apiKey, sessionId).catch(() => undefined); }
}

async function modernRpc(apiKey: string, method: string, params: Record<string, unknown>, id: number, name?: string): Promise<RpcEnvelope> {
  const headers: Record<string, string> = {
    Authorization: `Apikey ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": PROTOCOL_VERSION,
    "Mcp-Method": method,
    ...(name ? { "Mcp-Name": name } : {}),
  };
  const bodyParams = method === "server/discover"
    ? { ...params, _meta: { "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION, "io.modelcontextprotocol/clientCapabilities": {} } }
    : { ...params, _meta: { "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION, "io.modelcontextprotocol/clientInfo": { name: "fs-intelligence", version: "1.0.0" }, "io.modelcontextprotocol/clientCapabilities": {} } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id, method, params: bodyParams }), cache: "no-store", signal: controller.signal });
    const text = await readBoundedText(response);
    if ([400, 404, 405].includes(response.status)) throw new LegacyProtocolRequired();
    if (!response.ok) throw mapProviderError(text, response.status);
    const envelope = parseRpcEnvelope(text, response.headers.get("content-type") ?? "");
    if (envelope.error?.code === -32601) throw new LegacyProtocolRequired();
    return envelope;
  } catch (error) {
    if (error instanceof SemrushMcpError || error instanceof LegacyProtocolRequired) throw error;
    throw new SemrushMcpError("temporary_failure", error instanceof Error && error.name === "AbortError" ? "Semrush did not respond within the time limit." : "Semrush could not be reached.");
  } finally { clearTimeout(timer); }
}

function validateJsonSchemaInput(schema: Record<string, unknown>, input: unknown): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SemrushMcpError("capability_unsupported", "Tool arguments must be an object.");
  const object = input as Record<string, unknown>;
  const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === "string") : [];
  const properties = schema.properties && typeof schema.properties === "object" ? schema.properties as Record<string, unknown> : {};
  for (const key of required) if (!(key in object)) throw new SemrushMcpError("capability_unsupported", `Missing required provider parameter: ${key}.`);
  if (schema.additionalProperties === false) {
    const extra = Object.keys(object).find((key) => !(key in properties));
    if (extra) throw new SemrushMcpError("capability_unsupported", `Unrecognized provider parameter: ${extra}.`);
  }
  for (const [key, value] of Object.entries(object)) {
    const raw = properties[key];
    if (!raw || typeof raw !== "object") continue;
    const property = raw as Record<string, unknown>;
    if (Array.isArray(property.enum) && !property.enum.includes(value)) throw new SemrushMcpError("capability_unsupported", `Invalid value for provider parameter: ${key}.`);
    if (typeof property.type === "string" && !matchesType(value, property.type)) throw new SemrushMcpError("capability_unsupported", `Invalid type for provider parameter: ${key}.`);
  }
}

function matchesType(value: unknown, type: string): boolean {
  if (type === "string") return typeof value === "string";
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "array") return Array.isArray(value);
  if (type === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  return true;
}

async function rpc(apiKey: string, method: string, params: unknown, sessionId: string | null, id: number): Promise<{ result?: unknown; error?: { code?: number; message?: string }; sessionId: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Apikey ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "Mcp-Session-Id": sessionId, "MCP-Protocol-Version": LEGACY_PROTOCOL_VERSION } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      cache: "no-store",
      signal: controller.signal,
    });
    const returnedSession = response.headers.get("mcp-session-id") ?? sessionId;
    const text = await readBoundedText(response);
    if (!response.ok) throw mapProviderError(text, response.status);
    const envelope = parseRpcEnvelope(text, response.headers.get("content-type") ?? "");
    if (envelope.error) throw mapProviderError(envelope.error.message ?? "Semrush MCP request failed.", envelope.error.code);
    return { ...envelope, sessionId: returnedSession };
  } catch (error) {
    if (error instanceof SemrushMcpError) throw error;
    throw new SemrushMcpError("temporary_failure", error instanceof Error && error.name === "AbortError" ? "Semrush did not respond within the time limit." : "Semrush could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

async function notifyInitialized(apiKey: string, sessionId: string | null): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Apikey ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(sessionId ? { "Mcp-Session-Id": sessionId, "MCP-Protocol-Version": LEGACY_PROTOCOL_VERSION } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw mapProviderError(await readBoundedText(response), response.status);
}

async function closeSession(apiKey: string, sessionId: string): Promise<void> {
  await fetch(ENDPOINT, { method: "DELETE", headers: { Authorization: `Apikey ${apiKey}`, "Mcp-Session-Id": sessionId, "MCP-Protocol-Version": LEGACY_PROTOCOL_VERSION }, cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

async function readBoundedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.length > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new SemrushMcpError("temporary_failure", "Semrush returned a response larger than the configured safety limit.");
    }
  }
  return text + decoder.decode();
}

function parseRpcEnvelope(text: string, contentType: string): RpcEnvelope {
  const candidates = contentType.includes("text/event-stream")
    ? text.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).filter(Boolean)
    : [text];
  for (const candidate of candidates.reverse()) {
    try {
      const parsed = JSON.parse(candidate) as RpcEnvelope;
      if (parsed && typeof parsed === "object") return parsed;
    } catch { /* Stream may contain a non-JSON progress notification. */ }
  }
  throw new SemrushMcpError("temporary_failure", "Semrush returned an unreadable MCP response.");
}

function mapProviderError(message: string, code?: number): SemrushMcpError {
  const lower = message.toLowerCase();
  if (code === 401 || code === 403 || /unauthori[sz]ed|invalid api key|authentication/.test(lower)) return new SemrushMcpError("authorization_expired", "Semrush authorization is invalid or expired.");
  if (/subscription|not included in.*plan|access.*plan|not subscribed/.test(lower)) return new SemrushMcpError("subscription_restricted", "This Semrush capability is not included in the connected subscription.");
  if (/quota|not enough units|insufficient units|unit balance/.test(lower)) return new SemrushMcpError("quota_exhausted", "The Semrush API unit budget is exhausted.");
  if (code === 429 || /rate limit|too many requests/.test(lower)) return new SemrushMcpError("rate_limited", "Semrush is rate limiting requests; retry later.");
  if (/method not found|unknown tool|unsupported/.test(lower)) return new SemrushMcpError("capability_unsupported", "Semrush does not expose this capability for the current connection.");
  return new SemrushMcpError("temporary_failure", "Semrush returned a temporary error.");
}
