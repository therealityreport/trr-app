import { redirect } from "next/navigation";

import { buildDesignSystemHref } from "@/lib/admin/design-system-routing";

export default function DesignSystemIndexPage() {
  redirect(buildDesignSystemHref("fonts"));
}
