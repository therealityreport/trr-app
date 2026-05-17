import { IMAGE_PIPELINE_TIMEOUTS } from "@/lib/admin/image-pipeline-timeouts";
import {
  createAdminBackendProxyRoute,
  readJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";

type CastPhotoRouteParams = {
  photoId: string;
};

type ForceBody = {
  force: boolean;
};

export const POST = createAdminBackendProxyRoute<CastPhotoRouteParams, ForceBody>({
  routeName: "cast-photo-detect-text-overlay",
  method: "POST",
  requiredParams: [{ key: "photoId", message: "photoId is required" }],
  backendPath: ({ params }) => `/admin/cast-photos/${params.photoId}/detect-text-overlay`,
  body: async ({ request }) => {
    const body = (await readJsonRequestBody(request, { defaultValue: {} })) as { force?: unknown };
    const force = Boolean(body.force);
    return {
      body: JSON.stringify({ force }),
      contentType: "application/json",
      value: { force },
    };
  },
  query: ({ bodyValue }) => ({
    force: bodyValue?.force ? "true" : "false",
  }),
  timeout: {
    name: "image-detect-text-overlay",
    ms: IMAGE_PIPELINE_TIMEOUTS.detectTextOverlayMs,
  },
  jsonErrorFallback: "Detect text overlay failed",
  timeoutError: "Detect text overlay timed out",
  timeoutDetail: ({ timeoutMs }) =>
    `Timed out waiting for backend detect-text-overlay response (${Math.round(timeoutMs / 1000)}s).`,
  logMessage: "[api] Failed to detect text overlay for cast photo",
});
