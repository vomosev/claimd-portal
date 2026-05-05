// dashboard/show-music/[catalogue]/page.tsx

import ShowMusicRelease from '@/components/pages/ShowMusicRelease';

interface PageProps {
  params: Promise<{
    catalogue: string;
  }>;
}

export default async function ShowMusicReleasePage({ params }: PageProps) {
  const { catalogue } = await params;

  return <ShowMusicRelease catalogue={catalogue} />;
}