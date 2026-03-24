import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Design Docs — AI Image Generation API                              */
/*  Generates icons/illustrations via Gemini or GPT image models       */
/* ------------------------------------------------------------------ */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

type ModelId =
  | "gemini-flash"
  | "gemini-pro"
  | "gpt-image";

interface GenerateRequest {
  prompt: string;
  model: ModelId;
  size?: string;
}

async function generateWithGemini(
  prompt: string,
  modelVariant: "flash" | "pro",
): Promise<string> {
  const model =
    modelVariant === "flash"
      ? "gemini-3.1-flash-image-preview"
      : "gemini-3-pro-image-preview";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${modelVariant} error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Extract image from response
  const candidates = data.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image in Gemini response");
}

async function generateWithGPT(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT Image error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }

  const url = data.data?.[0]?.url;
  if (url) return url;

  throw new Error("No image in GPT response");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { prompt, model } = body;

    if (!prompt || !model) {
      return NextResponse.json(
        { error: "prompt and model are required" },
        { status: 400 },
      );
    }

    let imageUrl: string;

    switch (model) {
      case "gemini-flash":
        if (!GEMINI_API_KEY) {
          return NextResponse.json(
            { error: "GEMINI_API_KEY not configured" },
            { status: 500 },
          );
        }
        imageUrl = await generateWithGemini(prompt, "flash");
        break;

      case "gemini-pro":
        if (!GEMINI_API_KEY) {
          return NextResponse.json(
            { error: "GEMINI_API_KEY not configured" },
            { status: 500 },
          );
        }
        imageUrl = await generateWithGemini(prompt, "pro");
        break;

      case "gpt-image":
        if (!OPENAI_API_KEY) {
          return NextResponse.json(
            { error: "OPENAI_API_KEY not configured" },
            { status: 500 },
          );
        }
        imageUrl = await generateWithGPT(prompt);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown model: ${model}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ imageUrl, model, prompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[design-docs/generate-image]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
