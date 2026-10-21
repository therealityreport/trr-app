import { NextRequest } from "next/server";
import { operatorProxy } from "@/app/api/admin/reddit/operator-proxy";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ communityId: string }> }) {
  return operatorProxy(request, params, "settings");
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ communityId: string }> }) {
  return operatorProxy(request, params, "settings");
}
