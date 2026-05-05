// app/seatingplan/[awardId]/page.tsx

import SeatingPlanBuilder from "@/components/SeatingPlanBuilder";

interface PageProps {
  params: Promise<{ awardId: string }>;
}

const SeatingPlanBuilderPage = async ({ params }: PageProps) => {
  const { awardId } = await params;
  return <SeatingPlanBuilder awardId={awardId} />;
};

export default SeatingPlanBuilderPage;