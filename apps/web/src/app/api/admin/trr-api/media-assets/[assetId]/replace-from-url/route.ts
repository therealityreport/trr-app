import {
  createAdminBackendProxyRoute,
  forwardJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";
const REPLACE_TIMEOUT_MS = 120_000; // Download + S3 upload + variant gen

type MediaAssetRouteParams = {
  assetId: string;
};

export const POST = createAdminBackendProxyRoute<MediaAssetRouteParams>({
  routeName: "media-asset-replace-from-url",
  method: "POST",
  requiredParams: [{ key: "assetId", message: "assetId is required" }],
  backendPath: ({ params }) => `/admin/media-assets/${params.assetId}/replace-from-url`,
  body: ({ request }) => forwardJsonRequestBody(request, { defaultValue: {} }),
  timeout: { name: "image-replace-from-url", ms: REPLACE_TIMEOUT_MS },
  jsonErrorFallback: "Replace failed",
  timeoutError: "Replace timed out",
  timeoutDetail: ({ timeoutMs }) => `Timed out after ${Math.round(timeoutMs / 1000)}s`,
  logMessage: "[api] replace-from-url failed",
});
