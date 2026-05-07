// app/logistics/transportlist/[shipmentId]/page.tsx
import LogisticsRoutePlannerList from '@/components/LogisticsRoutePlannerList';

// ── Next.js 15: params is a Promise ───────────────────────────────────────────
interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

const LinksPage = async ({ params }: PageProps) => {
  const { shipmentId } = await params;

  return (
      <LogisticsRoutePlannerList shipmentId={shipmentId} />
  );
};

export default LinksPage;
