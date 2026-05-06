// app/logistics/[shipmentId]/page.tsx
import LogisticsDriverRouteMap from '@/components/LogisticsDriverRouteMap';

// ── Next.js 15: params is a Promise ───────────────────────────────────────────
interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

const LinksPage = async ({ params }: PageProps) => {
  const { shipmentId } = await params;

  return (
      <LogisticsDriverRouteMap shipmentId={shipmentId} />
  );
};

export default LinksPage;
