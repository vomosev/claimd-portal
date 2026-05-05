// src/app/music/[linkName]/page.tsx
import PublicVariousLinksPage from "@/components/pages/PublicVariousLinksPage";

interface PageProps {
  params: Promise<{
    linkName: string;
  }>;
}

const MusicLinksPage = async ({ params }: PageProps) => {
  const { linkName } = await params;

  return (
    <PublicVariousLinksPage linkName={linkName} />
  );
};

export default MusicLinksPage;
