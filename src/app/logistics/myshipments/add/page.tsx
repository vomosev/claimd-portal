// logistics/myshipments/add/page.tsx
import MyLogisticsShipmentForm from "@/components/MyLogisticsShipmentForm";

export default function MyLogisticsShipmentFormPage() {
  return (
    <div className="p-6 lg:p-8">
      <MyLogisticsShipmentForm mode="add" />
    </div>
  );
}