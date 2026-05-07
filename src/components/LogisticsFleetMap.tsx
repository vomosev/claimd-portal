// components/LogisticsFleetMap.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── TypeScript declaration for Google Maps on window ──────────────────────────
declare global {
  interface Window {
    google: any;
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 10000; // 10 seconds

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Component ──────────────────────────────────────────────────────────────────
export default function LogisticsFleetMap() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Google Maps instances
  const [map,              setMap]              = useState<any>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<any>(null);

  // Vehicle state
  const [vehicles,    setVehicles]    = useState<Vehicle[]>([]);
  const [markers,     setMarkers]     = useState<Map<string | number, any>>(new Map());
  const [error,       setError]       = useState<string | null>(null);
  const [online,      setOnline]      = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Driver GPS state (this device)
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
  } | null>(null);

  // ── 1. Watch driver's own GPS position ─────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          speed:   pos.coords.speed   || 0,
          heading: pos.coords.heading || 0,
        });
      },
      (err) => console.error("[FleetMap] GPS error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── 2. POST driver's live location to the backend ──────────────────────────
  const updateDriverPosition = useCallback(async () => {
    if (!coords) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/location`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            vehicleId:  1,         // 🔥 replace with dynamic driver id
            shipmentId: 1001,      // 🔥 replace with dynamic shipment id
            latitude:   coords.lat,
            longitude:  coords.lng,
            speed:      coords.speed   || 0,
            heading:    coords.heading || 0,
          }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[FleetMap] location POST error:", err);
    }
  }, [coords]);

  useEffect(() => {
    updateDriverPosition();
    const t = setInterval(updateDriverPosition, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [updateDriverPosition]);

  // ── 3. Fetch all live vehicle positions from the backend ───────────────────
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fleet/live`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data  = await res.json();
      const raw: any[] = Array.isArray(data) ? data : data.vehicles ?? [];

      const list: Vehicle[] = raw
        .map((v) => ({ ...v, lat: Number(v.lat), lng: Number(v.lng) }))
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
  }, []);

  useEffect(() => {
    fetchVehicles();
    intervalRef.current = setInterval(fetchVehicles, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchVehicles]);

  // ── 4. Create InfoWindow content for a vehicle ────────────────────────────
  const createInfoWindowContent = (v: Vehicle) => {
    const lat = Number(v.lat);
    const lng = Number(v.lng);
    return `
      <div style="font-family:sans-serif; max-width:220px; line-height:1.5;">
        <h4 style="margin:0 0 8px; font-size:14px; font-weight:700; color:#1f2937;">
          Vehicle ${v.vehicle_id}
        </h4>
        ${v.driver   ? `<p style="margin:2px 0; font-size:13px;"><strong>Driver:</strong> ${v.driver}</p>` : ""}
        ${v.speed    != null ? `<p style="margin:2px 0; font-size:13px;"><strong>Speed:</strong> ${Number(v.speed)} km/h</p>` : ""}
        ${v.status   ? `<p style="margin:2px 0; font-size:13px; text-transform:capitalize;"><strong>Status:</strong> ${v.status}</p>` : ""}
        ${v.last_seen ? `<p style="margin:2px 0; font-size:12px; color:#6b7280;"><strong>Last seen:</strong> ${new Date(v.last_seen).toLocaleTimeString()}</p>` : ""}
        <p style="margin:6px 0 0; font-size:11px; color:#9ca3af; font-family:monospace;">
          ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </p>
        <p style="margin:6px 0 0; font-size:12px;">
          <a href="https://www.google.com/maps?q=${lat},${lng}"
             target="_blank"
             style="color:#3b82f6; text-decoration:none;">
            📍 Open in Google Maps
          </a>
        </p>
      </div>
    `;
  };

  // ── 5. Handle marker click → show InfoWindow ──────────────────────────────
  const handleMarkerClick = useCallback(
    (vehicle: Vehicle, marker: any, mapInstance: any) => {
      if (currentInfoWindow) currentInfoWindow.close();

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(vehicle),
      });

      infoWindow.open(mapInstance, marker);
      setCurrentInfoWindow(infoWindow);

      infoWindow.addListener("closeclick", () => {
        setCurrentInfoWindow(null);
      });
    },
    [currentInfoWindow]
  );

  // ── 6. Initialise Google Maps on mount ────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Default centre — try to use driver's GPS first
      let centreLat = 51.507351;
      let centreLng = -0.127758;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        );
        centreLat = pos.coords.latitude;
        centreLng = pos.coords.longitude;
      } catch {
        // fall back to London
      }

      // Load Google Maps SDK if not already present
      if (!window.google) {
        await new Promise<void>((resolve) => {
          const existing = document.getElementById("googleMapsScript");
          if (!existing) {
            const script = document.createElement("script");
            script.id    = "googleMapsScript";
            script.src   = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            document.body.appendChild(script);
          } else {
            resolve();
          }
        });
      }

      if (!window.google || !mapRef.current) return;

      // ── Custom truck SVG for vehicle markers ────────────────────────────────
      const truckSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="18" fill="#5871A7"/>
          <svg x="6" y="6" width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="white" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1"/>
            <path d="M16 8h4l3 5v4h-7V8z"/>
            <circle cx="5.5"  cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </svg>
      `;
      const encodedTruck = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(truckSvg)}`;

      const vehicleIcon = {
        url:        encodedTruck,
        scaledSize: new window.google.maps.Size(36, 36),
        anchor:     new window.google.maps.Point(18, 18),
      };

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: centreLat, lng: centreLng },
        zoom:   13,
        styles: [
          // Subtle style to make vehicle markers pop
          { featureType: "poi",   stylers: [{ visibility: "off"      }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        ],
      });

      // Close InfoWindow on map click
      mapInstance.addListener("click", () => {
        if (currentInfoWindow) {
          currentInfoWindow.close();
          setCurrentInfoWindow(null);
        }
      });

      setMap(mapInstance);

      // ── Initial vehicle markers ───────────────────────────────────────────
      const markerMap = new Map<string | number, any>();
      vehicles.forEach((v) => {
        const lat = Number(v.lat);
        const lng = Number(v.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map:      mapInstance,
          title:    `Vehicle ${v.vehicle_id}`,
          icon:     vehicleIcon,
        });

        marker.addListener("click", () =>
          handleMarkerClick(v, marker, mapInstance)
        );
        markerMap.set(v.vehicle_id, marker);
      });

      setMarkers(markerMap);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 7. Update markers smoothly when vehicle positions change ──────────────
  useEffect(() => {
    if (!map || !window.google) return;

    const truckSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="18" fill="#5871A7"/>
        <svg x="6" y="6" width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="white" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 5v4h-7V8z"/>
          <circle cx="5.5"  cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </svg>
    `;
    const encodedTruck = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(truckSvg)}`;
    const vehicleIcon = {
      url:        encodedTruck,
      scaledSize: new window.google.maps.Size(36, 36),
      anchor:     new window.google.maps.Point(18, 18),
    };

    setMarkers((prevMarkers) => {
      const updated = new Map(prevMarkers);

      vehicles.forEach((v) => {
        const lat = Number(v.lat);
        const lng = Number(v.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const existing = updated.get(v.vehicle_id);
        if (existing) {
          // Smoothly move the marker to the new position
          existing.setPosition(new window.google.maps.LatLng(lat, lng));
        } else {
          // New vehicle — create a fresh marker
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map,
            title: `Vehicle ${v.vehicle_id}`,
            icon:  vehicleIcon,
          });
          marker.addListener("click", () =>
            handleMarkerClick(v, marker, map)
          );
          updated.set(v.vehicle_id, marker);
        }
      });

      // Remove markers for vehicles no longer in the list
      const activeIds = new Set(vehicles.map((v) => v.vehicle_id));
      updated.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.setMap(null);
          updated.delete(id);
        }
      });

      return updated;
    });
  }, [vehicles, map, handleMarkerClick]);

  // ── 8. "My Location" button ───────────────────────────────────────────────
  const handleCentreOnMe = () => {
    if (!navigator.geolocation || !map) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        map.setCenter({ lat: latitude, lng: longitude });
        map.setZoom(15);
      },
      (err) => console.error("[FleetMap] centre error:", err)
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`
            inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
            ${online
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-red-100   dark:bg-red-900/30   text-red-700   dark:text-red-400"
            }
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {online ? "Live" : "Offline"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} tracked
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={handleCentreOnMe}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors"
          >
            My Location
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error} — retrying every {POLL_INTERVAL / 1000}s…
        </div>
      )}

      {/* Google Map container */}
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-[20px] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-800"
      />

    </div>
  );
}