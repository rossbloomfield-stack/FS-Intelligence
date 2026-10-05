import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSemrushConnectionState, marketResearchFlags } from "@/config/market-research";
import { SemrushMcpError, discoverSemrushCapabilities } from "@/lib/market-research/semrush-mcp-server";
import { requireAdmin } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({
    state: getSemrushConnectionState(),
    features: marketResearchFlags,
    credentialSource: "server_environment",
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  await requireAdmin();
  const state = getSemrushConnectionState();
  if (state !== "configured") {
    return NextResponse.json({ state, message: state === "disabled" ? "Semrush research is disabled by its feature flag." : "Add the server-side Semrush API key and enable the feature flag before discovery." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const tools = await discoverSemrushCapabilities();
    const readOnlyCapabilities = tools.filter((tool) => tool.readOnly).map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    const schemaHash = createHash("sha256").update(JSON.stringify(readOnlyCapabilities)).digest("hex");
    return NextResponse.json({
      state: "connected",
      discoveredAt: new Date().toISOString(),
      schemaHash,
      capabilityCount: tools.length,
      readOnlyCapabilities,
      excludedCapabilities: tools.filter((tool) => !tool.readOnly).map(({ name }) => name),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof SemrushMcpError ? error.state : "temporary_failure";
    return NextResponse.json({ state: status, message: error instanceof SemrushMcpError ? error.message : "Semrush capability discovery failed." }, { status: status === "authorization_expired" ? 401 : 502, headers: { "Cache-Control": "no-store" } });
  }
}
