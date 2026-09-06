"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignalReviewActions({ signalId, important, dismissed }: { signalId: string; important: boolean; dismissed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function act(action: string) {
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/admin/signals/${signalId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? "Review action failed"); return; }
    setMessage("Review action recorded."); router.refresh();
  }
  return <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => act(important ? "unmark_important" : "mark_important")} className="min-h-11 rounded-lg border border-[var(--purple)] px-4 text-sm font-semibold text-[var(--purple)]">{important ? "Remove important flag" : "Mark important"}</button><button disabled={busy} onClick={() => act(dismissed ? "restore" : "dismiss")} className="min-h-11 rounded-lg bg-[var(--purple)] px-4 text-sm font-semibold text-white">{dismissed ? "Restore signal" : "Dismiss signal"}</button>{message ? <p className="w-full text-sm text-[var(--muted)]" role="status">{message}</p> : null}</div>;
}
