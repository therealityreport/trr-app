import Link from "next/link";
import { buildTypographyDataAttributes } from "@/lib/typography/runtime";

export default function TermsOfSalePage() {
  return (
    <div className="min-h-screen w-full relative bg-white">
      <div className="w-full h-20 border-b border-black flex items-center justify-center">
        <Link href="/" className="text-2xl font-medium font-gloucester text-black hover:text-gray-600 transition-colors" {...buildTypographyDataAttributes({ area: "user-frontend", pageKey: "legal", instanceKey: "document", role: "link" })}>
          The Reality Report
        </Link>
      </div>
      
      <div className="w-full max-w-4xl mx-auto px-4 pt-16">
        <h1 className="text-3xl font-gloucester mb-8" {...buildTypographyDataAttributes({ area: "user-frontend", pageKey: "legal", instanceKey: "document", role: "heading" })}>Terms of Sale</h1>
        <p className="font-hamburg text-gray-600" {...buildTypographyDataAttributes({ area: "user-frontend", pageKey: "legal", instanceKey: "document", role: "body" })}>Terms of Sale content will be added here.</p>
      </div>
    </div>
  );
}
