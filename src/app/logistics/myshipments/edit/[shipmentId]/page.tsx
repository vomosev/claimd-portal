// logistics/myshipments/edit/[shipmentId]/page.tsx
"use client";

import { use } from "react";
import MyLogisticsShipmentForm from "@/components/MyLogisticsShipmentForm";

interface PageProps {
  params: Promise<{ shipmentId: string }>;
}

export default function MyLogisticsShipmentFormPage({ params }: PageProps) {
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
      <MyLogisticsShipmentForm mode="edit" shipmentId={Number(shipmentId)} />
    </div>
  );
}