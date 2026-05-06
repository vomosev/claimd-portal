// app/logistics/[shipmentId]/page.tsx
import LogisticsDriverRouteMap from '@/components/LogisticsDriverRouteMap';

const page = () => {
  return <LogisticsDriverRouteMap shipmentId={params.shipmentId} />;
};

export default page;
