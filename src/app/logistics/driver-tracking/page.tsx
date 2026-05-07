"use client";

import { useEffect, useRef, useState } from "react";

export default function DriverTracking() {
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState("Connecting...");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const vehicleId = 1;     // 🔥 replace with logged-in user
  const shipmentId = 1001; // 🔥 dynamic

  useEffect(() => {
    // ── Connect WebSocket ─────────────────────────────
    const ws = new WebSocket("ws://nodejs.gridiron-app.com:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Connected");
    };

    ws.onclose = () => {
      setStatus("Disconnected");
    };

    ws.onerror = () => {
      setStatus("Error");
    };

    // ── Start GPS tracking ────────────────────────────
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;

        setCoords({ lat: latitude, lng: longitude });

        const payload = {
          vehicleId,
          shipmentId,
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || 0
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
        }
      },
      (err) => {
        console.error("GPS error:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      ws.close();
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Driver Tracking</h1>

      <p>Status: {status}</p>

      {coords && (
        <div className="mt-4">
          <p>Latitude: {coords.lat}</p>
          <p>Longitude: {coords.lng}</p>
        </div>
      )}
    </div>
  );
}