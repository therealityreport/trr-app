import "server-only";

import {
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

type PrimaryReadOptions = Pick<
  NonNullable<Parameters<typeof fetchAdminBackendJson>[1]>,
  "routeName" | "adminContext" | "apiVersion" | "queryString"
>;

// These reads are required to open a page. Allow the primary request budget and
// one recovery attempt for transport failures; never replay a mutation or auth error.
export async function fetchAdminPrimaryRead(path: string, options: PrimaryReadOptions) {
  const read = () => fetchAdminBackendJson(path, { ...options, requestRole: "primary" });
  let result;
  try {
    result = await read();
    if (![408, 500, 502, 503, 504].includes(result.status) || !buildAdminBackendStatusError({
      status: result.status,
      data: result.data,
      fallbackMessage: "Required admin read failed",
      routeName: options.routeName ?? path,
      requestRole: "primary",
    }).retryable) {
      return result;
    }
  } catch (error) {
    if (!(error instanceof AdminReadProxyError) || !error.retryable ||
        ![408, 500, 502, 503, 504].includes(error.status)) {
      throw error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  return read();
}
