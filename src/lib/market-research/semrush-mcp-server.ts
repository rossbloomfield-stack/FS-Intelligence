import "server-only";

import { callSemrushReadOnlyTool as callTool, discoverSemrushCapabilities as discover } from "@/lib/market-research/semrush-mcp";
import type { SemrushMcpTool } from "@/lib/market-research/semrush-mcp";
export { SemrushMcpError } from "@/lib/market-research/semrush-mcp";

export function discoverSemrushCapabilities(): Promise<SemrushMcpTool[]> {
  return discover(process.env.SEMRUSH_API_KEY);
}

export function callSemrushReadOnlyTool(input: Omit<Parameters<typeof callTool>[0], "apiKey">): Promise<unknown> {
  return callTool({ ...input, apiKey: process.env.SEMRUSH_API_KEY });
}
