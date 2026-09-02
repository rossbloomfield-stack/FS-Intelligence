import { createHash } from "node:crypto";

export type CandidateLink = {
  href: string;
  label: string;
  score: number;
};

export type EvidencePassageInput = {
  content: string;
  pageNumber: number | null;
  sectionLabel: string | null;
  score?: number;
};

const intelligenceTerms = [
  "strategy",
  "strategic",
  "growth",
  "customer",
  "digital",
  "technology",
  "artificial intelligence",
  "generative ai",
  "automation",
  "wealth",
  "insurance",
  "investment",
  "pension",
  "distribution",
  "operating model",
  "transformation",
  "capital",
  "profit",
  "risk",
  "regulation",
  "ireland",
  "market",
  "cost",
];

const targetTermGroups: Record<string, string[]> = {
  "annual report": ["annual report", "annual financial report", "full year report"],
  "results presentation": ["results presentation", "investor presentation", "full year results"],
  "results release": ["results release", "results announcement", "earnings release", "full year results"],
  "regulatory disclosure": ["regulatory", "capital", "solvency", "pillar 3", "disclosure"],
};

export function normaliseCanonicalUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

export function assertAllowedIngestionUrl(value: string, allowedHosts: ReadonlySet<string>) {
  const url = new URL(value);
  const hostname = url.hostname.toLocaleLowerCase("en-IE");
  if (url.protocol !== "https:") throw new Error("Only HTTPS ingestion URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials are not allowed in ingestion URLs");
  if (url.port && url.port !== "443") throw new Error("Non-standard ingestion ports are not allowed");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  ) {
    throw new Error("Private or literal network addresses are not allowed");
  }
  if (!allowedHosts.has(hostname)) throw new Error(`Ingestion host is not approved: ${hostname}`);
  return url;
}

export function buildAllowedHosts(values: Array<string | null | undefined>) {
  const hosts = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    try {
      const candidate = value.includes("://") ? new URL(value).hostname : value;
      const host = candidate.toLocaleLowerCase("en-IE").replace(/^\.+|\.+$/g, "");
      if (host) hosts.add(host);
    } catch {
      // Invalid registry URLs fail later when selected; they do not expand the allow-list.
    }
  }
  return hosts;
}

export function extractHtmlLinks(html: string, baseUrl: string) {
  const links: Array<{ href: string; label: string }> = [];
  const anchorPattern = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const rawHref = match[1] ?? match[2] ?? match[3] ?? "";
    if (!rawHref || rawHref.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(rawHref)) continue;
    try {
      links.push({
        href: normaliseCanonicalUrl(new URL(decodeHtml(rawHref), baseUrl).toString()),
        label: stripHtml(match[4] ?? "").slice(0, 400),
      });
    } catch {
      // Ignore malformed links from third-party pages.
    }
  }
  return links;
}

export function selectDocumentCandidate(
  links: Array<{ href: string; label: string }>,
  input: { contentType: string; referenceYear: number | null; title: string },
) {
  const type = input.contentType.toLocaleLowerCase("en-IE");
  const typeTerms = targetTermGroups[type] ?? significantTerms(input.title);
  const year = input.referenceYear ? String(input.referenceYear) : null;
  const candidates = links
    .map((link) => {
      const searchable = `${link.label} ${decodeURIComponent(link.href)}`.toLocaleLowerCase("en-IE");
      let score = link.href.toLocaleLowerCase("en-IE").includes(".pdf") ? 5 : 0;
      if (year && searchable.includes(year)) score += 8;
      score += typeTerms.reduce((total, term) => total + (searchable.includes(term) ? 5 : 0), 0);
      if (/annual-report|annualreport|results|report|presentation|capital|solvency|pillar/i.test(searchable)) score += 2;
      return { ...link, score } satisfies CandidateLink;
    })
    .filter((candidate) => candidate.score >= 7)
    .sort((a, b) => b.score - a.score || a.href.localeCompare(b.href));
  return candidates[0] ?? null;
}

export function stripHtml(html: string) {
  return decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 500) : null;
}

export function extractHtmlPublicationDate(html: string) {
  const patterns = [
    /<(?:meta|time)\b[^>]*(?:property|name|itemprop)=["'](?:article:published_time|datePublished|publish-date|publication_date)["'][^>]*(?:content|datetime)=["']([^"']+)["']/i,
    /<(?:meta|time)\b[^>]*(?:content|datetime)=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["'](?:article:published_time|datePublished|publish-date|publication_date)["']/i,
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    const date = value ? normaliseDate(value) : null;
    if (date) return date;
  }
  return null;
}

export function normaliseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function chunkText(
  content: string,
  options: { pageNumber?: number | null; sectionLabel?: string | null; maxCharacters?: number } = {},
) {
  const maxCharacters = options.maxCharacters ?? 1_600;
  const words = content.replace(/\s+/g, " ").trim().split(" ");
  const chunks: EvidencePassageInput[] = [];
  let current: string[] = [];
  let length = 0;
  for (const word of words) {
    if (current.length && length + word.length + 1 > maxCharacters) {
      chunks.push({
        content: current.join(" "),
        pageNumber: options.pageNumber ?? null,
        sectionLabel: options.sectionLabel ?? null,
      });
      current = [];
      length = 0;
    }
    current.push(word);
    length += word.length + 1;
  }
  if (current.length) {
    chunks.push({
      content: current.join(" "),
      pageNumber: options.pageNumber ?? null,
      sectionLabel: options.sectionLabel ?? null,
    });
  }
  return chunks.filter((chunk) => chunk.content.length >= 120);
}

export function selectEvidencePassages(
  candidates: EvidencePassageInput[],
  input: { title: string; contentType: string; limit?: number },
) {
  const terms = [...intelligenceTerms, ...significantTerms(input.title), ...significantTerms(input.contentType)];
  const ranked = candidates
    .map((candidate, index) => {
      const text = candidate.content.toLocaleLowerCase("en-IE");
      const matches = terms.reduce((total, term) => total + occurrences(text, term), 0);
      const earlyPage = candidate.pageNumber && candidate.pageNumber <= 12 ? 2 : 0;
      return { ...candidate, score: matches + earlyPage, index };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: EvidencePassageInput[] = [];
  const hashes = new Set<string>();
  for (const candidate of ranked) {
    const hash = createHash("sha256").update(candidate.content).digest("hex");
    if (hashes.has(hash)) continue;
    hashes.add(hash);
    selected.push(candidate);
    if (selected.length >= (input.limit ?? 24)) break;
  }
  return selected;
}

function significantTerms(value: string) {
  return [
    ...new Set(
      value
        .toLocaleLowerCase("en-IE")
        .match(/[a-z0-9]{3,}/g)
        ?.filter((term) => !["the", "and", "for", "2025", "report"].includes(term)) ?? [],
    ),
  ];
}

function occurrences(value: string, term: string) {
  let count = 0;
  let position = value.indexOf(term);
  while (position >= 0 && count < 5) {
    count += 1;
    position = value.indexOf(term, position + term.length);
  }
  return count;
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    if (token.startsWith("#")) {
      const hex = token[1]?.toLocaleLowerCase("en-IE") === "x";
      const point = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return named[token.toLocaleLowerCase("en-IE")] ?? entity;
  });
}
