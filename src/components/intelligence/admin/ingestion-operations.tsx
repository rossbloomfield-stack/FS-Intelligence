"use client";

import { useState } from "react";
import type { IngestionOperationsStatus, IngestionReviewItem } from "@/schemas/source-ingestion";

export function IngestionOperations({ initialStatus }: { initialStatus: IngestionOperationsStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialStatus.pendingItems.map((item) => [item.id, item.publication_date ?? ""])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/ingestion", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load ingestion operations");
    const next = (await response.json()) as IngestionOperationsStatus;
    setStatus(next);
    setDates((current) =>
      Object.fromEntries(next.pendingItems.map((item) => [item.id, current[item.id] ?? item.publication_date ?? ""])),
    );
  }

  async function startQueue() {
    setBusy("start");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ingestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      });
      const result = (await response.json()) as { started?: unknown[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not start ingestion");
      setMessage(`${result.started?.length ?? 0} bounded ingestion workflows started.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start ingestion");
    } finally {
      setBusy(null);
    }
  }

  async function review(item: IngestionReviewItem, decision: "approve" | "reject") {
    if (decision === "approve" && !dates[item.id]) {
      setMessage("Enter and verify the publication date before approval.");
      return;
    }
    setBusy(item.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ingestion/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          decision,
          publicationDate: dates[item.id] || null,
          reason: decision === "reject" ? "Rejected by administrator during corpus review" : null,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not review source item");
      setMessage(decision === "approve" ? "Evidence approved for conversational retrieval." : "Evidence rejected.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review source item");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="corpus-operations-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--teal)]">R5.3 CORPUS OPERATIONS</p>
          <h2 id="corpus-operations-heading" className="mt-2 text-2xl font-semibold text-[var(--ink)]">
            Evidence ingestion and review
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Fetch-approved targets are processed into bounded passages. Nothing becomes available to conversation until an administrator verifies the source and publication date.
          </p>
        </div>
        <button
          type="button"
          onClick={startQueue}
          disabled={busy !== null}
          className="min-h-11 rounded-lg bg-[var(--purple)] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "start" ? "Starting…" : "Process next five"}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-lg border border-[var(--line)] bg-white p-3 text-sm" role="status">{message}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Approved documents" value={status.approvedSourceItems} />
        <Metric label="Stored passages" value={status.storedPassages} />
        <Metric label="Enabled targets" value={status.enabledTargets} />
        <Metric label="Awaiting review" value={status.pendingItems.length} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs text-[var(--muted)]" aria-label="Ingestion run status">
        {Object.entries(status.statusCounts).map(([label, value]) => (
          <span key={label} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5">
            <span className="capitalize">{label}</span>: <strong className="text-[var(--ink)]">{value}</strong>
          </span>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {status.pendingItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">
                  {item.reference_targets?.reference_key ?? "Evidence item"} · {item.content_type}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">{item.title}</h3>
                <a className="mt-2 block break-all text-sm text-[var(--purple)] underline" href={item.canonical_url} target="_blank" rel="noreferrer">
                  Open official source
                </a>
              </div>
              <div className="grid shrink-0 gap-2 sm:grid-cols-[170px_auto_auto]">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Publication date
                  <input
                    type="date"
                    value={dates[item.id] ?? ""}
                    onChange={(event) => setDates((current) => ({ ...current, [item.id]: event.target.value }))}
                    className="mt-1 min-h-11 w-full rounded-lg border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => review(item, "approve")}
                  disabled={busy !== null}
                  className="min-h-11 self-end rounded-lg bg-[var(--teal)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => review(item, "reject")}
                  disabled={busy !== null}
                  className="min-h-11 self-end rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
        {!status.pendingItems.length ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
            No parsed evidence is waiting for review.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--purple)]">{value ?? "—"}</p>
    </div>
  );
}
