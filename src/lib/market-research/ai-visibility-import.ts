import { z } from "zod";

export const aiVisibilityScopeSchema = z.object({
  brand: z.enum(["irish_life", "unio"]),
  platform: z.string().trim().min(1).max(100),
  market: z.string().trim().min(2).max(80),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  metricDefinition: z.string().trim().min(1).max(500),
});
export type AiVisibilityScope = z.infer<typeof aiVisibilityScopeSchema>;

export type VisibilityImportRow = {
  rowNumber: number;
  brandMention: string | null;
  prompt: string | null;
  citedDomain: string | null;
  citationUrl: string | null;
  visibilityValue: number | null;
  denominator: number | null;
  raw: Record<string, string | null>;
};

export type VisibilityImport = {
  format: "csv" | "xlsx";
  scope: AiVisibilityScope;
  headers: string[];
  rows: VisibilityImportRow[];
  columnMapping: Record<string, string>;
  unmatchedColumns: string[];
  errors: Array<{ rowNumber: number; message: string }>;
};

const ALIASES = {
  brandMention: ["brand", "brand name", "mentioned brand", "company", "brand mention"],
  prompt: ["prompt", "query", "question", "ai prompt"],
  citedDomain: ["cited domain", "domain", "citation domain", "source domain"],
  citationUrl: ["citation url", "url", "source url", "citation", "link"],
  visibilityValue: ["visibility", "visibility score", "mention count", "mentions", "share of voice", "ai visibility"],
  denominator: ["total prompts", "prompt count", "denominator", "total responses", "responses checked", "sample size"],
} as const;

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function detectDelimiter(input: string): string {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const options = [",", "\t", ";"];
  return options.map((delimiter) => ({ delimiter, count: countOutsideQuotes(firstLine, delimiter) }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

function countOutsideQuotes(value: string, delimiter: string): number {
  let quoted = false; let count = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '"' && value[i + 1] === '"' && quoted) i += 1;
    else if (value[i] === '"') quoted = !quoted;
    else if (value[i] === delimiter && !quoted) count += 1;
  }
  return count;
}

export function normalizeVisibilityRows(matrix: string[][], scope: AiVisibilityScope, format: VisibilityImport["format"]): VisibilityImport {
  if (matrix.length < 2) throw new Error("The file must contain a header and at least one data row.");
  const headers = matrix[0].map((value, index) => value.trim() || `Column ${index + 1}`);
  if (headers.length > 200) throw new Error("The file contains too many columns.");
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapped = Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => {
    const accepted = new Set<string>(aliases);
    return [key, normalizedHeaders.findIndex((header) => accepted.has(header))];
  })) as Record<keyof typeof ALIASES, number>;
  const matchedIndices = new Set(Object.values(mapped).filter((index) => index >= 0));
  const columnMapping = Object.fromEntries(Object.entries(mapped).flatMap(([field, index]) => index < 0 ? [] : [[field, headers[index]]]));
  const errors: VisibilityImport["errors"] = [];
  const rows: VisibilityImportRow[] = [];
  if (matrix.length - 1 > 10000) throw new Error("The file exceeds the 10,000-row import limit.");
  matrix.slice(1).forEach((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, column) => [header, clean(cells[column])])) as Record<string, string | null>;
    const get = (key: keyof typeof ALIASES) => mapped[key] < 0 ? null : clean(cells[mapped[key]]);
    const numeric = (key: "visibilityValue" | "denominator"): number | null => {
      const value = get(key);
      if (value === null) return null;
      const numericText = value.replace(/[%$€£\s]/g, "");
      const parsed = Number(numericText.includes(",")
        ? numericText.includes(".") ? numericText.replace(/,/g, "")
          : /^-?\d{1,3}(,\d{3})+$/.test(numericText) ? numericText.replace(/,/g, "") : numericText.replace(",", ".")
        : numericText);
      if (!Number.isFinite(parsed) || parsed < 0) { errors.push({ rowNumber: index + 2, message: `Invalid ${key} value; it was retained only in raw data.` }); return null; }
      return parsed;
    };
    rows.push({ rowNumber: index + 2, brandMention: get("brandMention"), prompt: get("prompt"), citedDomain: get("citedDomain"), citationUrl: get("citationUrl"), visibilityValue: numeric("visibilityValue"), denominator: numeric("denominator"), raw });
  });
  return { format, scope, headers, rows, columnMapping, unmatchedColumns: headers.filter((_, index) => !matchedIndices.has(index)), errors };
}

export function compareVisibilityScopes(left: AiVisibilityScope, right: AiVisibilityScope): { compatible: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  if (left.market.trim().toLocaleLowerCase("en-IE") !== right.market.trim().toLocaleLowerCase("en-IE")) mismatches.push("market");
  if (left.platform.trim().toLocaleLowerCase("en-IE") !== right.platform.trim().toLocaleLowerCase("en-IE")) mismatches.push("platform");
  if (left.periodStart !== right.periodStart || left.periodEnd !== right.periodEnd) mismatches.push("reporting period");
  if (left.metricDefinition.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IE") !== right.metricDefinition.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IE")) mismatches.push("metric definition");
  return { compatible: mismatches.length === 0, mismatches };
}

function normalizeHeader(value: string): string { return value.trim().toLocaleLowerCase("en-IE").replace(/[_-]+/g, " ").replace(/\s+/g, " "); }
function clean(value: string | undefined): string | null { const trimmed = value?.trim(); return trimmed ? trimmed : null; }
