// logistics/vehicles/edit/[vehicleId]/page.tsx
"use client";

import LogisticsVehicleForm from "@/components/LogisticsVehicleForm";

export default function LogisticsVehicleEditPage({
  params,
}: {
  params: { vehicleId: string };
}) {

  const vehicleId = Number(params.vehicleId);

  if (!vehicleId || isNaN(vehicleId)) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-500">
          Invalid vehicle ID.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <LogisticsVehicleForm
        mode="edit"
        vehicleId={vehicleId}
      />
    </div>
  );
}