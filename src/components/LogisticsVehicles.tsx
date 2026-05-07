"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Loader2,
  Truck,
  Plus,
  User,
  Hash,
  Calendar,
} from "lucide-react";

interface Vehicle {
  id: number;
  driver_userid: number | null;
  vehicle_reg: string;
  capacity: number | null;
  status: string;
  name: string;
  created_at: string;
}

export default function LogisticsVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch vehicles
  // ────────────────────────────────────────────────────────────────────────────
  const fetchVehicles = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/logistics/vehicles`
      );

      const data = await res.json();

      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Loading
  // ────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">

        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="text-[#5871A7]" size={28} />
            My Vehicles
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage logistics vehicles and drivers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/logistics/vehicles/add")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors"
        >
          <Plus size={16} />
          Add Vehicle
        </button>
      </div>

      {/* Empty state */}
      {vehicles.length === 0 && (
        <div className="border rounded-xl p-10 text-center text-gray-400">
          No vehicles found
        </div>
      )}

      {/* Vehicle list */}
      <div className="grid gap-3">

        {vehicles.map((v) => (
          <div
            key={v.id}
            className="
              flex items-center justify-between
              p-4 rounded-xl border
              hover:shadow-md transition
              bg-white dark:bg-[#111827]
            "
          >

            <div className="flex items-center justify-between gap-4 w-full">

              {/* Left */}
              <div className="flex items-center gap-4 min-w-0">

                <div className="p-3 rounded-xl bg-[#5871A7]/10 flex-shrink-0">
                  <Truck size={20} className="text-[#5871A7]" />
                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-2 flex-wrap">

                    <p className="font-semibold truncate">
                      {v.name}
                    </p>

                    <span className="
                      text-[10px]
                      uppercase
                      px-2 py-0.5
                      rounded-full
                      font-semibold
                      bg-green-100
                      text-green-700
                    ">
                      {v.status || "active"}
                    </span>

                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-400">

                    <span className="flex items-center gap-1">
                      <Hash size={12} />
                      {v.vehicle_reg}
                    </span>

                    {v.driver_userid && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        Driver #{v.driver_userid}
                      </span>
                    )}

                    {v.capacity && (
                      <span>
                        Capacity: {v.capacity}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>

                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 flex-shrink-0">

                {/* <button
                  type="button"
                  onClick={() =>
                    router.push(`/logistics/vehicles/${v.id}`)
                  }
                  className="
                    text-xs font-semibold
                    px-3 py-1.5
                    rounded-full
                    border
                    hover:bg-gray-100
                    dark:hover:bg-gray-800
                    transition-colors
                  "
                >
                  View
                </button> */}

                <button
                  type="button"
                  onClick={() =>
                    router.push(`/logistics/vehicles/edit/${v.id}`)
                  }
                  className="
                    text-xs font-semibold
                    px-3 py-1.5
                    rounded-full
                    bg-[#5871A7]
                    text-white
                    hover:bg-[#4560A0]
                    transition-colors
                  "
                >
                  Edit Vehicle
                </button>

              </div>

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}