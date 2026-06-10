import {
  createAdminBackendProxyRoute,
  forwardJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";
const RESOLVE_TIMEOUT_MS = 30_000;

type RouteParams = {
  runId: string;
};

export const POST = createAdminBackendProxyRoute<RouteParams>({
  routeName: "bravotv-run-resolve-duplicate",
  method: "POST",
  requiredParams: [{ key: "runId", message: "runId is required" }],
  backendPath: ({ params }) => `/admin/bravotv/images/runs/${params.runId}/duplicates/resolve`,
  body: ({ request }) => forwardJsonRequestBody(request, { defaultValue: {} }),
  timeout: { name: "bravotv-run-resolve-duplicate", ms: RESOLVE_TIMEOUT_MS },
  jsonErrorFallback: "Duplicate resolution failed",
  timeoutError: "Duplicate resolution timed out",
  timeoutDetail: ({ timeoutMs }) => `Timed out after ${Math.round(timeoutMs / 1000)}s`,
  logMessage: "[api] BRAVOTV duplicate resolution failed",
});
