import { IMAGE_PIPELINE_TIMEOUTS } from "@/lib/admin/image-pipeline-timeouts";
import {
  createAdminBackendProxyRoute,
  forwardJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";

type MediaAssetRouteParams = {
  assetId: string;
};

export const POST = createAdminBackendProxyRoute<MediaAssetRouteParams>({
  routeName: "media-asset-mirror",
  method: "POST",
  requiredParams: [{ key: "assetId", message: "assetId is required" }],
  backendPath: ({ params }) => `/admin/media-assets/${params.assetId}/mirror`,
  body: ({ request }) =>
    forwardJsonRequestBody(request, {
      onlyWhenJsonContentType: true,
      defaultValue: {},
    }),
  timeout: { name: "image-mirror", ms: IMAGE_PIPELINE_TIMEOUTS.mirrorMs },
  jsonErrorFallback: "Mirror failed",
  timeoutError: "Mirror timed out",
  timeoutDetail: ({ timeoutMs }) =>
    `Timed out waiting for backend mirror response (${Math.round(timeoutMs / 1000)}s).`,
  logMessage: "[api] Failed to mirror media asset",
});
