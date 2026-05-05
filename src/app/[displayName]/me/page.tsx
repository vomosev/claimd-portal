// src/app/[displayName]/me/page.tsx
import PublicLinksPage from "@/components/pages/PublicLinksPage";

interface PageProps {
  params: Promise<{
    displayName: string;
  }>;
}

const LinksPage = async ({ params }: PageProps) => {
  const { displayName } = await params;

  return (
    <PublicLinksPage displayName={displayName} />
  );
};

export default LinksPage;
