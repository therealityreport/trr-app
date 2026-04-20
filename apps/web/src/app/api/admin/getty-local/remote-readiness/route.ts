import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getGettyRemoteReadiness } from "@/lib/server/admin/getty-local-scrape";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readiness = await getGettyRemoteReadiness();
  return Response.json(readiness);
}
