import { Suspense } from "react";
import { DocumentLoading, DocumentPage } from "@/components/DocumentPage";

export default function Home() {
  return (
    <Suspense fallback={<DocumentLoading />}>
      <DocumentPage />
    </Suspense>
  );
}
