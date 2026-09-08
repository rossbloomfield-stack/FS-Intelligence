import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceDisclosure } from "@/components/intelligence/evidence-disclosure";
import { SectionPage } from "@/components/intelligence/section-page";
import { getOrganisationDossier } from "@/lib/intelligence/graph/dossiers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dossier = await getOrganisationDossier(slug);
  return dossier ? {
    title: `${dossier.canonicalName} intelligence profile`,
    description: `Evidence-grounded signals, capabilities and relationships for ${dossier.canonicalName}.`,
    alternates: { canonical: `/intelligence/organisations/${slug}` },
  } : { title: "Organisation unavailable" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dossier = await getOrganisationDossier(slug);
  if (!dossier) notFound();
  const evidenceItems = dossier.recentObservations.slice(0, 10).map((item) => ({
    title: item.sourceTitle, publisher: dossier.canonicalName, primary: true,
    classification: humanise(item.type), claim: item.text, url: item.sourceUrl,
  }));
  const askHref = `/intelligence?contextType=organisation&contextId=${encodeURIComponent(dossier.id)}&contextLabel=${encodeURIComponent(dossier.canonicalName)}&prompt=${encodeURIComponent(`What has materially changed at ${dossier.canonicalName}?`)}`;
  return (
    <SectionPage
      eyebrow={`${dossier.entityType.toUpperCase()} · ${(dossier.geography ?? "MARKET").toUpperCase()}`}
      title={dossier.canonicalName}
      description={dossier.description ?? "Living market-intelligence dossier."}
    >
      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-lg bg-[var(--purple)] px-5 py-2 text-sm font-semibold text-white" href={askHref}>Ask about {dossier.canonicalName}</Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] bg-white px-5 py-2 text-sm font-semibold text-[var(--purple)]" href="/intelligence/competitors">Back to competitors</Link>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_.68fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <div className="flex flex-wrap gap-2">
              <span className="signal-pill">{dossier.signals.length} active signals</span>
              <span className="signal-pill">{dossier.relationships.length} evidenced relationships</span>
              <span className="signal-pill">Updated {formatDate(dossier.lastUpdatedAt)}</span>
            </div>
            <h2 className="mt-6 text-xl font-semibold">Current strategic themes</h2>
            {dossier.signals.length ? (
              <div className="mt-4 space-y-4">
                {dossier.signals.slice(0, 6).map((signal) => (
                  <article className="rounded-xl border border-[var(--line)] p-4" key={signal.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-[var(--ink)]">{signal.title}</h3>
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">{humanise(signal.direction ?? signal.status)} · {Math.round(signal.confidence)}% confidence</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{signal.summary}</p>
                    <Link className="mt-3 inline-flex text-sm font-semibold text-[var(--purple)]" href={`/intelligence/signals/${signal.id}`}>Inspect signal evidence →</Link>
                  </article>
                ))}
              </div>
            ) : <EmptyState text="No accepted, evidence-grounded strategic signal is available for this organisation yet." />}
          </section>
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-semibold">Technology, products and market relationships</h2>
            {dossier.relationships.length ? (
              <div className="mt-4 divide-y divide-[var(--line)]">
                {dossier.relationships.slice(0, 12).map((relationship) => (
                  <div className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]" key={relationship.id}>
                    <div>
                      <p className="font-semibold">{relationship.sourceEntityName} <span className="font-normal text-[var(--muted)]">{humanise(relationship.relationshipType)}</span> {relationship.targetEntityName}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{relationship.basis === "explicit" ? "Explicit evidence" : "Evidence-backed inference"} · {relationship.evidenceCount} observation{relationship.evidenceCount === 1 ? "" : "s"} · last observed {formatDate(relationship.lastObservedAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--teal)]">{Math.round(relationship.confidence * 100)}% confidence</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No accepted relationship has enough traceable evidence to display yet." />}
          </section>
          {evidenceItems.length ? <EvidenceDisclosure items={evidenceItems} /> : null}
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-semibold">Capability evidence</h2>
            {dossier.capabilities.length ? (
              <dl className="mt-4 divide-y divide-[var(--line)]">
                {dossier.capabilities.map((capability) => (
                  <div className="flex items-center justify-between gap-4 py-3 text-sm" key={capability.name}>
                    <dt>{capability.name}</dt>
                    <dd className="text-right font-semibold text-[var(--purple)]">{humanise(capability.status)}<span className="block text-xs font-normal text-[var(--muted)]">{capability.evidenceCount} observations</span></dd>
                  </div>
                ))}
              </dl>
            ) : <EmptyState text="Capability evidence is currently insufficient." />}
          </section>
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-semibold">Evidence timeline</h2>
            {dossier.recentObservations.length ? (
              <ol className="mt-4 space-y-5 border-l-2 border-purple-200 pl-4">
                {dossier.recentObservations.slice(0, 10).map((observation) => (
                  <li key={observation.id}>
                    <p className="text-xs text-[var(--muted)]">{formatDate(observation.eventDate)} · {humanise(observation.type)}</p>
                    <p className="mt-1 text-sm font-semibold leading-6">{observation.text}</p>
                    <a className="mt-1 inline-flex text-xs font-semibold text-[var(--purple)]" href={observation.sourceUrl} target="_blank" rel="noreferrer">Open source →</a>
                  </li>
                ))}
              </ol>
            ) : <EmptyState text="No accepted observations are available for the timeline." />}
          </section>
        </aside>
      </div>
    </SectionPage>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] p-4 text-sm leading-6 text-[var(--muted)]">{text}</p>;
}

function humanise(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not yet established";
  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(new Date(value));
}
