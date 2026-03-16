import { notFound } from "next/navigation";
import CastScreentimePageClient from "./CastScreentimePageClient";
import { isCastScreentimeAdminEnabled } from "@/lib/server/admin/cast-screentime-access";


export default function CastScreentimePage() {
  if (!isCastScreentimeAdminEnabled()) {
    notFound();
  }
  return <CastScreentimePageClient />;
}
