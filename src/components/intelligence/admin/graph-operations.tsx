"use client";

import { useState } from "react";
import type { GraphOperationsStatus } from "@/lib/intelligence/graph/coverage";

export function GraphOperations({ initialStatus }: { initialStatus: GraphOperationsStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function refreshStatus() {
    const refresh = await fetch("/api/admin/graph", { cache: "no-store" });
    if (refresh.ok) setStatus(await refresh.json() as GraphOperationsStatus);
  }
  async function run(action: "backfill_graph" | "queue_sources" | "refresh_metrics") {
    setBusy(action); setMessage(null);
    try {
      const response = await fetch("/api/admin/graph", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, limit: action === "backfill_graph" ? 10 : 20 }),
      });
      const result = await response.json() as { error?: string; processed?: number; queued?: number };
      if (!response.ok) throw new Error(result.error ?? "R4 operation failed");
      setMessage(action === "backfill_graph" ? `${result.processed ?? 0} observations processed into graph relationships.` : action === "queue_sources" ? `${result.queued ?? 0} verified sources queued for bounded ingestion.` : "Coverage metrics and alerts refreshed.");
      await refreshStatus();
    } catch (error) { setMessage(error instanceof Error ? error.message : "R4 operation failed"); }
    finally { setBusy(null); }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button className="min-h-11 rounded-lg bg-[var(--purple)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy !== null} onClick={() => run("backfill_graph")} type="button">{busy === "backfill_graph" ? "Building…" : "Process graph backfill"}</button>
        <button className="min-h-11 rounded-lg border border-[var(--purple)] bg-white px-5 py-2 text-sm font-semibold text-[var(--purple)] disabled:opacity-50" disabled={busy !== null} onClick={() => run("queue_sources")} type="button">{busy === "queue_sources" ? "Queueing…" : "Queue next 20 sources"}</button>
        <button className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-5 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-50" disabled={busy !== null} onClick={() => run("refresh_metrics")} type="button">{busy === "refresh_metrics" ? "Refreshing…" : "Refresh coverage"}</button>
      </div>
      {message ? <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm" role="status">{message}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active sources" value={status.corpus.activeSources} detail={`${status.corpus.registeredSources} registered`} />
        <Metric label="Enabled Grade-A targets" value={status.corpus.enabledTargets} detail={`${status.corpus.gradeATargets} Grade A`} />
        <Metric label="Approved evidence" value={status.corpus.approvedEvidence} detail={`${status.corpus.passages} passages`} />
        <Metric label="Awaiting review" value={status.corpus.awaitingReview} detail="Approval required" />
        <Metric label="Canonical entities" value={status.intelligence.entities} detail={`${Object.keys(status.coverage.entityType).length} types`} />
        <Metric label="Relationships" value={status.intelligence.relationships} detail={`${status.intelligence.evidencedRelationships} evidenced`} />
        <Metric label="Accepted observations" value={status.intelligence.acceptedObservations} detail={`${status.intelligence.signals} signals`} />
        <Metric label="Duplicate edges suppressed" value={status.processing.duplicatesSuppressed} detail={`${status.processing.averageDurationMs}ms average`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Breakdown title="Source geography" values={status.coverage.geography} />
        <Breakdown title="Entity coverage" values={status.coverage.entityType} />
        <Breakdown title="Relationship coverage" values={status.coverage.relationshipType} />
      </div>
      <section className="rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-semibold">Coverage gaps</h2>
        {status.gaps.length ? <ul className="mt-4 space-y-3">{status.gaps.map((gap) => <li className="rounded-lg border border-[var(--line)] p-3 text-sm" key={gap.id}><strong className="uppercase text-[var(--teal)]">{gap.severity}</strong><span className="ml-2">{gap.summary}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--muted)]">No persisted R4 coverage alert is open. Operational counts above still show where evidence approval is limiting coverage.</p>}
      </section>
      <section className="rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-semibold">Relationship review</h2>
        {status.recentRelationships.length ? <div className="mt-4 divide-y divide-[var(--line)]">{status.recentRelationships.map((relationship) => <RelationshipReview key={relationship.id} relationship={relationship} onUpdated={refreshStatus} />)}</div> : <p className="mt-2 text-sm text-[var(--muted)]">No relationship candidate is available for review.</p>}
      </section>
    </div>
  );
}

function RelationshipReview({ relationship, onUpdated }: { relationship: GraphOperationsStatus["recentRelationships"][number]; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function decide(decision: "confirm" | "reject" | "expire" | "restore") {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/graph", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review_relationship", relationshipId: relationship.id, decision }) });
      if (!response.ok) throw new Error("Relationship review failed");
      await onUpdated();
    } finally { setBusy(false); }
  }
  return <article className="grid gap-3 py-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-semibold">{relationship.sourceName} <span className="font-normal text-[var(--muted)]">{relationship.type.replaceAll("_", " ").toLowerCase()}</span> {relationship.targetName}</p><p className="mt-1 text-xs text-[var(--muted)]">{relationship.basis} · {Math.round(relationship.confidence * 100)}% confidence · {relationship.evidenceCount} observation{relationship.evidenceCount === 1 ? "" : "s"} · {relationship.status}</p></div><div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold" disabled={busy} onClick={() => decide("confirm")} type="button">Confirm</button><button className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold" disabled={busy} onClick={() => decide("expire")} type="button">Expire</button><button className="min-h-11 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700" disabled={busy} onClick={() => decide("reject")} type="button">Reject</button></div></article>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <article className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">{label}</p><p className="mt-2 text-3xl font-semibold text-[var(--ink)]">{value.toLocaleString("en-IE")}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></article>; }
function Breakdown({ title, values }: { title: string; values: Record<string, number> }) { return <section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-lg font-semibold">{title}</h2><dl className="mt-3 divide-y divide-[var(--line)]">{Object.entries(values).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([key,value])=><div className="flex justify-between gap-3 py-2 text-sm" key={key}><dt>{key}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></section>; }
