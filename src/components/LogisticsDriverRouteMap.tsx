// components/LogisticsDriverRouteMap.tsx
"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import polyline from "@mapbox/polyline";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix default Leaflet marker icons in Next.js ────────────────────────────────
// Leaflet's default icon URLs break in bundlers — override them manually
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
  id:        string | number;
  latitude:  number;
  longitude: number;
  label?:    string;
}

interface Route {
  polyline?: string;
}

interface LogisticsDriverRouteMapProps {
  shipmentId: string | number;
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
          const stopsData = await stopsRes.json();
          setStops(Array.isArray(stopsData) ? stopsData : stopsData.stops ?? []);
        }

        if (routeRes.ok) {
          const routeData = await routeRes.json();
          setRoute(routeData);
        }
      } catch (err) {
        console.error("Error fetching route data:", err);
        setError("Failed to load route data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shipmentId]);

  // Decode the encoded polyline into Leaflet LatLng pairs
  const coords: [number, number][] = route?.polyline
    ? polyline.decode(route.polyline).map(([lat, lng]) => [lat, lng])
    : [];

  // Default map centre — use first stop or fallback to London
  const centre: [number, number] =
    stops.length > 0
      ? [stops[0].latitude, stops[0].longitude]
      : [51.505, -0.09];

  // ── Loading / error states ─────────────────────────────────────────────────
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

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <MapContainer
        center={centre}
        zoom={12}
        style={{ height: "500px", width: "100%" }}
        scrollWheelZoom
      >
        {/* OpenStreetMap tiles — free, no API key ────────────────────────── */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Stop markers ────────────────────────────────────────────────────── */}
        {stops.map((stop, i) => (
          <Marker
            key={stop.id ?? i}
            position={[stop.latitude, stop.longitude]}
          >
            {stop.label && (
              <Popup>{stop.label}</Popup>
            )}
          </Marker>
        ))}

        {/* Route polyline ──────────────────────────────────────────────────── */}
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