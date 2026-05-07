// components/LogisticsRoutePlanner.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import polyline from "@mapbox/polyline";

// Google Maps typing
declare global {
  interface Window { google: any; }
}

interface Stop {
  id: string | number;
  name?: string;
  label?: string;
  eta?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export default function LogisticsRoutePlanner({ shipmentId }: any) {

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const stopMarkersRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<Map<any, any>>(new Map());
  const directionsRef = useRef<Map<any, any>>(new Map());
  const trailRef = useRef<Map<any, any[]>>(new Map());

  const infoWindowRef = useRef<any>(null);

  const [stops, setStops] = useState<Stop[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<any>("all");

  const [loading, setLoading] = useState(true);

  // ── Helpers ─────────────────────────────────────
  const isValidCoord = (lat: any, lng: any) => {
    const la = Number(lat);
    const ln = Number(lng);
    return !isNaN(la) && !isNaN(ln);
  };

  const openInfo = (map: any, marker: any, html: string) => {
    if (infoWindowRef.current) infoWindowRef.current.close();
    const iw = new window.google.maps.InfoWindow({ content: html });
    iw.open(map, marker);
    infoWindowRef.current = iw;
  };

  const stopCard = (s: Stop) => `
    <div>
      <strong>${s.name || s.label || "Stop"}</strong><br/>
      ${s.address || ""}
      ${s.eta ? `<br/>ETA: ${s.eta}` : ""}
    </div>
  `;

  const vehicleCard = (v: any) => `
    <div>
      <strong>Vehicle ${v.vehicle_id}</strong><br/>
      Speed: ${v.speed || 0}<br/>
      Status: ${v.status || ""}
    </div>
  `;

  // ── Fetch data ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);

    const [sRes, vRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/live`)
    ]);

    const sData = await sRes.json();
    const vData = await vRes.json();

    setStops(Array.isArray(sData) ? sData : sData.stops ?? []);
    setVehicles(Array.isArray(vData) ? vData : vData.vehicles ?? []);

    setLoading(false);
  }, [shipmentId]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 5000);
    return () => clearInterval(i);
  }, [fetchData]);

  // ── Map init ─────────────────────────────────────
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
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    stops.forEach(s => {
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

    // ── Vehicles ─────────────────────────────
    const visibleVehicles =
      selectedVehicleId === "all"
        ? vehicles
        : vehicles.filter(v => String(v.vehicle_id) === String(selectedVehicleId));

    visibleVehicles.forEach(v => {

      const id = v.vehicle_id;

      const pos = {
        lat: Number(v.lat),
        lng: Number(v.lng),
      };

      if (!isValidCoord(pos.lat, pos.lng)) return;

      let marker = vehicleMarkersRef.current.get(id);

      if (!marker) {
        marker = new window.google.maps.Marker({
          position: pos,
          map,
          zIndex: 999,
        });

        marker.addListener("click", () =>
          openInfo(map, marker, vehicleCard(v))
        );

        vehicleMarkersRef.current.set(id, marker);
      } else {
        marker.setPosition(pos);
      }

      // ── Breadcrumb trail ───────────────────
      const trail = trailRef.current.get(id) || [];
      trail.push(pos);
      if (trail.length > 30) trail.shift();
      trailRef.current.set(id, trail);

      new window.google.maps.Polyline({
        path: trail,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.5,
        strokeWeight: 3,
        map,
      });

      // ── Directions (ONLY for selected vehicle) ─────────
      if (selectedVehicleId !== "all" && String(selectedVehicleId) === String(id)) {

        const directionsService = new window.google.maps.DirectionsService();

        const waypoints = stops
          .filter(s => isValidCoord(s.latitude, s.longitude))
          .map(s => ({
            location: {
              lat: Number(s.latitude),
              lng: Number(s.longitude),
            },
            stopover: true,
          }));

        if (waypoints.length === 0) return;

        const request = {
          origin: pos,
          destination: waypoints[waypoints.length - 1].location,
          waypoints: waypoints.slice(0, -1),
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: "bestguess",
          },
        };

        directionsService.route(request, (result: any, status: any) => {
          if (status !== "OK") return;

          const existing = directionsRef.current.get(id);
          if (existing) existing.setMap(null);

          const renderer = new window.google.maps.DirectionsRenderer({
            directions: result,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#10B981",
              strokeWeight: 5,
            },
            map,
          });

          directionsRef.current.set(id, renderer);
        });
      }
    });

  }, [stops, vehicles, selectedVehicleId]);

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

      <div ref={mapRef} className="w-full h-[500px]" />

    </div>
  );
}