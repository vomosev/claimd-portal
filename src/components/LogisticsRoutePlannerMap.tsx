"use client";

import { useEffect, useState, useRef, useCallback } from "react";

declare global {
  interface Window { google: any }
}

export default function LogisticsRoutePlanner({ shipmentId }: any) {

  const mapRef = useRef<HTMLDivElement>(null);
  const mapRefInstance = useRef<any>(null);

  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  const vehicleMarkersRef = useRef<Map<any, any>>(new Map());
  const stopMarkersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const lastRouteRequestRef = useRef<number>(0);

  const [stops, setStops] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<any>("all");

  // ── Helpers ─────────────────────────────
  const isValid = (lat: any, lng: any) =>
    !isNaN(Number(lat)) && !isNaN(Number(lng));

  const distance = (a: any, b: any) => {
    const dx = a.lat - b.lat;
    const dy = a.lng - b.lng;
    return dx * dx + dy * dy;
  };

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

  // ── Auto reorder stops (cheap optimisation) ─────────────
  const reorderStops = (vehicle: any, stops: any[]) => {
    const remaining = [...stops];
    const ordered: any[] = [];

    let current = { lat: Number(vehicle.lat), lng: Number(vehicle.lng) };

    while (remaining.length) {
      let nearestIndex = 0;
      let min = Infinity;

      remaining.forEach((s, i) => {
        if (!isValid(s.latitude, s.longitude)) return;
        const d = distance(current, {
          lat: Number(s.latitude),
          lng: Number(s.longitude),
        });
        if (d < min) {
          min = d;
          nearestIndex = i;
        }
      });

      const next = remaining.splice(nearestIndex, 1)[0];
      ordered.push(next);
      current = {
        lat: Number(next.latitude),
        lng: Number(next.longitude),
      };
    }

    return ordered;
  };

  // ── Smooth animation ─────────────────────
  const animateMarker = (marker: any, newPos: any) => {
    const start = marker.getPosition();
    const startTime = performance.now();

    const duration = 800;

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);

      const lat = start.lat() + (newPos.lat - start.lat()) * progress;
      const lng = start.lng() + (newPos.lng - start.lng()) * progress;

      marker.setPosition({ lat, lng });

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
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

    const map = mapRefInstance.current;

    // ── Clear stop markers ─────────────────
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    const vehicle = vehicles.find(v => String(v.vehicle_id) === String(selectedVehicleId));

    const orderedStops =
      vehicle && selectedVehicleId !== "all"
        ? reorderStops(vehicle, stops)
        : stops;

    // ── Stop markers with status ───────────
    orderedStops.forEach((s, i) => {

      const pos = {
        lat: Number(s.latitude),
        lng: Number(s.longitude),
      };

      if (!isValid(pos.lat, pos.lng)) return;

      let color = "#3B82F6"; // pending
      if (i === 0) color = "#F59E0B"; // next
      if (s.completed) color = "#10B981"; // done

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 1,
          strokeWeight: 1,
        }
      });

      marker.addListener("click", () =>
        openInfo(map, marker, `
          <div>
            <strong>${s.name || "Stop"}</strong><br/>
            ${s.address || ""}<br/>
            Status: ${s.completed ? "Completed" : i === 0 ? "Next Stop" : "Pending"}
          </div>
        `)
      );

      stopMarkersRef.current.push(marker);
    });

    // ── Vehicles ───────────────────────────
    vehicles.forEach(v => {

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
        });

        vehicleMarkersRef.current.set(v.vehicle_id, marker);
      } else {
        animateMarker(marker, pos);
      }

      // ── Directions (optimised calls) ─────
      if (selectedVehicleId === v.vehicle_id) {

        const now = Date.now();

        if (now - lastRouteRequestRef.current < 4000) return; // debounce

        lastRouteRequestRef.current = now;

        const validStops = reorderStops(v, stops);

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
            optimizeWaypoints: true,
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