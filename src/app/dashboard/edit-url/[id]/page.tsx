// dashboard/edit-url/[id]/page.tsx

import UrlForm from "@/components/UrlForm";

interface EditUrlPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditUrlPage({ params }: EditUrlPageProps) {
  const { id } = await params;

  return <UrlForm mode="edit" recordId={Number(id)} />;
}