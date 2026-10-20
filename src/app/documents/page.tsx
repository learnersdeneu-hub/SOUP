import { redirect } from "next/navigation";

// Standard Documents was removed from the My Application Progress stepper
// (see src/lib/applications/progress.ts) in favor of explicit,
// category-specific uploads embedded directly in Profile & Details,
// Education Background, Testing, Funding and Extracurricular &
// Recommendations — see src/components/documents/UploadBox.tsx. This page
// no longer has a dedicated view; the review-status/rejection-reason
// detail it used to show, and the generic AI-classified upload
// (DirectDocumentUpload), are still reachable inline on /dashboard.
export default function DocumentsPage() {
  redirect("/dashboard");
}
