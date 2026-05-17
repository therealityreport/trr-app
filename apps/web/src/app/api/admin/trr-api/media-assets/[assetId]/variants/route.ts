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
  routeName: "media-asset-variants",
  method: "POST",
  requiredParams: [{ key: "assetId", message: "assetId is required" }],
  backendPath: ({ params }) => `/admin/media-assets/${params.assetId}/variants`,
  body: ({ request }) =>
    forwardJsonRequestBody(request, {
      onlyWhenJsonContentType: true,
      defaultValue: {},
    }),
  timeout: { name: "image-variants", ms: IMAGE_PIPELINE_TIMEOUTS.variantsMs },
  jsonErrorFallback: "Variant generation failed",
  timeoutError: "Variant generation timed out",
  timeoutDetail: ({ timeoutMs }) =>
    `Timed out waiting for backend variant response (${Math.round(timeoutMs / 1000)}s).`,
  logMessage: "[api] Failed to generate media asset variants",
});
