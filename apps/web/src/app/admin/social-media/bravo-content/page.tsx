import { redirect } from "next/navigation";
import { buildSocialPath } from "@/lib/admin/admin-route-paths";

export default function LegacyAdminSocialBravoContentPage() {
  redirect(buildSocialPath("bravo-content"));
}
