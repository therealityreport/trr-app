import { createAdminBackendProxyRoute } from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";
const SEARCH_TIMEOUT_MS = 45_000; // PicDetective can be slow

type MediaAssetRouteParams = {
  assetId: string;
};

export const POST = createAdminBackendProxyRoute<MediaAssetRouteParams>({
  routeName: "media-asset-reverse-image-search",
  method: "POST",
  requiredParams: [{ key: "assetId", message: "assetId is required" }],
  backendPath: ({ params }) => `/admin/media-assets/${params.assetId}/reverse-image-search`,
  body: () => ({
    body: "{}",
    contentType: "application/json",
  }),
  timeout: { name: "image-reverse-image-search", ms: SEARCH_TIMEOUT_MS },
  jsonErrorFallback: "Search failed",
  timeoutError: "Search timed out",
  timeoutDetail: ({ timeoutMs }) => `Timed out after ${Math.round(timeoutMs / 1000)}s`,
  logMessage: "[api] reverse-image-search failed",
});
