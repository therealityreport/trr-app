import { Suspense } from "react";
import CastReferenceReviewPageClient from "./CastReferenceReviewPageClient";

export default function CastReferenceReviewPage() {
  return (
    <Suspense>
      <CastReferenceReviewPageClient />
    </Suspense>
  );
}
