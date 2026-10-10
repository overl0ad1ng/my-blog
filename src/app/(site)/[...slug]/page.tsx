import { Suspense } from "react";
import { DocumentLoading, DocumentPage } from "@/components/DocumentPage";

async function Content({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DocumentPage slug={slug} />;
}

export default function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  return (
    <Suspense fallback={<DocumentLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
