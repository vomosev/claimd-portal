// app/logistics/transport/[shipmentId]/page.tsx
import LogisticsRoutePlanner from '@/components/LogisticsRoutePlanner';

// ── Next.js 15: params is a Promise ───────────────────────────────────────────
interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

const LinksPage = async ({ params }: PageProps) => {
  const { shipmentId } = await params;

  return (
      <LogisticsRoutePlanner shipmentId={shipmentId} />
  );
};

export default LinksPage;
