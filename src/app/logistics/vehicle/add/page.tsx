// logistics/vehicle/add/page.tsx
import LogisticsVehicleForm from "@/components/LogisticsVehicleForm";

export default function LogisticsVehicleFormPage() {
  return (
    <div className="p-6 lg:p-8">
      <LogisticsVehicleForm mode="add" />
    </div>
  );
}