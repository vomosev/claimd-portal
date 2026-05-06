// app/logistics/[shipmentId]/page.tsx
import LogisticsDriverRouteMap from '@/components/LogisticsDriverRouteMap';

const page = ({ params }: { params: { shipmentId: string } }) => {
  return <LogisticsDriverRouteMap shipmentId={params.shipmentId} />;
};

export default page;
