import Link from "next/link";
import type { BoardSignal as BoardSignalType, EvidenceConfidence, TrendDirection } from "@/schemas/executive";

const trendLabels: Record<TrendDirection, string> = { new: "New", up: "↑ Strengthening", unchanged: "→ Unchanged", down: "↓ Weakening", resolved: "Resolved" };
const confidenceLabels: Record<EvidenceConfidence, string> = { high: "High", medium: "Medium", low: "Low", insufficient: "Insufficient evidence" };
const categoryLabels: Record<BoardSignalType["category"], string> = { opportunity: "Biggest opportunity", threat: "Biggest threat", customer_shift: "Biggest customer shift", regulatory_risk: "Biggest regulatory risk", technology_shift: "Biggest technology shift", market_pressure: "Market pressure" };

export function ConfidenceLabel({ value }: { value: EvidenceConfidence }) {
  return <span className="signal-pill" title="High is supported by primary evidence and/or multiple credible corroborating sources.">Evidence: {confidenceLabels[value]}</span>;
}

export function BoardSignal({ signal }: { signal: BoardSignalType }) {
  const body = <><div className="flex items-start justify-between gap-4"><p className="label text-[var(--orange)]">{categoryLabels[signal.category]}</p><span className={`rag rag-${signal.rag}`}><span className="sr-only">Risk status: </span>{signal.rag}</span></div><h3 className="mt-3 text-lg font-semibold leading-snug">{signal.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{signal.summary}</p><div className="mt-4 flex flex-wrap gap-2"><span className="signal-pill">Board signal {signal.score}/5</span><span className="signal-pill">{trendLabels[signal.trend]}</span><ConfidenceLabel value={signal.evidenceConfidence}/></div>{signal.sourceCount !== undefined && <p className="mt-3 text-xs text-[var(--muted)]">{signal.sourceCount} source{signal.sourceCount === 1 ? "" : "s"}{signal.primarySourceCount !== undefined ? ` · ${signal.primarySourceCount} primary` : ""}</p>}</>;
  return signal.href ? <Link aria-label={`${categoryLabels[signal.category]}: ${signal.title}`} className="board-signal block" href={signal.href}>{body}</Link> : <article className="board-signal">{body}</article>;
}
