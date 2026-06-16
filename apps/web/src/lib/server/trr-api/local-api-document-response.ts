import "server-only";

import { NextRequest, NextResponse } from "next/server";

const localDevApiDocumentEnabled = (): boolean =>
  process.env.NODE_ENV !== "production" || /^(1|true|yes|on)$/i.test(process.env.TRR_LOCAL_DEV ?? "");

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const wantsBrowserDocument = (request: NextRequest): boolean => {
  const destination = (request.headers.get("sec-fetch-dest") ?? "").trim().toLowerCase();
  if (destination === "document") {
    return true;
  }
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html") && !accept.includes("application/json");
};

export const adminJsonResponse = (
  request: NextRequest,
  data: unknown,
  options?: {
    headers?: HeadersInit;
    status?: number;
    title?: string;
  },
): NextResponse => {
  if (localDevApiDocumentEnabled() && wantsBrowserDocument(request)) {
    const body = JSON.stringify(data, null, 2);
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(options?.title ?? "TRR API")}</title></head><body><pre>${escapeHtml(body)}</pre></body></html>`,
      {
        status: options?.status,
        headers: {
          ...options?.headers,
          "content-type": "text/html; charset=utf-8",
          "x-trr-local-api-document": "1",
        },
      },
    );
  }

  return NextResponse.json(data, {
    ...(options?.status ? { status: options.status } : {}),
    headers: options?.headers,
  });
};
