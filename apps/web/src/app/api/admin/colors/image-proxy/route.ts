import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DISALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((octet) => !Number.isFinite(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10 || first === 127 || first === 0) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 169 && second === 254) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isDisallowedHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (DISALLOWED_HOSTS.has(normalized) || DISALLOWED_HOSTS.has(normalized.replace(/^\[|\]$/g, ""))) return true;
  if (normalized.endsWith(".localhost") || normalized.endsWith(".local")) return true;
  return isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}

function parseAllowedImageUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("url must be a valid absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }

  if (isDisallowedHost(parsed.hostname)) {
    throw new Error("Host is not allowed");
  }

  return parsed;
}

function redirectLocation(response: Response, currentUrl: URL): URL | null {
  if (response.status < 300 || response.status >= 400) return null;
  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Upstream redirected without a location");
  }
  return new URL(location, currentUrl);
}

async function fetchAllowedImageUrl(url: URL): Promise<Response> {
  let currentUrl = url;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    parseAllowedImageUrl(currentUrl.toString());
    const response = await fetch(currentUrl.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    const nextUrl = redirectLocation(response, currentUrl);
    if (!nextUrl) {
      if (response.url) {
        parseAllowedImageUrl(response.url);
      }
      return response;
    }
    currentUrl = parseAllowedImageUrl(nextUrl.toString());
  }

  throw new Error("Upstream redirected too many times");
}

async function readImageWithLimit(response: Response): Promise<ArrayBuffer> {
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds size limit");
  }

  if (!response.body) {
    const imageBuffer = await response.arrayBuffer();
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds size limit");
    }
    return imageBuffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image exceeds size limit");
    }
    chunks.push(value);
  }

  const image = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return image.buffer;
}

function errorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "failed";
  if (message === "unauthorized") return 401;
  if (message === "forbidden") return 403;
  if (
    message.includes("not allowed") ||
    message.includes("valid absolute URL") ||
    message.includes("Only http/https") ||
    message.includes("redirected")
  ) {
    return 400;
  }
  if (message.includes("exceeds size limit")) return 413;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const raw = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    try {
      parseAllowedImageUrl(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed";
      return NextResponse.json({ error: message }, { status: errorStatus(error) });
    }

    const upstream = await fetchAllowedImageUrl(parseAllowedImageUrl(raw));

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream image request failed with ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "URL did not return an image" }, { status: 415 });
    }

    const imageBuffer = await readImageWithLimit(upstream);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[api] Failed to proxy image", error);
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
