// components/LogisticsDriverRouteMap.tsx
"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import polyline from "@mapbox/polyline";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default icons ─────────────────────────────────────────────────
const defaultIcon = L.icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stop {
  id?:       string | number;
  latitude:  number | string | null;
  longitude: number | string | null;
  label?:    string;
}

interface Route {
  polyline?: string;
}

interface LogisticsDriverRouteMapProps {
  shipmentId: string | number;
}

// ── Coordinate validator ───────────────────────────────────────────────────────
function isValidCoord(lat: any, lng: any): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    lat != null && lng != null &&
    !isNaN(la) && !isNaN(ln) &&
    la >= -90  && la <= 90 &&
    ln >= -180 && ln <= 180
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function LogisticsDriverRouteMap({
  shipmentId,
}: LogisticsDriverRouteMapProps) {
  const [route,   setRoute]   = useState<Route | null>(null);
  const [stops,   setStops]   = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!shipmentId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [stopsRes, routeRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/route/${shipmentId}`),
        ]);

        if (stopsRes.ok) {
          const data = await stopsRes.json();
          const raw: Stop[] = Array.isArray(data) ? data : data.stops ?? [];

          // ── Filter to only valid coords before storing ─────────────────────
          const valid = raw.filter((s) => isValidCoord(s.latitude, s.longitude));

          if (valid.length < raw.length) {
            console.warn(
              `[RouteMap] ${raw.length - valid.length} stop(s) skipped — invalid coordinates:`,
              raw.filter((s) => !isValidCoord(s.latitude, s.longitude))
            );
          }

          setStops(valid);
        }

        if (routeRes.ok) {
          const data = await routeRes.json();
          setRoute(data);
        }

      } catch (err) {
        console.error("[RouteMap] Fetch error:", err);
        setError("Failed to load route data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shipmentId]);

  // ── Decode polyline safely ────────────────────────────────────────────────────
  const coords: [number, number][] = (() => {
    if (!route?.polyline) return [];
    try {
      return polyline
        .decode(route.polyline)
        .filter(([lat, lng]) => isValidCoord(lat, lng))
        .map(([lat, lng]) => [lat, lng] as [number, number]);
    } catch (err) {
      console.error("[RouteMap] Polyline decode error:", err);
      return [];
    }
  })();

  // ── Safe map centre ───────────────────────────────────────────────────────────
  const centre: [number, number] = (() => {
    const first = stops.find((s) => isValidCoord(s.latitude, s.longitude));
    return first
      ? [Number(first.latitude), Number(first.longitude)]
      : [51.505, -0.09];
  })();

  // ── States ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-sm text-gray-500">Loading route…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (stops.length === 0 && coords.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-400">No route data available for this shipment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <MapContainer
        center={centre}
        zoom={12}
        style={{ height: "500px", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Stop markers */}
        {stops.map((stop, i) => {
          // Extra guard inside render — belt and braces
          if (!isValidCoord(stop.latitude, stop.longitude)) return null;
          return (
            <Marker
              key={stop.id ?? i}
              position={[Number(stop.latitude), Number(stop.longitude)]}
            >
              {stop.label && <Popup>{stop.label}</Popup>}
            </Marker>
          );
        })}

        {/* Route polyline */}
        {coords.length > 0 && (
          <Polyline
            positions={coords}
            color="#5871A7"
            weight={4}
            opacity={0.85}
          />
        )}
      </MapContainer>
    </div>
  );
}