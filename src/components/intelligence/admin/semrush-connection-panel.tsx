"use client";

import { useState } from "react";

type Capability = { name: string; description: string; inputSchema: Record<string, unknown> };
type Result = { state: string; message?: string; discoveredAt?: string; schemaHash?: string; capabilityCount?: number; readOnlyCapabilities?: Capability[]; excludedCapabilities?: string[] };

const labelByState: Record<string, string> = {
  disabled: "Disabled by feature flag",
  not_configured: "Not configured",
  configured: "Configured; discovery not yet run",
  connected: "Connected",
  authorization_expired: "Authorization failed or expired",
  subscription_restricted: "Subscription restricted",
  quota_exhausted: "API unit budget exhausted",
  rate_limited: "Rate limited",
  temporary_failure: "Temporary provider failure",
};

export function SemrushConnectionPanel({ initialState, enabled }: { initialState: string; enabled: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const currentState = result?.state ?? initialState;
  async function discover() {
    setLoading(true);
    try {
      const response = await fetch("/api/intelligence/admin/semrush", { method: "POST", cache: "no-store" });
      const payload = await response.json() as Result;
      setResult(payload);
    } catch {
      setResult({ state: "temporary_failure", message: "The connection check could not be completed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-3xl rounded-xl border border-[var(--line)] bg-white p-6">
      <p className="text-sm font-semibold text-[var(--purple)]">Connection status</p>
      <h2 className="mt-2 text-xl font-semibold">{labelByState[currentState] ?? currentState}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {result?.message ?? (enabled
          ? "Credentials stay in the server environment. This screen never displays or saves the secret."
          : "Research remains off until the feature is enabled and an app-owned provider credential is configured.")}
      </p>
      <div className="mt-5 rounded-lg bg-[var(--surface)] p-4 text-sm leading-6">
        <p><span className="font-semibold">Feature flag:</span> {enabled ? "enabled" : "off"}</p>
        <p><span className="font-semibold">Credential source:</span> server environment only</p>
        <p><span className="font-semibold">Required variable:</span> <code>SEMRUSH_API_KEY</code></p>
        <p><span className="font-semibold">Transport:</span> official Semrush MCP over Streamable HTTP</p>
      </div>
      <button type="button" onClick={discover} disabled={loading || currentState === "disabled" || currentState === "not_configured"} className="mt-5 min-h-11 rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? "Checking capabilities…" : "Discover read-only capabilities"}
      </button>
      {result?.readOnlyCapabilities && <div className="mt-6">
        <p className="text-sm font-semibold">Discovered read-only tools ({result.readOnlyCapabilities.length})</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Checked {result.discoveredAt ? new Date(result.discoveredAt).toLocaleString() : "just now"}; capability discovery does not run a report.</p>
        {result.schemaHash && <p className="mt-1 break-all text-xs text-[var(--muted)]">Capability schema fingerprint: {result.schemaHash}</p>}
        <ul className="mt-3 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
          {result.readOnlyCapabilities.map((tool) => <li key={tool.name} className="p-3">
            <code className="text-sm font-semibold">{tool.name}</code>
            {tool.description && <p className="mt-1 text-sm text-[var(--muted)]">{tool.description}</p>}
          </li>)}
        </ul>
        {result.excludedCapabilities?.length ? <p className="mt-3 text-xs text-[var(--muted)]">Excluded from app execution as potentially mutating: {result.excludedCapabilities.join(", ")}</p> : null}
      </div>}
    </section>
  );
}
