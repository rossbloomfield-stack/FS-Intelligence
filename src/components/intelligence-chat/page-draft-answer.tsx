"use client";
import { useState } from "react";
import type { PageDraft } from "@/lib/market-research/page-draft";

export function PageDraftAnswer({ draft, onEvidence }: { draft: PageDraft; onEvidence: (referenceId?: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const body = [draft.title, draft.description, `# ${draft.h1}`, draft.hero.headline, draft.hero.supportingText, ...draft.sections.flatMap((section) => [`## ${section.heading}`, section.body, ...section.bullets]), "FAQs", ...draft.faqs.flatMap((faq) => [`Q: ${faq.question}`, `A: ${faq.answer}`])].join("\n\n");
    await navigator.clipboard.writeText(body); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };
  return <div className="page-draft-answer">
    <div className="page-draft-heading"><div><p className="eyebrow">EDITABLE PAGE DRAFT · {draft.brand === "unio" ? "UNIO" : "IRISH LIFE"} · {draft.parentVersionId ? "REVISION" : "V1"}</p><h2>{draft.title}</h2><p>{draft.suggestedUrl} · Profile {draft.brandProfileVersion}</p></div><button type="button" onClick={() => void copy()}>{copied ? "Copied" : "Copy page"}</button></div>
    <dl className="page-draft-metadata"><dt>Search title</dt><dd>{draft.title}</dd><dt>Description</dt><dd>{draft.description}</dd><dt>H1</dt><dd>{draft.h1}</dd></dl>
    <section className="page-draft-hero"><small>{draft.hero.eyebrow}</small><h3>{draft.hero.headline}</h3><p>{draft.hero.supportingText}</p><div>{draft.hero.primaryCta.label} → {draft.hero.primaryCta.destination}{draft.hero.secondaryCta && <> · {draft.hero.secondaryCta.label} → {draft.hero.secondaryCta.destination}</>}</div></section>
    {draft.sections.map((section, index) => <section className="page-draft-section" key={`${draft.versionId}-${index}`}><h3>{section.heading}</h3><p>{section.body}</p>{section.bullets.length > 0 && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}<EvidenceButtons ids={section.evidenceReferenceIds} onEvidence={onEvidence}/>{section.cta && <p className="page-draft-cta">{section.cta.label} → {section.cta.destination}</p>}</section>)}
    {draft.faqs.length > 0 && <section className="page-draft-section"><h3>Frequently asked questions</h3>{draft.faqs.map((faq, index) => <div key={`${index}-${faq.question}`} className="page-draft-faq"><h4>{faq.question}</h4><p>{faq.answer}</p><EvidenceButtons ids={faq.evidenceReferenceIds} onEvidence={onEvidence}/></div>)}</section>}
    {draft.implementationNotes.length > 0 && <aside className="page-draft-notes"><strong>Editorial checks before approval</strong><ul>{draft.implementationNotes.map((note) => <li key={note}>{note}</li>)}</ul></aside>}
    <p className="page-draft-version">Version {draft.versionId.slice(0, 8)} · {new Date(draft.createdAt).toLocaleString("en-IE")} · Draft only; not approved or published.</p>
  </div>;
}

function EvidenceButtons({ ids, onEvidence }: { ids: string[]; onEvidence: (referenceId?: string) => void }) {
  if (!ids.length) return null;
  return <div className="page-draft-evidence">Supported by {ids.map((id) => <button type="button" key={id} onClick={() => onEvidence(id)}>[{id}]</button>)}</div>;
}
