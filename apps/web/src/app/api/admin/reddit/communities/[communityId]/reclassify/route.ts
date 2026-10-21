import { NextRequest } from "next/server";
import { operatorProxy } from "@/app/api/admin/reddit/operator-proxy";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, { params }: { params: Promise<{ communityId: string }> }) {
  return operatorProxy(request, params, "reclassify");
}
