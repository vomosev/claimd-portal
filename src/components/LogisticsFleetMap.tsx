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
// lat/lng are typed as number | string because MySQL DECIMAL/FLOAT columns
// are returned as strings by the Node.js mysql2 driver.
// We coerce them to numbers at both fetch time and render time.
interface Vehicle {
  vehicle_id: string | number;
  lat:        number | string;
  lng:        number | string;
  speed?:     number | string;
  heading?:   number;
  status?:    string;
  driver?:    string;
  last_seen?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const POLL_INTERVAL                   = 5000;
const DEFAULT_CENTRE: [number, number] = [51.505, -0.09];
const DEFAULT_ZOOM                    = 11;

// ── Component ──────────────────────────────────────────────────────────────────
export default function FleetMap() {
  const [vehicles,    setVehicles]    = useState<Vehicle[]>([]);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online,      setOnline]      = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
  } | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed || 0,
          heading: pos.coords.heading || 0
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Send live vehicle position ──────────────────────────────────────────────
  const updateVehicles = async () => {
    try {
      if (!coords) return; // make sure you have GPS first

      const payload = {
        vehicleId: 1,        // 🔥 replace with dynamic user/driver ID
        shipmentId: 1001,    // 🔥 dynamic
        latitude: coords.lat,
        longitude: coords.lng,
        speed: coords.speed || 0,
        heading: coords.heading || 0
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // optional: update UI state
      setLastUpdated(new Date());
      setOnline(true);
      setError(null);

    } catch (err) {
      console.error("[FleetMap] location POST error:", err);
      setOnline(false);
      setError("Could not send location update.");
    }
  };

  useEffect(() => {
    updateVehicles();

    intervalRef.current = setInterval(updateVehicles, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [coords]);

  // ── Fetch live vehicle positions ──────────────────────────────────────────
  const fetchVehicles = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fleet/live`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data  = await res.json();
      const raw: any[] = Array.isArray(data) ? data : data.vehicles ?? [];

      // ── Coerce lat/lng to numbers at fetch time and drop invalid rows ─────
      // MySQL DECIMAL/FLOAT columns arrive as strings — Number() normalises them.
      const list: Vehicle[] = raw
        .map((v) => ({
          ...v,
          lat: Number(v.lat),
          lng: Number(v.lng),
        }))
        .filter((v) => !isNaN(v.lat as number) && !isNaN(v.lng as number));

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

  // useEffect(() => {
  //   const ws = new WebSocket("ws://nodejs.gridiron-app.com:8080");

  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);

  //     if (data.type === "location_update") {
  //       setVehicles((prev) => {
  //         const existing = prev.find(v => v.vehicle_id === data.vehicleId);

  //         if (existing) {
  //           return prev.map(v =>
  //             v.vehicle_id === data.vehicleId
  //               ? { ...v, lat: data.latitude, lng: data.longitude }
  //               : v
  //           );
  //         }

  //         return [
  //           ...prev,
  //           {
  //             vehicle_id: data.vehicleId,
  //             lat: data.latitude,
  //             lng: data.longitude
  //           }
  //         ];
  //       });
  //     }
  //   };

  //   ws.onerror = () => setOnline(false);
  //   ws.onopen  = () => setOnline(true);

  //   return () => ws.close();
  // }, []);

  useEffect(() => {
    fetchVehicles();

    intervalRef.current = setInterval(fetchVehicles, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Map centre — coerce here too as a safety net ───────────────────────────
  const centre: [number, number] = (() => {
    if (vehicles.length > 0) {
      const lat = Number(vehicles[0].lat);
      const lng = Number(vehicles[0].lng);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return DEFAULT_CENTRE;
  })();

  return (
    <div className="flex flex-col gap-2">

      {/* ── Status bar ──────────────────────────────────────────────────── */}
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

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error} — retrying every {POLL_INTERVAL / 1000}s…
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────────────── */}
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

          {vehicles.map((v, i) => {
            // ── Coerce at render time — belt-and-braces against string values ──
            // Even if fetchVehicles coerced them, a re-render from stale state
            // or a racing poll cycle can still carry string lat/lng through.
            const lat = Number(v.lat);
            const lng = Number(v.lng);

            // Skip any vehicle with invalid coordinates — don't crash the map
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker
                key={v.vehicle_id ?? i}
                position={[lat, lng]}
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
                      <p className="text-gray-600">
                        Speed: {Number(v.speed)} km/h
                      </p>
                    )}
                    {v.status && (
                      <p className="text-gray-600 capitalize">
                        Status: {v.status}
                      </p>
                    )}
                    {v.last_seen && (
                      <p className="text-gray-400 text-xs">
                        Last seen:{" "}
                        {new Date(v.last_seen).toLocaleTimeString()}
                      </p>
                    )}
                    {/* ── toFixed is safe — lat and lng are Numbers here ── */}
                    <p className="text-gray-400 text-xs font-mono">
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>
      </div>

    </div>
  );
}