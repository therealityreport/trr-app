import { redirect } from "next/navigation";
import { ADMIN_SOCIAL_PATH } from "@/lib/admin/admin-route-paths";

export default function LegacyAdminSocialMediaPage() {
  redirect(ADMIN_SOCIAL_PATH);
}
