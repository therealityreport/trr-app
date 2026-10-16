import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";
import { buildConnector, Client } from "undici";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class SafeImageFetchError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
    this.name = "SafeImageFetchError";
  }
}

/** Complete IP parsing follows net.isIP; mapped IPv6 uses the IPv4 policy. */
export function isPublicImageAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (family !== 6 || address.includes("%")) return false;
  // WHATWG URL canonicalizes dotted tails and compressed forms after net.isIP validates them.
  const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  const halves = canonical.split("::");
  const left = halves[0] ? halves[0].split(":").map((word) => Number.parseInt(word, 16)) : [];
  const right = halves[1] ? halves[1].split(":").map((word) => Number.parseInt(word, 16)) : [];
  const words = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill(0), ...right] : left;
  if (words.length !== 8) return false;
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    return isPublicImageAddress(`${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`);
  }
  // Public unicast only. Exclude special/transition and documentation ranges.
  return (words[0] & 0xe000) === 0x2000 &&
    !(words[0] === 0x2001 && (words[1] < 0x200 || words[1] === 0xdb8)) &&
    words[0] !== 0x2002 && !(words[0] === 0x3fff && words[1] < 0x1000);
}

export function parsePublicImageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeImageFetchError("Image URL must be a valid absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeImageFetchError("Only http/https image URLs are allowed");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const localName = hostname.replace(/\.$/, "");
  if (url.username || url.password || url.port === "0" || !hostname || hostname.includes("%") ||
      ["localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback"].includes(localName) || localName.endsWith(".localhost") || localName.endsWith(".local") ||
      (isIP(hostname) !== 0 && !isPublicImageAddress(hostname))) {
    throw new SafeImageFetchError("Image host is not allowed");
  }
  return url;
}

async function resolvePublicAddress(url: URL, signal: AbortSignal): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(hostname);
  if (literalFamily) return { address: hostname, family: literalFamily as 4 | 6 };
  // lookup itself cannot be cancelled; caller deadline still bounds awaiting DNS.
  const answers = await new Promise<LookupAddress[]>((resolve, reject) => {
    const abort = () => reject(new SafeImageFetchError("Image request timed out", 504));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    lookup(hostname, { all: true, verbatim: true }).then(resolve, () => {
      reject(new SafeImageFetchError("Image host DNS resolution failed"));
    }).finally(() => signal.removeEventListener("abort", abort));
  });
  if (!Array.isArray(answers) || !answers.length || answers.some((answer) => !isPublicImageAddress(answer.address))) {
    throw new SafeImageFetchError("Image host is not allowed");
  }
  const selected = answers.find((answer) => answer.family === 4) ?? answers[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

interface SafeImageOptions {
  maxBytes?: number;
  maxRedirects?: number;
  connectTimeoutMs?: number;
  bodyTimeoutMs?: number;
  totalTimeoutMs?: number;
}

export interface SafeImageResult {
  status: number;
  contentType: string;
  bytes: ArrayBuffer;
}

/** Fetch every hop through a fresh client whose TCP destination is the validated IP. */
export async function fetchSafeImage(raw: string, options: SafeImageOptions = {}): Promise<SafeImageResult> {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  const maxRedirects = options.maxRedirects ?? 3;
  const connectTimeoutMs = options.connectTimeoutMs ?? 5_000;
  const bodyTimeoutMs = options.bodyTimeoutMs ?? 30_000;
  const totalTimeoutMs = options.totalTimeoutMs ?? 45_000;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isSafeInteger(maxRedirects) || maxRedirects < 0 ||
      [connectTimeoutMs, bodyTimeoutMs, totalTimeoutMs].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new SafeImageFetchError("Invalid image request limits");
  }
  let current = parsePublicImageUrl(raw);
  const controller = new AbortController();
  const totalTimer = setTimeout(() => controller.abort(), totalTimeoutMs);
  try {
    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      const dnsSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(connectTimeoutMs)]);
      const destination = await resolvePublicAddress(current, dnsSignal);
      if (controller.signal.aborted) throw new SafeImageFetchError("Image request timed out", 504);
      const hostname = current.hostname.replace(/^\[|\]$/g, "");
      const connector = buildConnector({
        timeout: connectTimeoutMs,
        rejectUnauthorized: true,
        maxCachedSessions: 0,
        checkServerIdentity: (_servername, certificate) => checkServerIdentity(hostname, certificate),
      });
      const client = new Client(current.origin, {
        allowH2: false,
        pipelining: 0,
        headersTimeout: connectTimeoutMs,
        bodyTimeout: bodyTimeoutMs,
        maxResponseSize: maxBytes,
        connect: (connectOptions, callback) => connector({
          ...connectOptions,
          hostname: destination.address,
          servername: isIP(hostname) ? undefined : hostname,
        }, callback),
      });
      let bodyTimer: ReturnType<typeof setTimeout> | undefined;
      const headersTimer = setTimeout(() => controller.abort(), connectTimeoutMs);
      try {
        const response = await client.request({
          method: "GET",
          path: `${current.pathname}${current.search}`,
          signal: controller.signal,
          headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", "accept-encoding": "identity" },
        });
        clearTimeout(headersTimer);
        // Intentional cancellation of an unread redirect/error body emits an
        // asynchronous error event. The request/iterator carries fetch failures.
        response.body.on("error", () => {});
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          response.body.destroy();
          const location = response.headers.location;
          if (!location || Array.isArray(location)) throw new SafeImageFetchError("Image URL redirected without a location");
          if (redirects >= maxRedirects) throw new SafeImageFetchError("Image URL redirected too many times");
          try { current = parsePublicImageUrl(new URL(location, current).href); }
          catch (error) {
            if (error instanceof SafeImageFetchError) throw error;
            throw new SafeImageFetchError("Image URL redirected to an invalid URL");
          }
          continue;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.body.destroy();
          throw new SafeImageFetchError(`Upstream image request failed with ${response.statusCode}`, 502);
        }
        const contentType = String(response.headers["content-type"] ?? "");
        if (!contentType.toLowerCase().startsWith("image/")) {
          response.body.destroy();
          throw new SafeImageFetchError("URL did not return an image", 415);
        }
        // Undici request returns raw bytes; decline compressed responses instead of decoding an unbounded body.
        if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
          response.body.destroy();
          throw new SafeImageFetchError("Unsupported image content encoding", 415);
        }
        const declaredLength = Number(response.headers["content-length"]);
        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
          response.body.destroy();
          throw new SafeImageFetchError("Image exceeds size limit", 413);
        }
        bodyTimer = setTimeout(() => controller.abort(), bodyTimeoutMs);
        const chunks: Uint8Array[] = [];
        let received = 0;
        for await (const chunk of response.body) {
          received += chunk.length;
          if (received > maxBytes) throw new SafeImageFetchError("Image exceeds size limit", 413);
          chunks.push(chunk);
        }
        const bytes = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        return { status: response.statusCode, contentType, bytes: bytes.buffer };
      } finally {
        clearTimeout(headersTimer);
        if (bodyTimer) clearTimeout(bodyTimer);
        await client.destroy();
      }
    }
    throw new SafeImageFetchError("Image URL redirected too many times");
  } catch (error) {
    if (error instanceof SafeImageFetchError) throw error;
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (controller.signal.aborted || code.includes("TIMEOUT") || code === "UND_ERR_ABORTED") {
      throw new SafeImageFetchError("Image request timed out", 504);
    }
    if (code === "UND_ERR_RES_EXCEEDED_MAX_SIZE") throw new SafeImageFetchError("Image exceeds size limit", 413);
    throw new SafeImageFetchError("Image request failed", 502);
  } finally {
    clearTimeout(totalTimer);
  }
}
