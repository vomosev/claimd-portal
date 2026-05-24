// components/LogisticsFleetMap.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

declare global {
  interface Window { google: any; }
}

const POLL_INTERVAL     = 10_000;
const LOCATION_INTERVAL =  5_000;

interface Vehicle {
  vehicle_id: string | number;
  lat:        number | string;
  lng:        number | string;
  speed?:     number | string;
  heading?:   number;
  status?:    string;
  driver?:    string;
  last_seen?: string;
  driver_userid?:  string;
  vehicle_reg?:    string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_COLOURS: Record<string, string> = {
  active:   "bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400",
  idle:     "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  offline:  "bg-gray-100   dark:bg-gray-800      text-gray-500   dark:text-gray-400",
  stopped:  "bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400",
};

const TRUCK_SVG = `
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
const ENCODED_TRUCK = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(TRUCK_SVG)}`;

const MY_LOCATION_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#4285F4" opacity="0.25"/>
    <circle cx="12" cy="12" r="6"  fill="#4285F4"/>
    <circle cx="12" cy="12" r="3"  fill="white"/>
  </svg>
`;
const ENCODED_MY_LOCATION = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(MY_LOCATION_SVG)}`;

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export default function LogisticsFleetMap() {
  const mapRef      = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [map,               setMap]               = useState<any>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<any>(null);
  const [vehicles,          setVehicles]          = useState<Vehicle[]>([]);
  const [markers,           setMarkers]           = useState<Map<string | number, any>>(new Map());
  const [error,             setError]             = useState<string | null>(null);
  const [online,            setOnline]            = useState(true);
  const [lastUpdated,       setLastUpdated]       = useState<Date | null>(null);

  const params     = useParams();
  const shipmentId = params?.shipmentId;

  const [myCoords, setMyCoords] = useState<{
    lat: number; lng: number; speed?: number; heading?: number;
  } | null>(null);

  const myMarkerRef = useRef<any>(null);

  // ── 1. Initial GPS fix ───────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 })
      .then((pos) => setMyCoords({
        lat:     pos.coords.latitude,
        lng:     pos.coords.longitude,
        speed:   pos.coords.speed   ?? 0,
        heading: pos.coords.heading ?? 0,
      }))
      .catch((err) => console.error("[FleetMap] initial GPS error:", err));
  }, []);

  // ── 2. Watch GPS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyCoords({
        lat:     pos.coords.latitude,
        lng:     pos.coords.longitude,
        speed:   pos.coords.speed   ?? 0,
        heading: pos.coords.heading ?? 0,
      }),
      (err) => console.error("[FleetMap] GPS watch error:", err),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── 3. My Location marker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !myCoords || !window.google) return;
    const pos = { lat: myCoords.lat, lng: myCoords.lng };
    if (myMarkerRef.current) {
      myMarkerRef.current.setPosition(pos);
    } else {
      myMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map,
        title: "My Location",
        icon: {
          url:        ENCODED_MY_LOCATION,
          scaledSize: new window.google.maps.Size(24, 24),
          anchor:     new window.google.maps.Point(12, 12),
        },
        zIndex: 999,
      });
    }
  }, [map, myCoords]);

  // ── 4. POST driver position ──────────────────────────────────────────────────
  const postDriverPosition = useCallback(async (
    coords: { lat: number; lng: number; speed?: number; heading?: number }
  ) => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/location`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          username,
          shipmentId,
          latitude:  coords.lat,
          longitude: coords.lng,
          speed:     coords.speed   ?? 0,
          heading:   coords.heading ?? 0,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[FleetMap] location POST error:", err);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (!myCoords) return;
    postDriverPosition(myCoords);
    const t = setInterval(() => postDriverPosition(myCoords), LOCATION_INTERVAL);
    return () => clearInterval(t);
  }, [myCoords, postDriverPosition]);

  // ── 5. Fetch fleet positions ─────────────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/live`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw  = Array.isArray(data) ? data : data.vehicles ?? [];
      const list: Vehicle[] = raw
        .map((v: any) => ({ ...v, lat: Number(v.lat), lng: Number(v.lng) }))
        .filter((v: Vehicle) => !isNaN(v.lat as number) && !isNaN(v.lng as number));
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchVehicles]);

  // ── 6. InfoWindow content ────────────────────────────────────────────────────
  const createInfoWindowContent = (v: Vehicle) => {
    const lat = Number(v.lat);
    const lng = Number(v.lng);
    return `
      <div style="font-family:sans-serif;max-width:220px;line-height:1.5;">
        <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1f2937;">
          Vehicle ${v.vehicle_id}
        </h4>
        ${v.driver    ? `<p style="margin:2px 0;font-size:13px;"><strong>Driver:</strong> ${v.driver}</p>` : ""}
        ${v.speed     != null ? `<p style="margin:2px 0;font-size:13px;"><strong>Speed:</strong> ${Number(v.speed)} km/h</p>` : ""}
        ${v.status    ? `<p style="margin:2px 0;font-size:13px;text-transform:capitalize;"><strong>Status:</strong> ${v.status}</p>` : ""}
        ${v.last_seen ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;"><strong>Last seen:</strong> ${new Date(v.last_seen).toLocaleTimeString()}</p>` : ""}
        <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;font-family:monospace;">
          ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </p>
        <p style="margin:6px 0 0;font-size:12px;">
          <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
             style="color:#3b82f6;text-decoration:none;">📍 Open in Google Maps</a>
        </p>
      </div>
    `;
  };

  // ── 7. Marker click ──────────────────────────────────────────────────────────
  const handleMarkerClick = useCallback(
    (vehicle: Vehicle, marker: any, mapInstance: any) => {
      if (currentInfoWindow) currentInfoWindow.close();
      const iw = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(vehicle),
      });
      iw.open(mapInstance, marker);
      setCurrentInfoWindow(iw);
      iw.addListener("closeclick", () => setCurrentInfoWindow(null));
    },
    [currentInfoWindow] // eslint-disable-line
  );

  // ── 8. Centre on vehicle (called from the list below the map) ───────────────
  const centreOnVehicle = useCallback((v: Vehicle) => {
    const lat = Number(v.lat);
    const lng = Number(v.lng);
    if (!map || isNaN(lat) || isNaN(lng)) return;

    // Scroll to the map container
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    // Pan and zoom
    map.setCenter({ lat, lng });
    map.setZoom(16);

    // Open the InfoWindow for this vehicle
    const marker = markers.get(v.vehicle_id);
    if (marker) handleMarkerClick(v, marker, map);
  }, [map, markers, handleMarkerClick]);

  // ── 9. Initialise Google Maps ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      let centreLat = 51.507351;
      let centreLng = -0.127758;
      try {
        const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 });
        centreLat = pos.coords.latitude;
        centreLng = pos.coords.longitude;
      } catch { /* fall back to London */ }

      if (!window.google) {
        await new Promise<void>((resolve) => {
          const existing = document.getElementById("googleMapsScript");
          if (!existing) {
            const s  = document.createElement("script");
            s.id     = "googleMapsScript";
            s.src    = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
            s.async  = true;
            s.defer  = true;
            s.onload = () => resolve();
            document.body.appendChild(s);
          } else { resolve(); }
        });
      }

      if (!window.google || !mapRef.current) return;

      const vehicleIcon = {
        url:        ENCODED_TRUCK,
        scaledSize: new window.google.maps.Size(36, 36),
        anchor:     new window.google.maps.Point(18, 18),
      };

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: centreLat, lng: centreLng },
        zoom:   13,
        styles: [
          { featureType: "poi",     stylers: [{ visibility: "off"        }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        ],
      });

      mapInstance.addListener("click", () => {
        if (currentInfoWindow) { currentInfoWindow.close(); setCurrentInfoWindow(null); }
      });

      setMap(mapInstance);

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
        marker.addListener("click", () => handleMarkerClick(v, marker, mapInstance));
        markerMap.set(v.vehicle_id, marker);
      });
      setMarkers(markerMap);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 10. Update markers on poll ───────────────────────────────────────────────
  useEffect(() => {
    if (!map || !window.google) return;
    const vehicleIcon = {
      url:        ENCODED_TRUCK,
      scaledSize: new window.google.maps.Size(36, 36),
      anchor:     new window.google.maps.Point(18, 18),
    };
    setMarkers((prev) => {
      const updated = new Map(prev);
      vehicles.forEach((v) => {
        const lat = Number(v.lat);
        const lng = Number(v.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const existing = updated.get(v.vehicle_id);
        if (existing) {
          existing.setPosition(new window.google.maps.LatLng(lat, lng));
        } else {
          const marker = new window.google.maps.Marker({
            position: { lat, lng }, map, title: `Vehicle ${v.vehicle_id}`, icon: vehicleIcon,
          });
          marker.addListener("click", () => handleMarkerClick(v, marker, map));
          updated.set(v.vehicle_id, marker);
        }
      });
      const activeIds = new Set(vehicles.map((v) => v.vehicle_id));
      updated.forEach((marker, id) => {
        if (!activeIds.has(id)) { marker.setMap(null); updated.delete(id); }
      });
      return updated;
    });
  }, [vehicles, map, handleMarkerClick]);

  // ── 11. My Location button ───────────────────────────────────────────────────
  const handleMyLocation = useCallback(async () => {
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
      const freshCoords = {
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        speed: pos.coords.speed ?? 0, heading: pos.coords.heading ?? 0,
      };
      setMyCoords(freshCoords);
      if (map) { map.setCenter({ lat: freshCoords.lat, lng: freshCoords.lng }); map.setZoom(15); }
    } catch (err) {
      console.error("[FleetMap] my-location error:", err);
    }
  }, [map]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-semibold">Fleet Tracking</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Live vehicle positions. Click a vehicle for details.
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
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

          {myCoords && (
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              — This vehicle 📍 {myCoords.lat.toFixed(4)}, {myCoords.lng.toFixed(4)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={handleMyLocation}
            className="
              inline-flex items-center gap-1.5 text-xs font-semibold
              px-3 py-1.5 rounded-full
              bg-[#5871A7] hover:bg-[#4560A0] text-white transition-colors
            "
            title="Update and centre on my current location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
              viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8" opacity="0.3"/>
              <circle cx="12" cy="12" r="5"/>
            </svg>
            My Location
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error} — retrying every {POLL_INTERVAL / 1_000}s…
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-[20px] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-800"
      />

      {/* ── Vehicle list ─────────────────────────────────────────────────────── */}
      {vehicles.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Tracked Vehicles
            </h3>
            <span className="text-xs text-gray-400">
              {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* List rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {vehicles.map((v) => {
              const lat    = Number(v.lat);
              const lng    = Number(v.lng);
              const status = (v.status ?? "").toLowerCase();
              const badgeCls = STATUS_COLOURS[status] ?? STATUS_COLOURS["offline"];

              return (
                <div
                  key={v.vehicle_id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Left: vehicle info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Truck icon */}
                    <div className="w-8 h-8 rounded-full bg-[#5871A7]/10 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                        viewBox="0 0 24 24" fill="none" stroke="#5871A7"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13" rx="1"/>
                        <path d="M16 8h4l3 5v4h-7V8z"/>
                        <circle cx="5.5"  cy="18.5" r="2.5"/>
                        <circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        Vehicle {v.vehicle_id}
                        {v.driver && (
                          <span className="ml-1.5 text-xs font-normal text-gray-500">
                            — {v.driver}
                          </span>
                        )}
                        {v.driver_userid && (
                          <span className="ml-1.5 text-xs font-normal text-gray-500">
                            — {v.driver_userid}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {v.vehicle_reg && (
                          <span className="ml-2 not-italic text-gray-400">
                            — {v.vehicle_reg}
                            {Number(v.speed)} km/h
                          </span>
                        )}
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                        {v.speed != null && (
                          <span className="ml-2 not-italic text-gray-400">
                            {Number(v.speed)} km/h
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: status + locate button */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {v.status && (
                      <span className={`
                        text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize
                        ${badgeCls}
                      `}>
                        {v.status}
                      </span>
                    )}
                    {v.last_seen && (
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {new Date(v.last_seen).toLocaleTimeString()}
                      </span>
                    )}

                    {/* Locate button — centres map on this vehicle */}
                    <button
                      type="button"
                      onClick={() => centreOnVehicle(v)}
                      className="
                        inline-flex items-center gap-1 text-xs font-semibold
                        px-2.5 py-1 rounded-full
                        border border-[#5871A7]/40 text-[#5871A7]
                        hover:bg-[#5871A7] hover:text-white
                        transition-colors
                      "
                      title={`Centre map on Vehicle ${v.vehicle_id}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      </svg>
                      Locate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {vehicles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-400">No vehicles are currently being tracked.</p>
        </div>
      )}

    </div>
  );
}