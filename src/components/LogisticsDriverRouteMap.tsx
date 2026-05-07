// components/LogisticsDriverRouteMap.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import polyline from "@mapbox/polyline";

// ── TypeScript declaration for Google Maps on window ──────────────────────────
declare global {
  interface Window {
    google: any;
  }
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

interface Route {
  polyline?: string;
}

interface LogisticsDriverRouteMapProps {
  shipmentId: string | number;
}

// ── Coordinate validator ───────────────────────────────────────────────────────
function isValidCoord(lat: any, lng: any): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    lat  != null && lng  != null &&
    !isNaN(la)   && !isNaN(ln)   &&
    la >= -90    && la <=  90    &&
    ln >= -180   && ln <=  180
  );
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

// ── Component ──────────────────────────────────────────────────────────────────
export default function LogisticsDriverRouteMap({
  shipmentId,
}: LogisticsDriverRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const [mapInstance,      setMapInstance]      = useState<any>(null);
  const [stops,            setStops]            = useState<Stop[]>([]);
  const [route,            setRoute]            = useState<Route | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<any>(null);

  // Hold marker references so we can clean them up on re-render
  const markersRef    = useRef<any[]>([]);
  const polylineRef   = useRef<any | null>(null);

  // ── 1. Fetch route data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!shipmentId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [stopsRes, routeRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/route/${shipmentId}`),
        ]);

        if (stopsRes.ok) {
          const data      = await stopsRes.json();
          const raw: Stop[] = Array.isArray(data) ? data : data.stops ?? [];
          const valid = raw.filter((s) =>
            isValidCoord(s.latitude, s.longitude)
          );
          if (valid.length < raw.length) {
            console.warn(
              `[RouteMap] ${raw.length - valid.length} stop(s) skipped — invalid coords`
            );
          }
          setStops(valid);
        }

        if (routeRes.ok) {
          const data = await routeRes.json();
          setRoute(data);
        }
      } catch (err) {
        console.error("[RouteMap] Fetch error:", err);
        setError("Failed to load route data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shipmentId]);

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

  // ── 2. Initialise Google Maps once data + script are ready ───────────────────
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    // ── Load the Maps script if not already present ──────────────────────────
    if (!window.google) {
      await new Promise<void>((resolve) => {
        const existing = document.getElementById("googleMaps");
        if (!existing) {
          const script       = document.createElement("script");
          script.src         = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
          script.id          = "googleMaps";
          script.async       = true;
          script.defer       = true;
          script.onload      = () => resolve();
          document.body.appendChild(script);
        } else {
          resolve();
        }
      });
    }

    if (!window.google || !mapRef.current) return;

    // ── Centre on the first valid stop, fallback to London ────────────────────
    const firstStop = stops.find((s) => isValidCoord(s.latitude, s.longitude));
    const centre = firstStop
      ? { lat: Number(firstStop.latitude), lng: Number(firstStop.longitude) }
      : { lat: 51.505, lng: -0.09 };

    const map = new window.google.maps.Map(mapRef.current, {
      center: centre,
      zoom:   13,
      mapTypeControl:        true,
      streetViewControl:     false,
      fullscreenControl:     true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
    });

    setMapInstance(map);

    // ── Close info window on map click ────────────────────────────────────────
    map.addListener("click", () => {
      setActiveInfoWindow((prev: any) => {
        if (prev) prev.close();
        return null;
      });
    });

    // ── Draw the route polyline ───────────────────────────────────────────────
    if (route?.polyline) {
      try {
        const decodedPath = polyline
          .decode(route.polyline)
          .filter(([lat, lng]) => isValidCoord(lat, lng))
          .map(([lat, lng]) => ({ lat, lng }));

        if (decodedPath.length > 0) {
          polylineRef.current = new window.google.maps.Polyline({
            path:          decodedPath,
            geodesic:      true,
            strokeColor:   "#5871A7",
            strokeOpacity: 0.85,
            strokeWeight:  5,
            map,
          });
        }
      } catch (err) {
        console.error("[RouteMap] Polyline decode error:", err);
      }
    }

    // ── Clear any old markers ─────────────────────────────────────────────────
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // ── Add a marker for each stop ────────────────────────────────────────────
    const bounds = new window.google.maps.LatLngBounds();

    stops.forEach((stop, i) => {
      if (!isValidCoord(stop.latitude, stop.longitude)) return;

      const isFirst = i === 0;
      const isLast  = i === stops.length - 1;
      const seq     = stop.sequence ?? i + 1;

      // Build the SVG icon
      const iconDef = makeStopIcon(seq, isFirst, isLast);
      const icon = {
        url:        iconDef.url,
        scaledSize: new window.google.maps.Size(32, 40),
        anchor:     new window.google.maps.Point(16, 40),
      };

      const position = {
        lat: Number(stop.latitude),
        lng: Number(stop.longitude),
      };

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: stop.label || `Stop ${seq}`,
        icon,
        zIndex: isFirst || isLast ? 10 : 5,
      });

      // Info window on click
      marker.addListener("click", () => {
        setActiveInfoWindow((prev: any) => {
          if (prev) prev.close();
          const iw = new window.google.maps.InfoWindow({
            content: createStopInfoContent(stop, i),
          });
          iw.open(map, marker);
          iw.addListener("closeclick", () => setActiveInfoWindow(null));
          return iw;
        });
      });

      bounds.extend(position);
      markersRef.current.push(marker);
    });

    // Fit the map to all markers (only if we have more than one)
    if (stops.length > 1) {
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, route]);

  // Re-initialise the map whenever data changes
  useEffect(() => {
    if (!loading && !error && (stops.length > 0 || route?.polyline)) {
      initMap();
    }
  }, [loading, error, stops, route, initMap]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, []);

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

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-[20px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-sm text-gray-500">Loading route…</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-[20px] border border-red-200 bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (stops.length === 0 && !route?.polyline) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-[20px] border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-400">
          No route data available for this shipment.
        </p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Shipment Route
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {stops.length} stop{stops.length !== 1 ? "s" : ""}
            {route?.polyline ? " · route loaded" : ""}
          </p>
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

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-[20px] bg-gray-100"
        style={{ minHeight: 500 }}
      />

    </div>
  );
}