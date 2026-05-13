// app/logistics/transportmap/[shipmentId]/livetracking/page.tsx
import LogisticsLiveTracking from '@/components/LogisticsLiveTracking';

// ── Next.js 15: params is a Promise ───────────────────────────────────────────
interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

const LinksPage = async ({ params }: PageProps) => {
  const { shipmentId } = await params;

  return (
      <LogisticsLiveTracking shipmentId={shipmentId} />
  );
};

export default LinksPage;
