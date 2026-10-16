import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { fetchSafeImage, MAX_IMAGE_BYTES, SafeImageFetchError } from "@/lib/server/safe-image-fetch";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Design Docs — Gemini Image Understanding API                       */
/*  Analyzes a reference image and returns a detailed recreation prompt */
/* ------------------------------------------------------------------ */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

const SYSTEM_PROMPT =
  "You are a design system analyst. Describe this image in precise detail suitable as a prompt for an AI image generator. Include: exact art style (flat, 3D, sketch, etc.), composition and layout, all colors with hex values where identifiable, shapes and geometric elements, textures and gradients, typography style if present, mood and atmosphere, and any distinctive design elements. Be specific enough that another AI model could recreate this image faithfully. Output ONLY the prompt text, no preamble.";

interface AnalyzeRequest {
  imageUrl?: string;
  imageBase64?: string;
}

/**
 * Fetch an image URL and return its base64 representation + mime type.
 */
async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetchSafeImage(url);
  const mimeType = res.contentType.split(";")[0].trim().toLowerCase();
  const base64 = Buffer.from(res.bytes).toString("base64");
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
  if (error instanceof SafeImageFetchError) return error.status;
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
    const status = adminErrorStatus(err);
    const message = err instanceof SafeImageFetchError || status === 401 || status === 403 || status === 413 || status === 415
      ? (err as Error).message : "Image analysis failed";
    console.error("[design-docs/analyze-image]", message);
    return NextResponse.json({ error: message }, { status: adminErrorStatus(err) });
  }
}
