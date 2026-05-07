// components/LogisticsRoutePlanner.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import polyline from "@mapbox/polyline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, MapPin, Clock, Loader2,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

declare global {
  interface Window { google: any; }
}

interface Stop {
  id: string | number;
  name?: string;
  label?: string;
  eta?: string;
  address?: string;
  sequence?: number;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

interface Route {
  polyline?: string;
}

interface LogisticsRoutePlannerProps {
  shipmentId: string | number;
}

function isValidCoord(lat: any, lng: any): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    lat != null && lng != null &&
    !isNaN(la) && !isNaN(ln) &&
    la >= -90 && la <= 90 &&
    ln >= -180 && ln <= 180
  );
}

export default function LogisticsRoutePlanner({ shipmentId }: LogisticsRoutePlannerProps) {

  const [stops, setStops] = useState<Stop[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<any>("all");

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<Map<any, any>>(new Map());
  const etaLinesRef = useRef<Map<any, any>>(new Map());
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);

  // ── Fetch stops + route ─────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [sRes, rRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/route/${shipmentId}`)
    ]);

    const sData = await sRes.json();
    const rData = await rRes.json();

    setStops(Array.isArray(sData) ? sData : sData.stops ?? []);
    setRoute(rData);
    setLoading(false);
  }, [shipmentId]);

  // ── Fetch vehicles ─────────────────────────────
  const fetchVehicles = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/live`);
    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.vehicles ?? [];

    setVehicles(
      raw.map((v: any) => ({
        ...v,
        lat: Number(v.lat),
        lng: Number(v.lng),
      }))
    );
  }, []);

  useEffect(() => {
    fetchData();
    fetchVehicles();
    const i = setInterval(fetchVehicles, 5000);
    return () => clearInterval(i);
  }, [fetchData, fetchVehicles]);

  // ── Info windows ─────────────────────────────
  const openInfo = (map: any, marker: any, content: string) => {
    if (infoWindowRef.current) infoWindowRef.current.close();

    const iw = new window.google.maps.InfoWindow({ content });
    iw.open(map, marker);
    infoWindowRef.current = iw;
  };

  const stopCard = (s: Stop) => `
    <div style="font-family:sans-serif;max-width:220px">
      <strong>${s.name || s.label || "Stop"}</strong><br/>
      ${s.address || ""}
      ${s.eta ? `<br/>ETA: ${s.eta}` : ""}
      <br/>
      <a href="https://www.google.com/maps?q=${s.latitude},${s.longitude}" target="_blank">
        Open in Maps
      </a>
    </div>
  `;

  const vehicleCard = (v: any) => `
    <div style="font-family:sans-serif">
      <strong>Vehicle ${v.vehicle_id}</strong><br/>
      ${v.driver || ""}
      <br/>Speed: ${v.speed || 0}
      <br/>Status: ${v.status || ""}
      <br/>
      ${v.last_seen ? new Date(v.last_seen).toLocaleTimeString() : ""}
    </div>
  `;

  // ── ETA path ─────────────────────────────
  const buildEtaPath = (v: any) => {
    if (!stops.length) return [];
    let closest = 0;
    let min = Infinity;

    stops.forEach((s, i) => {
      if (!isValidCoord(s.latitude, s.longitude)) return;
      const dx = Number(s.latitude) - v.lat;
      const dy = Number(s.longitude) - v.lng;
      const d = dx * dx + dy * dy;
      if (d < min) {
        min = d;
        closest = i;
      }
    });

    return [
      { lat: v.lat, lng: v.lng },
      ...stops.slice(closest).map(s => ({
        lat: Number(s.latitude),
        lng: Number(s.longitude)
      }))
    ];
  };

  // ── Map init/update ─────────────────────────────
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    if (!window.google) {
      await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 51.5, lng: -0.1 },
        zoom: 13,
      });
    }

    const map = mapInstanceRef.current;

    // clear stops
    stopMarkersRef.current.forEach((m: any) => m.setMap(null));
    stopMarkersRef.current = [];

    // draw stops
    stops.forEach((s) => {
      if (!isValidCoord(s.latitude, s.longitude)) return;

      const marker = new window.google.maps.Marker({
        position: {
          lat: Number(s.latitude),
          lng: Number(s.longitude),
        },
        map,
      });

      marker.addListener("click", () =>
        openInfo(map, marker, stopCard(s))
      );

      stopMarkersRef.current.push(marker);
    });

    // route line
    if (route?.polyline) {
      const path = polyline.decode(route.polyline)
        .map(([lat, lng]) => ({ lat, lng }));

      if (polylineRef.current) polylineRef.current.setMap(null);

      polylineRef.current = new window.google.maps.Polyline({
        path,
        map,
        strokeColor: "#5871A7",
      });
    }

    // vehicles
    const visible = selectedVehicleId === "all"
      ? vehicles
      : vehicles.filter(v => String(v.vehicle_id) === String(selectedVehicleId));

    visible.forEach((v) => {
      const existing = vehicleMarkersRef.current.get(v.vehicle_id);

      if (existing) {
        existing.setPosition({ lat: v.lat, lng: v.lng });
      } else {
        const marker = new window.google.maps.Marker({
          position: { lat: v.lat, lng: v.lng },
          map,
          zIndex: 999,
        });

        marker.addListener("click", () =>
          openInfo(map, marker, vehicleCard(v))
        );

        vehicleMarkersRef.current.set(v.vehicle_id, marker);
      }

      // ETA path
      const path = buildEtaPath(v);
      if (path.length > 1) {
        const existingLine = etaLinesRef.current.get(v.vehicle_id);

        if (existingLine) {
          existingLine.setPath(path);
        } else {
          const line = new window.google.maps.Polyline({
            path,
            map,
            strokeColor: "#10B981",
          });
          etaLinesRef.current.set(v.vehicle_id, line);
        }
      }
    });

  }, [stops, route, vehicles, selectedVehicleId]);

  useEffect(() => {
    if (!loading) initMap();
  }, [loading, initMap]);

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
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
        className="w-full h-[500px] rounded-xl"
      />
    </div>
  );
}