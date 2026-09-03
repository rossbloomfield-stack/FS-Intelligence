import { FatalError, RetryableError } from "workflow";
import { assertAllowedIngestionUrl } from "@/lib/intelligence/ingestion/parser";

const USER_AGENT =
  "FS-Intelligence/1.0 (+https://www.rossbloomfield.com/intelligence/methodology)";

export async function fetchBoundedSource(
  value: string,
  allowedHosts: ReadonlySet<string>,
  options: { maxBytes: number; timeoutMs: number; accept: string },
) {
  let current = assertAllowedIngestionUrl(value, allowedHosts);
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    const response = await fetch(current, {
      headers: { Accept: options.accept, "User-Agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location)
        throw new FatalError(
          "Official source returned a redirect without a destination",
        );
      current = assertAllowedIngestionUrl(
        new URL(location, current).toString(),
        allowedHosts,
      );
      continue;
    }
    if (response.status === 429) {
      throw new RetryableError("Official source rate limited the request", {
        retryAfter: "5m",
      });
    }
    if (response.status >= 500) {
      throw new RetryableError(
        `Official source returned HTTP ${response.status}`,
        { retryAfter: "2m" },
      );
    }
    if (!response.ok)
      throw new FatalError(`Official source returned HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > options.maxBytes) {
      throw new FatalError(
        `Official source exceeds the ${formatMegabytes(options.maxBytes)} MB ingestion limit`,
      );
    }
    const body = await readBoundedBody(response, options.maxBytes);
    return { response, body, url: current.toString() };
  }
  throw new FatalError("Official source exceeded the redirect limit");
}

async function readBoundedBody(response: Response, limit: number) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new FatalError(
        "Official source exceeded the bounded download limit",
      );
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function formatMegabytes(bytes: number) {
  return Math.max(1, Math.round(bytes / (1024 * 1024)));
}
