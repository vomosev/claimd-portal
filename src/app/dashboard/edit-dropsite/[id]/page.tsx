import DropsiteForm from "../../../../components/shared/DropsiteForm";
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const EditDropsitePage = async ({ params }: PageProps) => {
  const { id } = await params;
  return <DropsiteForm mode="edit" worldId={id} />;
};

export default EditDropsitePage;
