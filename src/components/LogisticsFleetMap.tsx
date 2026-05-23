// components/LogisticsFleetMap.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window { google: any; }
}

const POLL_INTERVAL      = 10_000;   // vehicle fetch — 10 s
const LOCATION_INTERVAL  =  5_000;   // driver POST  —  5 s

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

// ── Truck icon SVG ─────────────────────────────────────────────────────────────
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

// ── "My Location" pin SVG (blue dot) ──────────────────────────────────────────
const MY_LOCATION_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#4285F4" opacity="0.25"/>
    <circle cx="12" cy="12" r="6"  fill="#4285F4"/>
    <circle cx="12" cy="12" r="3"  fill="white"/>
  </svg>
`;

const ENCODED_MY_LOCATION = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(MY_LOCATION_SVG)}`;

// ── Helper: get current position as a Promise ─────────────────────────────────
function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
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

  // The driver's own live coordinates (updated by watchPosition + manual button)
  const [myCoords, setMyCoords] = useState<{
    lat: number; lng: number; speed?: number; heading?: number;
  } | null>(null);

  // Marker for "My Location" so it stays on the map
  const myMarkerRef = useRef<any>(null);

  // ── 1. Get initial GPS fix immediately ─────────────────────────────────────
  // watchPosition can take several seconds to fire the first callback.
  // Calling getCurrentPosition upfront gives us a position instantly.
  useEffect(() => {
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 })
      .then((pos) => {
        setMyCoords({
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          speed:   pos.coords.speed   ?? 0,
          heading: pos.coords.heading ?? 0,
        });
      })
      .catch((err) => console.error("[FleetMap] initial GPS error:", err));
  }, []);

  // ── 2. Keep watching for GPS updates ───────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setMyCoords({
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          speed:   pos.coords.speed   ?? 0,
          heading: pos.coords.heading ?? 0,
        });
      },
      (err) => console.error("[FleetMap] GPS watch error:", err),
      {
        enableHighAccuracy: true,
        timeout:            15_000,
        maximumAge:         0,          // ← always use a fresh reading
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── 3. Update "My Location" marker on the map whenever coords change ───────
  useEffect(() => {
    if (!map || !myCoords || !window.google) return;

    const pos = { lat: myCoords.lat, lng: myCoords.lng };

    if (myMarkerRef.current) {
      // Smoothly move the existing marker
      myMarkerRef.current.setPosition(pos);
    } else {
      // Create the marker for the first time
      myMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map,
        title: "My Location",
        icon: {
          url:        ENCODED_MY_LOCATION,
          scaledSize: new window.google.maps.Size(24, 24),
          anchor:     new window.google.maps.Point(12, 12),
        },
        zIndex: 999,   // always on top
      });
    }
  }, [map, myCoords]);

  // ── 4. POST driver's position to backend every 5 s ─────────────────────────
  const postDriverPosition = useCallback(async (
    coords: { lat: number; lng: number; speed?: number; heading?: number }
  ) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/location`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            vehicleId:  1,          // 🔥 replace with dynamic driver id
            shipmentId: 1,          // 🔥 replace with dynamic shipment id
            latitude:   coords.lat,
            longitude:  coords.lng,
            speed:      coords.speed   ?? 0,
            heading:    coords.heading ?? 0,
          }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[FleetMap] location POST error:", err);
    }
  }, []);

  useEffect(() => {
    if (!myCoords) return;

    // Post immediately when we get a new fix
    postDriverPosition(myCoords);

    const t = setInterval(() => {
      // Re-read from the ref so the interval always uses the latest coords
      // rather than stale closure values
      postDriverPosition(myCoords);
    }, LOCATION_INTERVAL);

    return () => clearInterval(t);
  }, [myCoords, postDriverPosition]);

  // ── 5. Fetch all fleet vehicle positions ───────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fleet/live`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data   = await res.json();
      const raw    = Array.isArray(data) ? data : data.vehicles ?? [];

      const list: Vehicle[] = raw
        .map((v: any) => ({ ...v, lat: Number(v.lat), lng: Number(v.lng) }))
        .filter((v: Vehicle) =>
          !isNaN(v.lat as number) && !isNaN(v.lng as number)
        );

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

  // ── 6. InfoWindow content ──────────────────────────────────────────────────
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
          <a href="https://www.google.com/maps?q=${lat},${lng}"
             target="_blank"
             style="color:#3b82f6;text-decoration:none;">
            📍 Open in Google Maps
          </a>
        </p>
      </div>
    `;
  };

  // ── 7. Marker click handler ────────────────────────────────────────────────
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
    [currentInfoWindow]   // eslint-disable-line
  );

  // ── 8. Initialise Google Maps ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Use the driver's GPS for the initial centre if available
      let centreLat = 51.507351;
      let centreLng = -0.127758;

      try {
        const pos = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout:            10_000,
        });
        centreLat = pos.coords.latitude;
        centreLng = pos.coords.longitude;
      } catch {
        // fall back to London
      }

      // Load the Google Maps SDK once
      if (!window.google) {
        await new Promise<void>((resolve) => {
          const existing = document.getElementById("googleMapsScript");
          if (!existing) {
            const s   = document.createElement("script");
            s.id      = "googleMapsScript";
            s.src     = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
            s.async   = true;
            s.defer   = true;
            s.onload  = () => resolve();
            document.body.appendChild(s);
          } else {
            resolve();
          }
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
          { featureType: "poi",     stylers: [{ visibility: "off"         }] },
          { featureType: "transit", stylers: [{ visibility: "simplified"  }] },
        ],
      });

      mapInstance.addListener("click", () => {
        if (currentInfoWindow) {
          currentInfoWindow.close();
          setCurrentInfoWindow(null);
        }
      });

      setMap(mapInstance);

      // Drop initial vehicle markers
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

  // ── 9. Update vehicle markers when data refreshes ─────────────────────────
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

  // ── 10. "My Location" button — manual update + re-centre ──────────────────
  const handleMyLocation = useCallback(async () => {
    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout:            10_000,
        maximumAge:         0,     // force a fresh reading
      });

      const freshCoords = {
        lat:     pos.coords.latitude,
        lng:     pos.coords.longitude,
        speed:   pos.coords.speed   ?? 0,
        heading: pos.coords.heading ?? 0,
      };

      // Update state — this triggers the marker + POST effects above
      setMyCoords(freshCoords);

      // Re-centre and zoom the map
      if (map) {
        map.setCenter({ lat: freshCoords.lat, lng: freshCoords.lng });
        map.setZoom(15);
      }
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
            <span className={`
              w-1.5 h-1.5 rounded-full
              ${online ? "bg-green-500 animate-pulse" : "bg-red-500"}
            `} />
            {online ? "Live" : "Offline"}
          </span>

          <span className="text-xs text-gray-500 dark:text-gray-400">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} tracked
          </span>

          {/* Show driver's current coords when available */}
          {myCoords && (
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              📍 {myCoords.lat.toFixed(4)}, {myCoords.lng.toFixed(4)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          {/* ── My Location button ──────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleMyLocation}
            className="
              inline-flex items-center gap-1.5
              text-xs font-semibold
              px-3 py-1.5 rounded-full
              bg-[#5871A7] hover:bg-[#4560A0]
              text-white
              transition-colors
            "
            title="Update and centre on my current location"
          >
            {/* Blue dot icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12" height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
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

    </div>
  );
}