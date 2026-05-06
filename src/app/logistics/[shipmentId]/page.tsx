// app/logistics/[shipmentId]/page.tsx
import dynamic from "next/dynamic";

const LogisticsDriverRouteMap = dynamic(
  () => import("@/components/LogisticsDriverRouteMap"),
  {
    ssr:     false,
    loading: () => (
      <div className="h-[500px] rounded-xl border border-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    ),
  }
);

// ── Next.js 15: params is a Promise ───────────────────────────────────────────
interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

export default async function Page({ params }: PageProps) {
  // ── Await params before destructuring ─────────────────────────────────────
  const { shipmentId } = await params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Route — Shipment {shipmentId}
      </h1>
      <LogisticsDriverRouteMap shipmentId={shipmentId} />
    </div>
  );
}