// admin/shipment/add/page.tsx
import LogisticsShipmentForm from "@/components/LogisticsShipmentForm";

export default function LogisticsShipmentPage() {
  return (
    <div className="p-6 lg:p-8">
      <LogisticsShipmentForm mode="add" />
    </div>
  );
}