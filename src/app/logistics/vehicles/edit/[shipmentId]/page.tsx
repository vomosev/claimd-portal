// logistics/vehicle/edit/[vehicleId]/page.tsx
"use client";

import { use } from "react";
import LogisticsVehicleForm from "@/components/LogisticsVehicleForm";

interface PageProps {
  params: Promise<{ vehicleId: string }>;
}

export default function LogisticsVehicleFormPage({ params }: PageProps) {
  const { vehicleId } = use(params);

  if (!vehicleId || vehicleId.trim() === "") {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-500">Invalid vehicle ID.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <LogisticsVehicleForm mode="edit" vehicleId={Number(vehicleId)} />
    </div>
  );
}