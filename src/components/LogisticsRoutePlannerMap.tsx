"use client";

import { useEffect, useState, useRef, useCallback } from "react";

declare global {
  interface Window { google: any }
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stop {
  id?:       string | number;
  latitude:  number | string | null;
  longitude: number | string | null;
  label?:    string;
  address?:  string;
  sequence?: number;
}

// ── Numbered stop marker icon ──────────────────────────────────────────────────
// Returns a coloured SVG pin with the stop sequence number inside
function makeStopIcon(sequence: number, isFirst: boolean, isLast: boolean) {
  const fill = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10 16 24 16 24s16-14 16-24C32 7.16 24.84 0 16 0z"
        fill="${fill}" />
      <circle cx="16" cy="16" r="10" fill="white" opacity="0.9" />
      <text x="16" y="21" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="11" font-weight="bold"
        fill="${fill}">${sequence}</text>
    </svg>
  `;
  return {
    url:       "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: null, // set after google loads
    anchor:     null,
  };
}

export default function LogisticsRoutePlanner({ shipmentId }: any) {

  const mapRef = useRef<HTMLDivElement>(null);
  const mapRefInstance = useRef<any>(null);

  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  const vehicleMarkersRef = useRef<Map<any, any>>(new Map());
  const stopMarkersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [stops, setStops] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<any>("all");
  const [mapInstance,      setMapInstance]      = useState<any>(null);

  // ── Helpers ─────────────────────────────
  const isValid = (lat: any, lng: any) =>
    !isNaN(Number(lat)) && !isNaN(Number(lng));

  const openInfo = (map: any, marker: any, html: string) => {
    if (infoWindowRef.current) infoWindowRef.current.close();
    const iw = new window.google.maps.InfoWindow({ content: html });
    iw.open(map, marker);
    infoWindowRef.current = iw;
  };

  // ── Load Google Maps ─────────────────────
  const loadMaps = async () => {
    if (window.google) return;

    await new Promise<void>((resolve) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  // ── "Re-centre" button ────────────────────────────────────────────────────────
  const handleRecentre = () => {
    if (!mapInstance || stops.length === 0) return;
    const firstStop = stops[0];
    mapInstance.setCenter({
      lat: Number(firstStop.latitude),
      lng: Number(firstStop.longitude),
    });
    mapInstance.setZoom(13);
  };

  // ── Fetch data ───────────────────────────
  const fetchData = useCallback(async () => {
    const [sRes, vRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/live`)
    ]);

    const sData = await sRes.json();
    const vData = await vRes.json();

    setStops(Array.isArray(sData) ? sData : sData.stops ?? []);
    setVehicles(Array.isArray(vData) ? vData : vData.vehicles ?? []);
  }, [shipmentId]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 5000);
    return () => clearInterval(i);
  }, [fetchData]);

  // ── Info window content for a stop ──────────────────────────────────────────
  const createStopInfoContent = (stop: Stop, index: number): string => {
    const isFirst = index === 0;
    const isLast  = index === stops.length - 1;
    const badge   = isFirst ? "Pickup" : isLast ? "Delivery" : `Stop ${index + 1}`;
    const colour  = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";

    return `
      <div style="font-family:Arial,sans-serif;max-width:220px;line-height:1.5;">
        <div style="font-weight:bold;font-size:14px;color:${colour};margin-bottom:6px;">
          ${badge}
        </div>
        ${stop.label
          ? `<p style="margin:0 0 4px;font-size:13px;font-weight:600;">${stop.label}</p>`
          : ""
        }
        ${stop.address
          ? `<p style="margin:0 0 4px;font-size:12px;color:#555;">${stop.address}</p>`
          : ""
        }
        <p style="margin:0;font-size:11px;color:#999;font-family:monospace;">
          ${Number(stop.latitude).toFixed(5)}, ${Number(stop.longitude).toFixed(5)}
        </p>
        <div style="margin-top:8px;">
          <a href="https://www.google.com/maps?q=${stop.latitude},${stop.longitude}"
             target="_blank"
             style="font-size:11px;color:#4285F4;text-decoration:none;">
            📍 Open in Google Maps
          </a>
        </div>
      </div>
    `;
  };

  // ── Init Map ─────────────────────────────
  const initMap = useCallback(async () => {

    if (!mapRef.current) return;

    await loadMaps();

    if (!mapRefInstance.current) {
      mapRefInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 51.5, lng: -0.1 },
        zoom: 13,
      });

      directionsServiceRef.current = new window.google.maps.DirectionsService();

      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#10B981",
          strokeWeight: 5,
        }
      });

      directionsRendererRef.current.setMap(mapRefInstance.current);
    }

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

    const map = mapRefInstance.current;

    setMapInstance(map);

    // ── Clear stop markers ─────────────────
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    stops.forEach((s, i) => {
      if (!isValid(s.latitude, s.longitude)) return;

      const isFirst = i === 0;
      const isLast  = i === stops.length - 1;
      const seq     = s.sequence ?? i + 1;

      // Build the SVG icon
      const iconDef = makeStopIcon(seq, isFirst, isLast);
      const icon = {
        url:        iconDef.url,
        scaledSize: new window.google.maps.Size(32, 40),
        anchor:     new window.google.maps.Point(16, 40),
      };

      const marker = new window.google.maps.Marker({
        position: {
          lat: Number(s.latitude),
          lng: Number(s.longitude),
        },
        map,
        icon,
        title: s.label || `Stop ${seq}`,
        zIndex: isFirst || isLast ? 10 : 5,
        });

      marker.addListener("click", () =>
        openInfo(map, marker, `
          <div>
            ${s.sequence_order}. ${s.address ? `<strong>Address: ${s.address}</strong>` : s.name || "Stop"}<br/>
            ${s.eta ? `<br/>ETA: ${s.eta}` : ""}
          </div>
        `)
      );

      stopMarkersRef.current.push(marker);
    });

    // ── Vehicles ───────────────────────────
    const visibleVehicles =
      selectedVehicleId === "all"
        ? vehicles
        : vehicles.filter(v => String(v.vehicle_id) === String(selectedVehicleId));

    visibleVehicles.forEach(v => {

      const pos = {
        lat: Number(v.lat),
        lng: Number(v.lng),
      };

      if (!isValid(pos.lat, pos.lng)) return;

      let marker = vehicleMarkersRef.current.get(v.vehicle_id);

      if (!marker) {
        marker = new window.google.maps.Marker({
          position: pos,
          map,
          zIndex: 999,
          title:    `Vehicle ${v.vehicle_id}`,
          icon:     vehicleIcon,
        });

        marker.addListener("click", () =>
          openInfo(map, marker, `
            <div>
              <strong>Vehicle ${v.vehicle_id}</strong><br/>
              Speed: ${v.speed || 0}<br/>
              Status: ${v.status || ""}
            </div>
          `)
        );

        vehicleMarkersRef.current.set(v.vehicle_id, marker);
      } else {
        marker.setPosition(pos);
      }

      // ── ROUTE USING DIRECTIONS RENDERER ─────────────
      if (
        selectedVehicleId !== "all" &&
        String(selectedVehicleId) === String(v.vehicle_id)
      ) {

        const validStops = stops.filter(s =>
          isValid(s.latitude, s.longitude)
        );

        if (validStops.length < 1) return;

        const waypoints = validStops.slice(0, -1).map(s => ({
          location: {
            lat: Number(s.latitude),
            lng: Number(s.longitude),
          },
          stopover: true,
        }));

        directionsServiceRef.current.route(
          {
            origin: pos,
            destination: {
              lat: Number(validStops[validStops.length - 1].latitude),
              lng: Number(validStops[validStops.length - 1].longitude),
            },
            waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: "bestguess",
            },
          },
          (result: any, status: any) => {
            if (status === "OK") {
              directionsRendererRef.current.setDirections(result);
            }
          }
        );
      }
    });

  }, [stops, vehicles, selectedVehicleId]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  // ── UI ──────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Vehicle Route
          </h2>
        </div>
        <button
          type="button"
          onClick={handleRecentre}
          disabled={stops.length === 0}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
            bg-[#5871A7] hover:bg-[#4560A0] text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Re-centre
        </button>
      </div>
      <div>
        <p>
          Current location of vehicles and their planned routes based on latest data. Click on stops or vehicles for details.
        </p>
      </div>

      {/* Stop legend */}
      {stops.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {stops.map((stop, i) => {
            const isFirst = i === 0;
            const isLast  = i === stops.length - 1;
            const colour  = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";
            const label   = isFirst ? "Pickup" : isLast ? "Delivery" : `Stop ${i + 1}`;
            return (
              <span
                key={stop.id ?? i}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border"
                style={{ color: colour, borderColor: colour, background: colour + "12" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: colour }}
                />
                {label}
                {stop.label ? ` — ${stop.label}` : ""}
              </span>
            );
          })}
        </div>
      )}

      <select
        value={selectedVehicleId}
        onChange={(e) =>
          setSelectedVehicleId(
            e.target.value === "all" ? "all" : e.target.value
          )
        }
      >
        <option value="all">All Vehicles</option>
        {vehicles.map(v => (
          <option key={v.vehicle_id} value={v.vehicle_id}>
            Vehicle {v.vehicle_id}
          </option>
        ))}
      </select>

      <div
        ref={mapRef}
        className="w-full h-[500px]"
      />

    </div>
  );
}