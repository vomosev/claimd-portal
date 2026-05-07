// src/app/logistics/vehicles/edit/[vehicleId]/page.tsx
import LogisticsVehicleForm from "@/components/LogisticsVehicleForm";

interface PageProps {
  params: Promise<{
    vehicleId: string;
  }>;
}

export default async function LogisticsVehicleEditPage({
  params,
}: PageProps) {

  const { vehicleId } = await params;

  const parsedVehicleId = Number(vehicleId);

  if (!parsedVehicleId || isNaN(parsedVehicleId)) {
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
        vehicleId={parsedVehicleId}
      />
    </div>
  );
}