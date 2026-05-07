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

export default function LogisticsRoutePlanner({ shipmentId }: { shipmentId: string | number }) {

  const [stops, setStops] = useState<Stop[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<any>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const stopMarkersRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<Map<any, any>>(new Map());
  const etaLinesRef = useRef<Map<any, any>>(new Map());
  const polylineRef = useRef<any>(null);

  // ── Helpers ─────────────────────────────────────
  const isValidCoord = (lat: any, lng: any) =>
    lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));

  // ── Fetch data ─────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/route/${shipmentId}`)
      ]);

      setStops(await s.json());
      setRoute(await r.json());
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  const fetchVehicles = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/live`);
    const data = await res.json();
    setVehicles(data);
  }, []);

  useEffect(() => {
    fetchData();
    fetchVehicles();
    const i = setInterval(fetchVehicles, 5000);
    return () => clearInterval(i);
  }, []);

  // ── ETA path ───────────────────────────────────
  const buildEtaPath = (v: any) => {
    if (!stops.length) return [];

    const vehiclePos = { lat: Number(v.lat), lng: Number(v.lng) };

    let closest = 0;
    let min = Infinity;

    stops.forEach((s, i) => {
      if (!isValidCoord(s.latitude, s.longitude)) return;
      const dx = Number(s.latitude) - vehiclePos.lat;
      const dy = Number(s.longitude) - vehiclePos.lng;
      const d = dx * dx + dy * dy;
      if (d < min) {
        min = d;
        closest = i;
      }
    });

    return [
      vehiclePos,
      ...stops.slice(closest)
        .filter(s => isValidCoord(s.latitude, s.longitude))
        .map(s => ({
          lat: Number(s.latitude),
          lng: Number(s.longitude)
        }))
    ];
  };

  // ── Map init ───────────────────────────────────
  const initMap = useCallback(async () => {

    if (!window.google) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 51.5, lng: -0.09 },
        zoom: 12
      });
    }

    const map = mapInstanceRef.current;

    // ── Clear stops ─────────────────────────────
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    // ── Draw stops ─────────────────────────────
    stops.forEach((s) => {
      if (!isValidCoord(s.latitude, s.longitude)) return;

      const m = new window.google.maps.Marker({
        position: {
          lat: Number(s.latitude),
          lng: Number(s.longitude)
        },
        map
      });

      stopMarkersRef.current.push(m);
    });

    // ── Draw route ─────────────────────────────
    if (route?.polyline) {
      if (polylineRef.current) polylineRef.current.setMap(null);

      polylineRef.current = new window.google.maps.Polyline({
        path: polyline.decode(route.polyline).map(([lat, lng]) => ({ lat, lng })),
        map,
        strokeColor: "#5871A7"
      });
    }

    // ── Filter vehicles ─────────────────────────
    const visible = selectedVehicleId === "all"
      ? vehicles
      : vehicles.filter(v => v.vehicle_id == selectedVehicleId);

    const visibleIds = new Set(visible.map(v => v.vehicle_id));

    // ── Vehicles ───────────────────────────────
    visible.forEach(v => {

      if (!isValidCoord(v.lat, v.lng)) return;

      const id = v.vehicle_id;
      let marker = vehicleMarkersRef.current.get(id);

      if (!marker) {
        marker = new window.google.maps.Marker({
          position: { lat: Number(v.lat), lng: Number(v.lng) },
          map,
          zIndex: 999
        });
        vehicleMarkersRef.current.set(id, marker);
      } else {
        marker.setPosition({
          lat: Number(v.lat),
          lng: Number(v.lng)
        });
      }

      // ETA line
      const path = buildEtaPath(v);

      if (path.length > 1) {
        let line = etaLinesRef.current.get(id);

        if (!line) {
          line = new window.google.maps.Polyline({
            path,
            strokeColor: "#10B981",
            strokeWeight: 4,
            map
          });
          etaLinesRef.current.set(id, line);
        } else {
          line.setPath(path);
        }
      }
    });

    // ── CLEANUP ───────────────────────────────
    vehicleMarkersRef.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.setMap(null);
        vehicleMarkersRef.current.delete(id);
      }
    });

    etaLinesRef.current.forEach((line, id) => {
      if (!visibleIds.has(id)) {
        line.setMap(null);
        etaLinesRef.current.delete(id);
      }
    });

  }, [stops, route, vehicles, selectedVehicleId]);

  useEffect(() => {
    if (!loading) initMap();
  }, [loading, initMap]);

  // ── UI ───────────────────────────────────────
  if (loading) return <div>Loading...</div>;

  return (
    <div>

      {/* FILTER */}
      <select
        value={selectedVehicleId}
        onChange={(e) => setSelectedVehicleId(e.target.value)}
      >
        <option value="all">All Vehicles</option>
        {vehicles.map(v => (
          <option key={v.vehicle_id} value={v.vehicle_id}>
            Vehicle {v.vehicle_id}
          </option>
        ))}
      </select>

      {/* MAP */}
      <div ref={mapRef} style={{ height: 500 }} />

    </div>
  );
}