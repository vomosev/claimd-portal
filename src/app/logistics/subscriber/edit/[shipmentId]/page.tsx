// logistics/shipments/edit/[shipmentId]/page.tsx
"use client";

import { use } from "react";
import LogisticsShipmentForm from "@/components/LogisticsShipmentForm";

interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

export default function LogisticsShipmentFormPage({ params }: PageProps) {
  const { shipmentId } = use(params);

  if (!shipmentId || shipmentId.trim() === "") {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-500">Invalid shipment ID.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <LogisticsShipmentForm mode="edit" shipmentId={Number(shipmentId)} />
    </div>
  );
}