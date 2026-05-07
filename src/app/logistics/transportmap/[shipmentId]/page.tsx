// app/transport/[shipmentId]/page.tsx
import LogisticsRoutePlannerMap from '@/components/LogisticsRoutePlannerMap';

// ── Next.js 15: params is a Promise ───────────────────────────────────────────
interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

const LinksPage = async ({ params }: PageProps) => {
  const { shipmentId } = await params;

  return (
      <LogisticsRoutePlannerMap shipmentId={shipmentId} />
  );
};

export default LinksPage;
