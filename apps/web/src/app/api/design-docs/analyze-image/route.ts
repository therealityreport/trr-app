import { NextRequest, NextResponse } from "next/server";

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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, mimeType: contentType.split(";")[0].trim() };
}

/**
 * Parse a data URL (data:image/png;base64,...) into base64 and mime type.
 */
function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return { base64: dataUrl, mimeType: "image/png" };
  }
  return { base64: match[2], mimeType: match[1] };
}

export async function POST(req: NextRequest) {
  try {
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
      // Resolve relative URLs (e.g., /design-docs/nyt-games/wordle-card.svg) to absolute
      let resolvedUrl = imageUrl!;
      if (resolvedUrl.startsWith("/")) {
        const origin = req.nextUrl.origin || `http://localhost:${process.env.PORT || 3000}`;
        resolvedUrl = `${origin}${resolvedUrl}`;
      }
      const fetched = await fetchImageAsBase64(resolvedUrl);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
