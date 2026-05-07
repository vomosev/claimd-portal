"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ArrowRight } from "lucide-react";

interface Shipment {
  id: number;
  reference: string;
  status: string;
  description: string;
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

      <h1 className="text-xl font-semibold">Vehicle Routes</h1>

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
                bg-white dark:bg-[#111827]
            "           
            >
                <div className="flex items-center justify-between gap-4 w-full">

                    {/* Left side */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-[#5871A7]/10 flex-shrink-0">
                            <Package size={18} />
                        </div>

                        <div className="min-w-0">
                            <p className="font-semibold truncate">
                                Shipment {s.id} • {s.reference} - {s.description}
                            </p>

                            <p className="text-xs text-gray-400">
                                {s.stop_count} stops • {s.status}
                            </p>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => router.push(`/logistics/transportlist/${s.id}`)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors"
                        >
                            Plan Route
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push(`/logistics/transportmap/${s.id}`)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors"
                        >
                            View Route
                        </button>
                    </div>

                </div>
            </div>
        ))}
      </div>
    </div>
  );
}