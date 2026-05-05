// src/app/[displayName]/page.tsx
import PublicMantlePiecePage from "@/components/pages/PublicMantlePiecePage";
import PublicLayout from "@/components/layout/PublicDisplayLayout";

interface PageProps {
  params: Promise<{
    displayName: string;
  }>;
}

const PublicMantlepiecePage = async ({ params }: PageProps) => {
  const { displayName } = await params;

  return (
    <PublicLayout displayName={displayName}>
      <PublicMantlePiecePage displayName={displayName} />
    </PublicLayout>
  );
};

export default PublicMantlepiecePage;
