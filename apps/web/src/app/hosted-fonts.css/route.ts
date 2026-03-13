import { buildHostedFontsStylesheet } from "@/lib/fonts/hosted-font-stylesheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const css = buildHostedFontsStylesheet();

  return new Response(css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
