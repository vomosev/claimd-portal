// components/LogisticsFleetMap.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default marker icons in Next.js ───────────────────────────────
const defaultIcon = L.icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

// ── Custom vehicle icon ───────────────────────────────────────────────────────
const vehicleIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      background: #5871A7;
      border: 3px solid white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 5v4h-7V8z"/>
        <circle cx="5.5"  cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
  `,
  iconSize:   [28, 28],
  iconAnchor: [14, 14],
});

// ── Types ──────────────────────────────────────────────────────────────────────
interface Vehicle {
  vehicle_id: string | number;
  lat:        number;   // always coerced to number before storing in state
  lng:        number;   // always coerced to number before storing in state
  speed?:     number;
  heading?:   number;
  status?:    string;
  driver?:    string;
  last_seen?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL                  = 3000;
const DEFAULT_CENTRE: [number, number] = [51.505, -0.09];
const DEFAULT_ZOOM                   = 11;

// ── Component ──────────────────────────────────────────────────────────────────
export default function FleetMap() {
  const [vehicles,    setVehicles]    = useState<Vehicle[]>([]);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online,      setOnline]      = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch live vehicle positions ──────────────────────────────────────────
  const fetchVehicles = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fleet/live`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data    = await res.json();
      const raw: any[] = Array.isArray(data) ? data : data.vehicles ?? [];

      // ── Coerce lat/lng to numbers ─────────────────────────────────────────
      // MySQL DECIMAL/FLOAT columns arrive as strings from most Node.js
      // drivers. Number("51.505") is safe; Number(undefined) = NaN which
      // the filter below catches and discards.
      const list: Vehicle[] = raw
        .map((v) => ({
          ...v,
          lat: Number(v.lat),
          lng: Number(v.lng),
        }))
        .filter((v) => !isNaN(v.lat) && !isNaN(v.lng));

      setVehicles(list);
      setLastUpdated(new Date());
      setOnline(true);
      setError(null);
    } catch (err) {
      console.error("[FleetMap] fetch error:", err);
      setOnline(false);
      setError("Could not reach the fleet API.");
    }
  };

  useEffect(() => {
    // Fetch immediately on mount then poll every POLL_INTERVAL ms
    fetchVehicles();

    intervalRef.current = setInterval(fetchVehicles, POLL_INTERVAL);

    // ── Cleanup: clear the interval when the component unmounts ──────────────
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Centre the map on the first valid vehicle position ────────────────────
  const centre: [number, number] =
    vehicles.length > 0 && !isNaN(vehicles[0].lat) && !isNaN(vehicles[0].lng)
      ? [vehicles[0].lat, vehicles[0].lng]
      : DEFAULT_CENTRE;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`
            inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
            ${online
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-red-100   dark:bg-red-900/30   text-red-700   dark:text-red-400"
            }
          `}>
            <span className={`
              w-1.5 h-1.5 rounded-full
              ${online ? "bg-green-500 animate-pulse" : "bg-red-500"}
            `} />
            {online ? "Live" : "Offline"}
          </span>

          <span className="text-xs text-gray-500 dark:text-gray-400">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} tracked
          </span>
        </div>

        {lastUpdated && (
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error} — retrying every {POLL_INTERVAL / 1000}s…
        </div>
      )}

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <MapContainer
          center={centre}
          zoom={DEFAULT_ZOOM}
          style={{ height: "500px", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {vehicles.map((v, i) => (
            <Marker
              key={v.vehicle_id ?? i}
              // lat and lng are guaranteed to be valid numbers at this point
              // because the filter in fetchVehicles removed any NaN rows
              position={[v.lat, v.lng]}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[140px]">
                  <p className="font-bold text-gray-800">
                    Vehicle {v.vehicle_id}
                  </p>
                  {v.driver && (
                    <p className="text-gray-600">Driver: {v.driver}</p>
                  )}
                  {v.speed != null && (
                    <p className="text-gray-600">Speed: {v.speed} km/h</p>
                  )}
                  {v.status && (
                    <p className="text-gray-600 capitalize">
                      Status: {v.status}
                    </p>
                  )}
                  {v.last_seen && (
                    <p className="text-gray-400 text-xs">
                      Last seen: {new Date(v.last_seen).toLocaleTimeString()}
                    </p>
                  )}
                  {/* toFixed is safe because lat/lng are coerced to Number above */}
                  <p className="text-gray-400 text-xs font-mono">
                    {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </div>

    </div>
  );
}