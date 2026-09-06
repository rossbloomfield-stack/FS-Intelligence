"use client";

import { useState } from "react";
import Link from "next/link";

export function SignalOperations({ initialStatus }: { initialStatus: SignalStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function refresh() {
    const response = await fetch("/api/admin/signals", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh signal diagnostics");
    setStatus(await response.json());
  }
  async function backfill() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/signals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ limit: 3 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not queue backfill");
      setMessage(`${result.queued} approved evidence items queued for bounded signal processing.`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Backfill failed"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Signals" value={status.totals.signals} /><Metric label="Observations" value={status.totals.observations} /><Metric label="Needs review" value={status.totals.reviewBacklog} /><Metric label="Duplicates suppressed" value={status.processing.duplicatesSuppressed} /></div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-lg font-semibold">Quality</h2><dl className="mt-3 divide-y divide-[var(--line)] text-sm"><Row label="Accepted observations" value={status.quality.acceptedObservations} /><Row label="Primary-evidence observations" value={status.quality.primaryEvidenceObservations} /><Row label="Unresolved entities" value={status.quality.unresolvedEntities} /><Row label="Contradictions" value={status.processing.contradictions} /></dl></section><section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-lg font-semibold">Processing</h2><dl className="mt-3 divide-y divide-[var(--line)] text-sm"><Row label="Completed runs" value={status.processing.completed} /><Row label="Failed runs" value={status.processing.failed} /><Row label="Signals created" value={status.processing.signalsCreated} /><Row label="Signals updated" value={status.processing.signalsUpdated} /><Row label="Average duration" value={`${status.processing.averageDurationMs} ms`} /></dl><button type="button" disabled={busy} onClick={backfill} className="mt-5 min-h-11 rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Queuing…" : "Process next 3 approved items"}</button>{message ? <p className="mt-3 text-sm text-[var(--muted)]" role="status">{message}</p> : null}</section></div>
    <section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-lg font-semibold">Highest-priority signals</h2><div className="mt-3 divide-y divide-[var(--line)]">{status.topSignals.map((signal) => <Link className="flex items-center justify-between gap-4 py-3 text-sm" href={`/intelligence/admin/signals/${signal.id}`} key={signal.id}><span>{signal.title}</span><span className="font-semibold text-[var(--purple)]">{Math.round(Number(signal.signal_score ?? 0))}/100 · {signal.status}</span></Link>)}</div></section>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="label text-[var(--purple)]">{label}</p><p className="mt-2 text-3xl font-semibold">{value.toLocaleString("en-IE")}</p></div>; }
function Row({ label, value }: { label: string; value: number | string }) { return <div className="flex items-center justify-between gap-4 py-3"><dt>{label}</dt><dd className="font-semibold">{typeof value === "number" ? value.toLocaleString("en-IE") : value}</dd></div>; }
export type SignalStatus = { totals: { signals: number; observations: number; reviewBacklog: number }; signalStatus: Record<string, number>; confidence: Record<string, number>; quality: { primaryEvidenceObservations: number; unresolvedEntities: number; acceptedObservations: number }; processing: { runs: number; completed: number; failed: number; duplicatesSuppressed: number; signalsCreated: number; signalsUpdated: number; contradictions: number; averageDurationMs: number }; topSignals: Array<{id:string;title:string;status:string;signal_score:number|string|null}>; recentRuns: unknown[] };
