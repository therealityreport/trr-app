import { redirect } from "next/navigation";
import { buildSocialPath } from "@/lib/admin/admin-route-paths";

export default function LegacyAdminSocialCreatorContentPage() {
  redirect(buildSocialPath("creator-content"));
}
