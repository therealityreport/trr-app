import {
  createAdminBackendProxyRoute,
  forwardJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";
const APPROVE_TIMEOUT_MS = 120_000;

type RouteParams = {
  runId: string;
  groupId: string;
};

export const POST = createAdminBackendProxyRoute<RouteParams>({
  routeName: "bravotv-run-approve-replacement",
  method: "POST",
  requiredParams: [
    { key: "runId", message: "runId is required" },
    { key: "groupId", message: "groupId is required" },
  ],
  backendPath: ({ params }) =>
    `/admin/bravotv/images/runs/${params.runId}/replacement-candidates/${params.groupId}/approve`,
  body: ({ request }) => forwardJsonRequestBody(request, { defaultValue: {} }),
  timeout: { name: "bravotv-run-approve-replacement", ms: APPROVE_TIMEOUT_MS },
  jsonErrorFallback: "Replacement approval failed",
  timeoutError: "Replacement approval timed out",
  timeoutDetail: ({ timeoutMs }) => `Timed out after ${Math.round(timeoutMs / 1000)}s`,
  logMessage: "[api] BRAVOTV replacement approval failed",
});
