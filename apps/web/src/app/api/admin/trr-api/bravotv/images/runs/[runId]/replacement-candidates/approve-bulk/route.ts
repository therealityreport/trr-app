import {
  createAdminBackendProxyRoute,
  forwardJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";
const BULK_APPROVE_TIMEOUT_MS = 180_000;

type RouteParams = {
  runId: string;
};

export const POST = createAdminBackendProxyRoute<RouteParams>({
  routeName: "bravotv-run-bulk-approve-replacements",
  method: "POST",
  requiredParams: [{ key: "runId", message: "runId is required" }],
  backendPath: ({ params }) => `/admin/bravotv/images/runs/${params.runId}/replacement-candidates/approve-bulk`,
  body: ({ request }) => forwardJsonRequestBody(request, { defaultValue: {} }),
  timeout: { name: "bravotv-run-bulk-approve-replacements", ms: BULK_APPROVE_TIMEOUT_MS },
  jsonErrorFallback: "Bulk replacement approval failed",
  timeoutError: "Bulk replacement approval timed out",
  timeoutDetail: ({ timeoutMs }) => `Timed out after ${Math.round(timeoutMs / 1000)}s`,
  logMessage: "[api] BRAVOTV bulk replacement approval failed",
});
