import { buildHostedFontAssetPath, buildHostedFontUrl } from "@/lib/fonts/hosted-fonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildProxyTarget(assetPath: string[] | undefined): string {
  const joinedPath = assetPath?.join("/") ?? "";
  return buildHostedFontUrl(buildHostedFontAssetPath(`/fonts/${joinedPath}`));
}

function copyHeaderIfPresent(
  source: Headers,
  target: Headers,
  name: string,
) {
  const value = source.get(name);
  if (value) target.set(name, value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetPath?: string[] }> },
) {
  const { assetPath } = await context.params;
  const upstreamResponse = await fetch(buildProxyTarget(assetPath), {
    cache: "force-cache",
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return new Response(null, { status: upstreamResponse.status || 502 });
  }

  const responseHeaders = new Headers();
  for (const headerName of [
    "content-type",
    "cache-control",
    "content-length",
    "etag",
    "last-modified",
    "accept-ranges",
  ]) {
    copyHeaderIfPresent(upstreamResponse.headers, responseHeaders, headerName);
  }

  responseHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
