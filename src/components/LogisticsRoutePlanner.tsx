// components/RoutePlanner.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { GripVertical, MapPin, Clock, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stop {
  id:        string | number;
  name?:     string;
  eta?:      string;
  address?:  string;
  sequence?: number;
}

interface RoutePlannerProps {
  shipmentId: string | number;
}

// ── Sortable stop item ─────────────────────────────────────────────────────────
// Each stop must use useSortable to actually become draggable.
// Without this the DndContext renders but nothing can be dragged.
function SortableStop({
  stop,
  index,
  isDragging,
}: {
  stop:       Stop;
  index:      number;
  isDragging: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisItemDragging,
  } = useSortable({ id: stop.id });

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
        bg-white dark:bg-[#151E3A]
        transition-shadow
        ${isThisItemDragging
          ? "shadow-lg border-[#5871A7]/60"
          : "border-gray-200 dark:border-[#2E4066] hover:border-[#5871A7]/40 hover:shadow-sm"
        }
      `}
    >
      {/* Sequence number */}
      <div className="
        w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
        bg-[#5871A7]/10 text-[#5871A7] text-xs font-bold
      ">
        {index + 1}
      </div>

      {/* Stop details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">
          {stop.name || `Stop ${stop.id}`}
        </p>
        {stop.address && (
          <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="flex-shrink-0" />
            {stop.address}
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

      {/* Drag handle — listeners must be on the handle, not the whole row */}
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

// ── Ghost item shown under the cursor while dragging ──────────────────────────
function DragGhost({ stop }: { stop: Stop | null }) {
  if (!stop) return null;
  return (
    <div className="
      flex items-center gap-3 rounded-lg border border-[#5871A7] px-4 py-3
      bg-white dark:bg-[#151E3A] shadow-2xl opacity-95 rotate-1
    ">
      <div className="w-7 h-7 rounded-full bg-[#5871A7] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        ·
      </div>
      <p className="font-semibold text-sm text-gray-800 dark:text-white">
        {stop.name || `Stop ${stop.id}`}
      </p>
      <GripVertical size={16} className="text-[#5871A7] ml-auto flex-shrink-0" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RoutePlanner({ shipmentId }: RoutePlannerProps) {
  const [stops,          setStops]          = useState<Stop[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [activeStop,     setActiveStop]     = useState<Stop | null>(null);

  // ── Configure sensors ──────────────────────────────────────────────────────
  // PointerSensor for mouse/touch, KeyboardSensor for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small drag distance before activating
      // so that click events on the row still fire normally
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Fetch stops ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shipmentId) return;
    setLoading(true);
    setError(null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStops(Array.isArray(data) ? data : data.stops ?? []);
      })
      .catch((err) => {
        console.error("Failed to load stops:", err);
        setError("Failed to load route stops.");
      })
      .finally(() => setLoading(false));
  }, [shipmentId]);

  // ── Persist reordered stops ────────────────────────────────────────────────
  const persistOrder = useCallback(
    async (orderedStops: Stop[]) => {
      setSaving(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/planner/reorder/${shipmentId}`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              orderedStopIds: orderedStops.map((s) => s.id),
            }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success("Route order saved.");
      } catch (err) {
        console.error("Failed to persist order:", err);
        toast.error("Could not save route order. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [shipmentId]
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const dragged = stops.find((s) => s.id === event.active.id) ?? null;
    setActiveStop(dragged);
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

  // ── Render guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin h-7 w-7 text-[#5871A7] mx-auto" />
          <p className="text-sm text-gray-500">Loading route stops…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
        <AlertTriangle size={15} className="flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
        <MapPin size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No stops found for this shipment.</p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Route Planner
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag the handle on the right to reorder stops.
            Changes are saved automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Saving…
            </span>
          )}
          <span className="text-xs bg-[#5871A7]/10 text-[#5871A7] px-2.5 py-1 rounded-full font-medium">
            {stops.length} stop{stops.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Sortable list */}
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
                isDragging={activeStop?.id === stop.id}
              />
            ))}
          </div>
        </SortableContext>

        {/* DragOverlay renders a floating ghost under the cursor ────────────── */}
        <DragOverlay>
          <DragGhost stop={activeStop} />
        </DragOverlay>
      </DndContext>

    </div>
  );
}