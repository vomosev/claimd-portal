// src/app/award-details/[id]/[displayname]/page.tsx

import PublicAwardDetailsPage from "@/components/pages/PublicAwardDetailsPage";
import PublicLayout from "@/components/layout/PublicDisplayLayout";

interface PageProps {
  params: Promise<{
    id: string;
    displayName: string;
  }>;
}

const PublicAwardDetailsRoute = async ({ params }: PageProps) => {
  const { id, displayName } = await params;

  return (
    <PublicLayout displayName={displayName}>
      <PublicAwardDetailsPage />
    </PublicLayout>
  );
  return ;
};

export default PublicAwardDetailsRoute;
