"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ArrowRight } from "lucide-react";

interface Shipment {
  id: number;
  reference: string;
  status: string;
  created_at: string;
  stop_count: number;
}

export default function LogisticsShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const fetchShipments = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/logistics/shipments`
      );

      const data = await res.json();
      setShipments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <h1 className="text-2xl font-semibold">Shipments</h1>

      {shipments.length === 0 && (
        <p className="text-gray-400">No shipments found</p>
      )}

      <div className="grid gap-3">
        {shipments.map((s) => (
          <div
            key={s.id}
            className="
              flex items-center justify-between
              p-4 rounded-xl border
              hover:shadow-md transition cursor-pointer
            "
            onClick={() => router.push(`/logistics/transportmap/${s.id}`)}
          >
            <div className="flex items-center gap-3">

              <div className="p-2 rounded-lg bg-[#5871A7]/10">
                <Package size={18} />
              </div>

              <div>
                <p className="font-semibold">
                  {s.reference || `Shipment ${s.id}`}
                </p>
                <p className="text-xs text-gray-400">
                  {s.stop_count} stops • {s.status}
                </p>
              </div>
            </div>

            <ArrowRight size={16} className="text-gray-400" />
          </div>
        ))}
      </div>
    </div>
  );
}