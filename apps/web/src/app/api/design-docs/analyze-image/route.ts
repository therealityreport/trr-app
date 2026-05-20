import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";

/* ------------------------------------------------------------------ */
/*  Design Docs — Gemini Image Understanding API                       */
/*  Analyzes a reference image and returns a detailed recreation prompt */
/* ------------------------------------------------------------------ */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DISALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const SYSTEM_PROMPT =
  "You are a design system analyst. Describe this image in precise detail suitable as a prompt for an AI image generator. Include: exact art style (flat, 3D, sketch, etc.), composition and layout, all colors with hex values where identifiable, shapes and geometric elements, textures and gradients, typography style if present, mood and atmosphere, and any distinctive design elements. Be specific enough that another AI model could recreate this image faithfully. Output ONLY the prompt text, no preamble.";

interface AnalyzeRequest {
  imageUrl?: string;
  imageBase64?: string;
}

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

function parseAllowedImageUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("imageUrl must be a valid absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https image URLs are allowed");
  }

  if (isDisallowedHost(parsed.hostname)) {
    throw new Error("Image host is not allowed");
  }

  return parsed;
}

function redirectLocation(response: Response, currentUrl: URL): URL | null {
  if (response.status < 300 || response.status >= 400) return null;
  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Image URL redirected without a location");
  }
  return new URL(location, currentUrl);
}

async function fetchAllowedImageUrl(url: URL): Promise<Response> {
  let currentUrl = url;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    parseAllowedImageUrl(currentUrl.toString());
    const response = await fetch(currentUrl.toString(), {
      redirect: "manual",
      headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
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

  throw new Error("Image URL redirected too many times");
}

async function readResponseBytesWithLimit(response: Response): Promise<ArrayBuffer> {
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds size limit");
  }

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds size limit");
    }
    return buffer;
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

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer.buffer;
}

/**
 * Fetch an image URL and return its base64 representation + mime type.
 */
async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetchAllowedImageUrl(parseAllowedImageUrl(url));
  if (!res.ok) {
    throw new Error(`Failed to fetch image: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/png";
  const mimeType = contentType.split(";")[0].trim().toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new Error("URL did not return an image");
  }
  const buffer = await readResponseBytesWithLimit(res);
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, mimeType };
}

/**
 * Parse a data URL (data:image/png;base64,...) into base64 and mime type.
 */
function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    if (Buffer.byteLength(dataUrl, "base64") > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds size limit");
    }
    return { base64: dataUrl, mimeType: "image/png" };
  }
  if (!match[1].toLowerCase().startsWith("image/")) {
    throw new Error("imageBase64 must contain image data");
  }
  if (Buffer.byteLength(match[2], "base64") > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds size limit");
  }
  return { base64: match[2], mimeType: match[1] };
}

function adminErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
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
  if (message.includes("did not return an image") || message.includes("must contain image data")) return 415;
  return 500;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as AnalyzeRequest;
    const { imageUrl, imageBase64 } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: "imageUrl or imageBase64 is required" },
        { status: 400 },
      );
    }

    // Resolve the image to inline base64 for the Gemini API
    let base64: string;
    let mimeType: string;

    if (imageBase64) {
      const parsed = parseDataUrl(imageBase64);
      base64 = parsed.base64;
      mimeType = parsed.mimeType;
    } else {
      const fetched = await fetchImageAsBase64(imageUrl!);
      base64 = fetched.base64;
      mimeType = fetched.mimeType;

      // Gemini doesn't support SVG — fall back to sending it as text description
      if (mimeType === "image/svg+xml") {
        const svgText = Buffer.from(base64, "base64").toString("utf-8");
        // Use Gemini text-only to analyze the SVG markup
        const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const textRes = await fetch(textUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${SYSTEM_PROMPT}\n\nHere is the SVG source code of the image to analyze:\n\n${svgText}`,
              }],
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          }),
        });
        if (!textRes.ok) {
          const err = await textRes.text();
          throw new Error(`Gemini SVG analysis error ${textRes.status}: ${err}`);
        }
        const textData = await textRes.json();
        const candidates = textData.candidates ?? [];
        for (const candidate of candidates) {
          for (const part of (candidate.content?.parts ?? [])) {
            if (part.text) {
              return NextResponse.json({ prompt: part.text.trim() });
            }
          }
        }
        throw new Error("No text response from Gemini SVG analysis");
      }
    }

    // Call Gemini 2.5 Flash for image understanding
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini analysis error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Extract the text response
    const candidates = data.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        if (part.text) {
          return NextResponse.json({ prompt: part.text.trim() });
        }
      }
    }

    throw new Error("No text response from Gemini analysis");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[design-docs/analyze-image]", message);
    return NextResponse.json({ error: message }, { status: adminErrorStatus(err) });
  }
}
