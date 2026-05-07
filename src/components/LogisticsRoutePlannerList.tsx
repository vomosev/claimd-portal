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
import { useRouter } from "next/navigation";

// ── TypeScript declaration for Google Maps on window ──────────────────────────
declare global {
  interface Window { google: any; }
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stop {
  id:        string | number;
  name?:     string;
  label?:    string;
  eta?:      string;
  address?:  string;
  sequence?: number;
  latitude?:  number | string | null;
  longitude?: number | string | null;
}

interface Route {
  polyline?: string;
}

interface LogisticsRoutePlannerProps {
  shipmentId: string | number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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

function makeStopIcon(sequence: number, isFirst: boolean, isLast: boolean) {
  const fill = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";
  const svg  = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10 16 24 16 24s16-14 16-24C32 7.16 24.84 0 16 0z"
        fill="${fill}" />
      <circle cx="16" cy="16" r="10" fill="white" opacity="0.9" />
      <text x="16" y="21" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="11" font-weight="bold"
        fill="${fill}">${sequence}</text>
    </svg>
  `;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

// ── Sortable stop row ─────────────────────────────────────────────────────────
function SortableStop({
  stop,
  index,
  total,
}: {
  stop:  Stop;
  index: number;
  total: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisItemDragging,
  } = useSortable({ id: stop.id });

  const isFirst  = index === 0;
  const isLast   = index === total - 1;
  const dotColor = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";
  const badge    = isFirst ? "Pickup" : isLast ? "Delivery" : `Stop ${index + 1}`;

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isThisItemDragging ? 0.4 : 1,
    zIndex:     isThisItemDragging ? 1 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 rounded-lg border px-4 py-3
        bg-white dark:bg-[#151E3A] transition-shadow
        ${isThisItemDragging
          ? "shadow-lg border-[#5871A7]/60"
          : "border-gray-200 dark:border-[#2E4066] hover:border-[#5871A7]/40 hover:shadow-sm"
        }
      `}
    >
      {/* Sequence circle */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
        style={{ background: dotColor }}
      >
        {index + 1}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">
            {stop.name || stop.label || `Stop ${stop.id}`}
          </p>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ color: dotColor, background: dotColor + "18" }}
          >
            {badge}
          </span>
        </div>
        {stop.address && (
          <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="flex-shrink-0" />
            {stop.address}
          </p>
        )}
        {isValidCoord(stop.latitude, stop.longitude) && (
          <p className="text-[10px] text-gray-300 dark:text-gray-600 font-mono mt-0.5">
            {Number(stop.latitude).toFixed(5)}, {Number(stop.longitude).toFixed(5)}
          </p>
        )}
      </div>

      {/* ETA */}
      {stop.eta && (
        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
          <Clock size={12} />
          {stop.eta}
        </div>
      )}

      {/* Drag handle */}
      <button
        type="button"
        className="
          touch-none p-1 rounded text-gray-300 dark:text-gray-600
          hover:text-[#5871A7] hover:bg-[#5871A7]/10
          cursor-grab active:cursor-grabbing
          focus:outline-none focus:ring-2 focus:ring-[#5871A7] flex-shrink-0
          transition-colors
        "
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
    </div>
  );
}

// ── Drag ghost ────────────────────────────────────────────────────────────────
function DragGhost({ stop }: { stop: Stop | null }) {
  if (!stop) return null;
  return (
    <div className="
      flex items-center gap-3 rounded-lg border border-[#5871A7] px-4 py-3
      bg-white dark:bg-[#151E3A] shadow-2xl opacity-95 rotate-1
    ">
      <div className="w-7 h-7 rounded-full bg-[#5871A7] text-white text-xs font-bold flex items-center justify-center">
        ·
      </div>
      <p className="font-semibold text-sm text-gray-800 dark:text-white">
        {stop.name || stop.label || `Stop ${stop.id}`}
      </p>
      <GripVertical size={16} className="text-[#5871A7] ml-auto" />
    </div>
  );
}

// ── Main combined component ───────────────────────────────────────────────────
export default function LogisticsRoutePlanner({
  shipmentId,
}: LogisticsRoutePlannerProps) {
  // ── Data state ───────────────────────────────────────────────────────────────
  const [stops,      setStops]      = useState<Stop[]>([]);
  const [route,      setRoute]      = useState<Route | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── DnD state ────────────────────────────────────────────────────────────────
  const [saving,     setSaving]     = useState(false);
  const [activeStop, setActiveStop] = useState<Stop | null>(null);

  // ── Map state ────────────────────────────────────────────────────────────────
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const markersRef      = useRef<any[]>([]);
  const polylineRef     = useRef<any | null>(null);
  const infoWindowRef   = useRef<any | null>(null);

  const router = useRouter();

  // ── Sensors ──────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── 1. Fetch stops + route ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!shipmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [stopsRes, routeRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/fleet/route/${shipmentId}`),
      ]);

      if (stopsRes.ok) {
        const data       = await stopsRes.json();
        const raw: Stop[] = Array.isArray(data) ? data : data.stops ?? [];
        setStops(raw);
      }

      if (routeRes.ok) {
        const data = await routeRes.json();
        setRoute(data);
      }
    } catch (err) {
      console.error("[RoutePlanner] Fetch error:", err);
      setError("Failed to load route data.");
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 2. Build info window content ─────────────────────────────────────────────
  const createInfoContent = useCallback(
    (stop: Stop, index: number, total: number): string => {
      const isFirst = index === 0;
      const isLast  = index === total - 1;
      const colour  = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";
      const badge   = isFirst ? "Pickup" : isLast ? "Delivery" : `Stop ${index + 1}`;
      const title   = stop.name || stop.label || `Stop ${stop.id}`;
      return `
        <div style="font-family:Arial,sans-serif;max-width:220px;line-height:1.5;">
          <div style="font-weight:bold;font-size:14px;color:${colour};margin-bottom:6px;">
            ${badge}
          </div>
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;">${title}</p>
          ${stop.address
            ? `<p style="margin:0 0 4px;font-size:12px;color:#555;">${stop.address}</p>`
            : ""}
          ${stop.eta
            ? `<p style="margin:0 0 4px;font-size:12px;color:#777;">ETA: ${stop.eta}</p>`
            : ""}
          ${isValidCoord(stop.latitude, stop.longitude)
            ? `<p style="margin:0;font-size:11px;color:#999;font-family:monospace;">
                ${Number(stop.latitude).toFixed(5)}, ${Number(stop.longitude).toFixed(5)}
               </p>
               <div style="margin-top:8px;">
                 <a href="https://www.google.com/maps?q=${stop.latitude},${stop.longitude}"
                    target="_blank"
                    style="font-size:11px;color:#4285F4;text-decoration:none;">
                   📍 Open in Google Maps
                 </a>
               </div>`
            : ""}
        </div>
      `;
    },
    []
  );

  // ── 3. Initialise / update Google Map ────────────────────────────────────────
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    // Load Google Maps script once
    if (!window.google) {
      await new Promise<void>((resolve) => {
        const existing = document.getElementById("googleMaps");
        if (!existing) {
          const script   = document.createElement("script");
          script.src     = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
          script.id      = "googleMaps";
          script.async   = true;
          script.defer   = true;
          script.onload  = () => resolve();
          document.body.appendChild(script);
        } else {
          resolve();
        }
      });
    }

    if (!window.google || !mapRef.current) return;

    // Create the map only once — reuse on subsequent calls
    if (!mapInstanceRef.current) {
      const firstStop = stops.find((s) => isValidCoord(s.latitude, s.longitude));
      const centre    = firstStop
        ? { lat: Number(firstStop.latitude), lng: Number(firstStop.longitude) }
        : { lat: 51.505, lng: -0.09 };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center:               centre,
        zoom:                 13,
        mapTypeControl:       true,
        streetViewControl:    false,
        fullscreenControl:    true,
        zoomControlOptions:   {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
      });

      mapInstanceRef.current.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
          infoWindowRef.current = null;
        }
      });
    }

    const map = mapInstanceRef.current;

    // ── Clear old markers and polyline ───────────────────────────────────────
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }

    // ── Draw polyline ────────────────────────────────────────────────────────
    if (route?.polyline) {
      try {
        const path = polyline
          .decode(route.polyline)
          .filter(([lat, lng]) => isValidCoord(lat, lng))
          .map(([lat, lng]) => ({ lat, lng }));

        if (path.length > 0) {
          polylineRef.current = new window.google.maps.Polyline({
            path,
            geodesic:      true,
            strokeColor:   "#5871A7",
            strokeOpacity: 0.85,
            strokeWeight:  5,
            map,
          });
        }
      } catch (err) {
        console.error("[RoutePlanner] Polyline decode error:", err);
      }
    }

    // ── Add markers ──────────────────────────────────────────────────────────
    const bounds = new window.google.maps.LatLngBounds();
    const total  = stops.length;

    stops.forEach((stop, i) => {
      if (!isValidCoord(stop.latitude, stop.longitude)) return;

      const isFirst = i === 0;
      const isLast  = i === total - 1;
      const seq     = stop.sequence ?? i + 1;

      const icon = {
        url:        makeStopIcon(seq, isFirst, isLast),
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
        title:  stop.name || stop.label || `Stop ${seq}`,
        icon,
        zIndex: isFirst || isLast ? 10 : 5,
      });

      marker.addListener("click", () => {
        if (infoWindowRef.current) infoWindowRef.current.close();
        const iw = new window.google.maps.InfoWindow({
          content: createInfoContent(stop, i, total),
        });
        iw.open(map, marker);
        iw.addListener("closeclick", () => { infoWindowRef.current = null; });
        infoWindowRef.current = iw;
      });

      bounds.extend(position);
      markersRef.current.push(marker);
    });

    if (stops.length > 1) {
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
    }
  }, [stops, route, createInfoContent]);

  // Re-draw the map whenever data changes
  useEffect(() => {
    if (!loading && !error) initMap();
  }, [loading, error, initMap]);

  // ── 4. Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (infoWindowRef.current) infoWindowRef.current.close();
    };
  }, []);

  // ── 5. Re-centre helper ──────────────────────────────────────────────────────
  const handleRecentre = () => {
    const map       = mapInstanceRef.current;
    const firstStop = stops.find((s) => isValidCoord(s.latitude, s.longitude));
    if (!map || !firstStop) return;
    map.setCenter({
      lat: Number(firstStop.latitude),
      lng: Number(firstStop.longitude),
    });
    map.setZoom(13);
  };

  // ── 6. Persist reordered stops ───────────────────────────────────────────────
  const persistOrder = useCallback(
    async (ordered: Stop[]) => {
      setSaving(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/planner/reorder/${shipmentId}`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ orderedStopIds: ordered.map((s) => s.id) }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success("Route order saved.");
      } catch (err) {
        console.error("[RoutePlanner] Persist error:", err);
        toast.error("Could not save route order. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [shipmentId]
  );

  // ── 7. Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveStop(stops.find((s) => s.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStop(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(stops, oldIndex, newIndex);
    setStops(reordered);
    persistOrder(reordered);
  };

  const handleDragCancel = () => setActiveStop(null);

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin h-8 w-8 text-[#5871A7] mx-auto" />
          <p className="text-sm text-gray-500">Loading route…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={15} className="flex-shrink-0" />
          {error}
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 text-sm text-[#5871A7] hover:underline"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Plan Route
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {stops.length} stop{stops.length !== 1 ? "s" : ""}
            {route?.polyline ? " · route loaded" : ""}
            {" "}— drag the handle to reorder, changes save automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Saving…
            </span>
          )}
          <button
            type="button"
            onClick={() => router.push(`/logistics/transportmap/${shipmentId}`)}
            disabled={stops.length === 0}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
              bg-[#5871A7] hover:bg-[#4560A0] text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            View Route
          </button>
          <button
            type="button"
            onClick={handleRecentre}
            disabled={stops.length === 0}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
              bg-[#5871A7] hover:bg-[#4560A0] text-white
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors
            "
          >
            Re-centre map
          </button>
          <button
            type="button"
            onClick={fetchData}
            className="
              inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm
              border border-gray-200 dark:border-[#2E4066]
              text-gray-500 hover:text-[#5871A7] hover:border-[#5871A7]/40
              transition-colors
            "
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAP — shown above the stop list
      ══════════════════════════════════════════════════════════════════════ */}
      {(stops.length > 0 || route?.polyline) ? (
        <div className="relative">
          {/* Stop colour legend */}
          {stops.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {stops.map((stop, i) => {
                const isFirst = i === 0;
                const isLast  = i === stops.length - 1;
                const colour  = isFirst ? "#10B981" : isLast ? "#EF4444" : "#5871A7";
                const badge   = isFirst ? "Pickup" : isLast ? "Delivery" : `Stop ${i + 1}`;
                return (
                  <span
                    key={stop.id ?? i}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border"
                    style={{ color: colour, borderColor: colour, background: colour + "12" }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                    {badge}{stop.name || stop.label ? ` — ${stop.name || stop.label}` : ""}
                  </span>
                );
              })}
            </div>
          )}

          {/* Google Map container */}
          <div
            ref={mapRef}
            className="w-full rounded-[20px] bg-gray-100 dark:bg-gray-800"
            style={{ height: 480, minHeight: 300 }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 rounded-[20px] border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-400">
            No location data available for this shipment.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STOP LIST — draggable, shown below the map
      ══════════════════════════════════════════════════════════════════════ */}
      {stops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
          <MapPin size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">No stops found for this shipment.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={stops.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {stops.map((stop, i) => (
                <SortableStop
                  key={stop.id}
                  stop={stop}
                  index={i}
                  total={stops.length}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            <DragGhost stop={activeStop} />
          </DragOverlay>
        </DndContext>
      )}

    </div>
  );
}