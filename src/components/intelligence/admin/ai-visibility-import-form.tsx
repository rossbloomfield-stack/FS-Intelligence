"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { VisibilityImport } from "@/lib/market-research/ai-visibility-import";

export function AiVisibilityImportForm({ initial }: { initial?: VisibilityImport | null }) {
  const router = useRouter();
  const [brand, setBrand] = useState("irish_life");
  const [platform, setPlatform] = useState("");
  const [market, setMarket] = useState("Ireland");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [metricDefinition, setMetricDefinition] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VisibilityImport | null>(initial ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      form.set("brand", brand); form.set("platform", platform); form.set("market", market);
      form.set("periodStart", periodStart); form.set("periodEnd", periodEnd); form.set("metricDefinition", metricDefinition);
      const response = await fetch("/api/intelligence/admin/semrush/ai-visibility-import", { method: "POST", body: form });
      const data = await response.json() as { error?: string; import?: VisibilityImport; conversationId?: string };
      if (!response.ok || !data.import) throw new Error(data.error ?? "The import could not be saved.");
      setResult(data.import);
      if (data.conversationId) router.replace(`/intelligence/admin/semrush/import?conversationId=${encodeURIComponent(data.conversationId)}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The import could not be completed."); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
      <div><h2 className="text-xl font-semibold">Import an AI visibility export</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">CSV and XLSX are accepted. We keep original columns and their definitions; the import does not infer AI visibility from ordinary search rankings.</p></div>
      <label className="block text-sm font-medium">Brand<select value={brand} onChange={(event) => setBrand(event.target.value)} className={field}><option value="irish_life">Irish Life</option><option value="unio">Unio</option></select></label>
      <label className="block text-sm font-medium">Platform<input required maxLength={100} value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="e.g. ChatGPT" className={field}/></label>
      <label className="block text-sm font-medium">Market<input required maxLength={80} value={market} onChange={(event) => setMarket(event.target.value)} placeholder="Ireland" className={field}/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Period start<input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className={field}/></label><label className="block text-sm font-medium">Period end<input required type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className={field}/></label></div>
      <label className="block text-sm font-medium">Metric definition and denominator<input required maxLength={500} value={metricDefinition} onChange={(event) => setMetricDefinition(event.target.value)} placeholder="What the provider counts and the population measured" className={field}/></label>
      <label className="block text-sm font-medium">Export file<input required type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-[var(--purple)] file:px-3 file:py-2 file:text-white`}/><span className="mt-1 block text-xs text-[var(--muted)]">Maximum 8 MB; up to 10,000 rows.</span></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="min-h-11 rounded-lg bg-[var(--purple)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Validating and saving…" : "Validate and save import"}</button>
    </form>
    <section aria-live="polite" className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
      {!result ? <><h2 className="text-xl font-semibold">Import preview</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">After validation, this panel shows the detected fields, unrecognised columns and any values needing review. Comparisons are not combined unless their scopes match.</p></> : <ImportPreview result={result}/>}
    </section>
  </div>;
}

function ImportPreview({ result }: { result: VisibilityImport }) {
  return <><p className="text-xs font-bold uppercase tracking-widest text-[var(--orange)]">Saved import · {result.format.toUpperCase()}</p><h2 className="mt-2 text-xl font-semibold">{result.rows.length} rows retained</h2><p className="mt-2 text-sm text-[var(--muted)]">{result.scope.brand === "irish_life" ? "Irish Life" : "Unio"} · {result.scope.platform} · {result.scope.market} · {result.scope.periodStart} to {result.scope.periodEnd}</p><p className="mt-1 text-xs text-[var(--muted)]">Metric definition: {result.scope.metricDefinition}</p>
    <div className="mt-5"><h3 className="text-sm font-semibold">Detected column mapping</h3>{Object.keys(result.columnMapping).length ? <dl className="mt-2 grid grid-cols-[minmax(100px,auto)_1fr] gap-x-3 gap-y-1 text-sm">{Object.entries(result.columnMapping).map(([field, header]) => <div className="contents" key={field}><dt className="text-[var(--muted)]">{field}</dt><dd className="break-words">{header}</dd></div>)}</dl> : <p className="mt-1 text-sm text-[var(--muted)]">No standard columns recognised; the raw export will still be retained.</p>}</div>
    <div className="mt-3"><h3 className="text-sm font-semibold">All source columns</h3><p className="mt-1 break-words text-sm text-[var(--muted)]">{result.headers.join(" · ")}</p></div>
    {result.unmatchedColumns.length > 0 && <div className="mt-4 rounded-lg bg-slate-50 p-3"><h3 className="text-sm font-semibold">Retained as raw fields</h3><p className="mt-1 text-sm text-[var(--muted)]">{result.unmatchedColumns.join(" · ")}</p></div>}
    {result.errors.length > 0 && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3"><h3 className="text-sm font-semibold">Review {result.errors.length} value(s)</h3><ul className="mt-2 list-inside list-disc text-sm">{result.errors.slice(0, 10).map((item) => <li key={`${item.rowNumber}-${item.message}`}>Row {item.rowNumber}: {item.message}</li>)}</ul></div>}
    <div className="mt-5 max-h-[520px] overflow-auto rounded-lg border border-[var(--line)]"><table className="min-w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr>{["Row", "Brand", "Prompt", "Cited domain", "Metric", "Denominator"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody>{result.rows.slice(0, 100).map((row) => <tr key={row.rowNumber} className="border-t border-[var(--line)]"><td className="px-3 py-2">{row.rowNumber}</td><td className="px-3 py-2">{row.brandMention ?? "—"}</td><td className="max-w-52 truncate px-3 py-2" title={row.prompt ?? ""}>{row.prompt ?? "—"}</td><td className="px-3 py-2">{row.citedDomain ?? "—"}</td><td className="px-3 py-2">{row.visibilityValue ?? "—"}</td><td className="px-3 py-2">{row.denominator ?? "—"}</td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-[var(--muted)]">Preview limited to first 100 rows; all {result.rows.length} source rows remain saved.</p>
  </>;
}

const field = "mt-2 block min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200";
