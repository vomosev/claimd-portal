"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ArrowRight } from "lucide-react";
import toast         from "react-hot-toast";
import { Button } from "./ui/button";

interface Shipment {
  id: number;
  address: string;
  reference: string;
  status: string;
  description: string;
  created_at: string;
  stop_count: number;
}

export default function LogisticsShipments() {
  const [currentUsername, setCurrentUsername] = useState("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [mantlePieceItem, setMantlepiece] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";
  const walletUrl = process.env.NEXT_PUBLIC_WALLET_URL || apiUrl + "/images/wallet.jpg";

  const router = useRouter();

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  const handleGeneratePass = async (userid: string, shipment_id: string) => {
    try {
      setIsGeneratingPass(true);
      toast.success(`Generating card and sending to ${userid}`);
      const formData = {
        userName: currentUsername,
        eventName: shipment_id,
        userid: currentUsername,
        shipment_id: shipment_id,
        eventDate: new Date().toISOString().split('T')[0]
      };

      const response = await fetch(`${apiUrl}/log_wallet/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('JSON response:', data);
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wallet-pass.pkpass';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('Pass downloaded successfully');
          toast.success(`Card generated and sent to ${currentUsername}`);
        }
      } else {
        toast.success('Could not generate card.');
        console.error('Failed to generate pass');
      }
    } catch (error) {
      console.error('Error generating pass:', error);
      toast.error('Error generating pass');
    } finally {
      setIsGeneratingPass(false);
    }
  };

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
                p-4 rounded-xl
                hover:shadow-md transition
                bg-white dark:bg-[#111827]
            "
            >
                <div className="flex items-center justify-between gap-4 w-full">

                    {/* Left side */}
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 rounded-lg bg-[#5871A7]/10 flex-shrink-0">
                            <Package size={18} className="text-[#5871A7]" />
                        </div>

                        <div className="min-w-0">
                            <p className="font-semibold truncate">
                                {s.id} • {s.reference} {`- ${s.description}` || ""}
                            </p>

                            <p className="text-xs text-gray-400">
                                {s.address} • {s.stop_count} stops {`- ${s.status}` || ""}
                            </p>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">

<>
    {/* Loading overlay */}
    {isGeneratingPass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
                <h2>Generating your wallet pass...</h2>
                <h2>Sending a copy by email</h2>
            </div>
        </div>
    )}

    <button
        type="button"
        onClick={() => handleGeneratePass(`${currentUsername}`, `${s.id}`)}
        disabled={isGeneratingPass}
        className="
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-opacity
        "
    >
        <img
            src={apiUrl + "/images/Add_to_Apple_Wallet_badge.svg.png"}
            alt="Add to Apple Wallet"
            style={{
                height: "25px",
                verticalAlign: "middle",
            }}
            className="inline-block"
        />
    </button>
</>

                        <button
                            type="button"
                            onClick={() => router.push(`/logistics/transportlist/${s.id}`)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors"
                        >
                            Plan
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push(`/logistics/transportmap/${s.id}/livetracking`)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors"
                        >
                            View
                        </button>
                    </div>

                </div>
            </div>
        ))}
      </div>
    </div>
  );
}