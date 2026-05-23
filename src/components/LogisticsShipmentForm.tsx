// components/LogisticsShipmentForm.tsx
"use client";

import * as z from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useState,
  useCallback,
  useEffect
} from "react";
import { useRouter } from "next/navigation";
import {
  Package, MapPin, Plus, Trash2, Save,
  ArrowLeft, ChevronUp, ChevronDown,
  Loader2, CheckCircle, Search, Clock,
  Navigation, AlertTriangle,
} from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ShipmentFormProps {
  mode:        "add" | "edit";
  shipmentId?: number;
}

// ── Stop type options ──────────────────────────────────────────────────────────
const STOP_TYPES = [
  { value: "pickup",   label: "Pickup",    icon: "📦" },
  { value: "delivery", label: "Delivery",  icon: "🏠" },
  { value: "waypoint", label: "Waypoint",  icon: "📍" },
  { value: "depot",    label: "Depot",     icon: "🏭" },
  { value: "rest",     label: "Rest Stop", icon: "☕" },
  { value: "fuel",     label: "Fuel Stop", icon: "⛽" },
];

const STOP_STATUSES = [
  { value: "pending",   label: "Pending"   },
  { value: "en_route",  label: "En Route"  },
  { value: "arrived",   label: "Arrived"   },
  { value: "completed", label: "Completed" },
  { value: "skipped",   label: "Skipped"   },
];

// ── Zod schema ─────────────────────────────────────────────────────────────────
// ✅ Use plain z.string() for all fields — no .default()
// Defaults are supplied in defaultValues / emptyStop() instead.
const stopSchema = z.object({
  name:             z.string().min(1, "Stop name is required"),
  type:             z.string().min(1, "Stop type is required"),
  address:          z.string().optional(),
  latitude:         z.string().optional(),
  longitude:        z.string().optional(),
  status:           z.string(),           // ← was z.string().default("pending")
  eta:              z.string().optional(),
  actual_arrival:   z.string().optional(),
  actual_departure: z.string().optional(),
  duration_sec:     z.string().optional(),
  distance_m:       z.string().optional(),
});

const schema = z.object({
  reference:   z.string().min(1, "Route reference is required"),
  description: z.string().optional(),
  driver:      z.string().optional(),
  vehicle:     z.string().optional(),
  stops:       z.array(stopSchema).min(1, "Add at least one stop"),
});

type FormValues    = z.infer<typeof schema>;
type StopFormValue = z.infer<typeof stopSchema>;

// ── Empty stop factory ─────────────────────────────────────────────────────────
// ✅ status: "pending" lives here — not in the schema's .default()
const emptyStop = (): StopFormValue => ({
  name:             "",
  type:             "delivery",
  address:          "",
  latitude:         "",
  longitude:        "",
  status:           "pending",
  eta:              "",
  actual_arrival:   "",
  actual_departure: "",
  duration_sec:     "",
  distance_m:       "",
});

// ── Address geocoding helper ───────────────────────────────────────────────────
async function geocodeAddress(
  address: string
): Promise<{ lat: string; lng: string } | null> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: data[0].lat, lng: data[0].lon };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Stop type badge ────────────────────────────────────────────────────────────
function StopTypeBadge({ type }: { type: string }) {
  const cfg = STOP_TYPES.find((t) => t.value === type);
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-[#5871A7]/10 text-[#5871A7]">
      {cfg?.icon} {cfg?.label ?? type}
    </span>
  );
}

// ── Single stop card ───────────────────────────────────────────────────────────
interface StopCardProps {
  index:      number;
  total:      number;
  form:       any;
  onRemove:   (i: number) => void;
  onMoveUp:   (i: number) => void;
  onMoveDown: (i: number) => void;
  onGeocode:  (i: number) => void;
  geocoding:  boolean;
}

function StopCard({
  index, total, form, onRemove, onMoveUp, onMoveDown, onGeocode, geocoding,
}: StopCardProps) {
  const type = form.watch(`stops.${index}.type`);

  return (
    <div className="rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] overflow-hidden">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-[#D4D8EA] dark:border-[#2E4066]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#5871A7] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </div>
          <div className="flex items-center gap-2">
            <StopTypeBadge type={type || "delivery"} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {form.watch(`stops.${index}.name`) || `Stop ${index + 1}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronUp size={14} />
          </button>
          <button type="button" onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronDown size={14} />
          </button>
          <button type="button" onClick={() => onRemove(index)}
            disabled={total <= 1}
            className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-4">

        {/* Row 1 — name + type + status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <FormField name={`stops.${index}.name`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Stop Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Warehouse A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField name={`stops.${index}.type`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STOP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField name={`stops.${index}.status`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "pending"}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STOP_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

        </div>

        {/* Row 2 — address + geocode */}
        <FormField name={`stops.${index}.address`} control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                  <Input className="pl-9" placeholder="Full address or postcode" {...field} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-10 px-3 border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
                  onClick={() => onGeocode(index)}
                  disabled={geocoding || !field.value}
                  title="Look up coordinates from address"
                >
                  {geocoding
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Search size={14} />
                  }
                </Button>
              </div>
            </FormControl>
            <FormDescription>
              Click the search button to auto-fill latitude and longitude.
            </FormDescription>
          </FormItem>
        )} />

        {/* Row 3 — lat / lng */}
        <div className="grid grid-cols-2 gap-4">
          <FormField name={`stops.${index}.latitude`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 51.50740" className="font-mono text-sm" {...field} />
              </FormControl>
            </FormItem>
          )} />
          <FormField name={`stops.${index}.longitude`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Longitude</FormLabel>
              <FormControl>
                <Input placeholder="e.g. -0.12782" className="font-mono text-sm" {...field} />
              </FormControl>
            </FormItem>
          )} />
        </div>

        {/* Row 4 — ETA + arrival + departure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField name={`stops.${index}.eta`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Clock size={13} className="text-[#5871A7]" /> ETA
              </FormLabel>
              <FormControl>
                <Input type="datetime-local" className="dark:[color-scheme:dark]" {...field} />
              </FormControl>
            </FormItem>
          )} />
          <FormField name={`stops.${index}.actual_arrival`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Navigation size={13} className="text-green-500" /> Actual Arrival
              </FormLabel>
              <FormControl>
                <Input type="datetime-local" className="dark:[color-scheme:dark]" {...field} />
              </FormControl>
            </FormItem>
          )} />
          <FormField name={`stops.${index}.actual_departure`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Navigation size={13} className="text-blue-500" style={{ transform: "scaleX(-1)" }} />
                Actual Departure
              </FormLabel>
              <FormControl>
                <Input type="datetime-local" className="dark:[color-scheme:dark]" {...field} />
              </FormControl>
            </FormItem>
          )} />
        </div>

        {/* Row 5 — duration + distance */}
        <div className="grid grid-cols-2 gap-4">
          <FormField name={`stops.${index}.duration_sec`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Duration at Stop (seconds)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="e.g. 900 (= 15 min)" {...field} />
              </FormControl>
              {field.value && (
                <FormDescription>
                  ≈ {Math.round(Number(field.value) / 60)} minute{Math.round(Number(field.value) / 60) !== 1 ? "s" : ""}
                </FormDescription>
              )}
            </FormItem>
          )} />
          <FormField name={`stops.${index}.distance_m`} control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Distance to Next Stop (metres)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="e.g. 5000 (= 5 km)" {...field} />
              </FormControl>
              {field.value && (
                <FormDescription>
                  ≈ {(Number(field.value) / 1000).toFixed(1)} km
                </FormDescription>
              )}
            </FormItem>
          )} />
        </div>

      </div>
    </div>
  );
}

// ── Confirmation screen ────────────────────────────────────────────────────────
function ConfirmationScreen({
  shipmentId,
  stopCount,
  onNew,
}: {
  shipmentId: number;
  stopCount:  number;
  onNew:      () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 py-12">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Route Created
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {stopCount} stop{stopCount !== 1 ? "s" : ""} added to the route.
        </p>
        <div className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#5871A7]/10 border border-[#5871A7]/30">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
            Route ID
          </p>
          <p className="text-xl font-mono font-bold text-[#5871A7]">
            SHP-{String(shipmentId).padStart(6, "0")}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/logistics/shipments")}>
          View All Routes
        </Button>
        <Button className="bg-[#5871A7] hover:bg-[#4560A0] text-white" onClick={onNew}>
          Add Another Route
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ShipmentForm({ mode, shipmentId }: ShipmentFormProps) {
  const router = useRouter();

  const [saving,       setSaving]       = useState(false);
  const [confirmed,    setConfirmed]    = useState(false);
  const [savedId,      setSavedId]      = useState<number | null>(null);
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null);
  const [loadingShipment, setLoadingShipment] = useState(mode === "edit");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reference:   "",
      description: "",
      driver:      "",
      vehicle:     "",
      // ✅ status: "pending" is set here in emptyStop() — not in the schema
      stops: [emptyStop()],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name:    "stops",
  });

  const [currentUsername, setCurrentUsername] = useState("");

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  useEffect(() => {

    if (
      mode !== "edit" ||
      !shipmentId
    ) {
      return;
    }

    const loadShipment =
      async () => {

        try {

          setLoadingShipment(true);

          const res =
            await fetch(

              `${process.env.NEXT_PUBLIC_API_URL}/logistics/shipments/${shipmentId}`
            );

          const data =
            await res.json();

          form.reset({

            reference:
              data.reference || "",

            description:
              data.description || "",

            driver:
              data.driver || "",

            vehicle:
              data.vehicle || "",

            stops:
              data.stops?.length
                ? data.stops.map((s: any) => ({

                    name:
                      s.name || "",

                    type:
                      s.type || "delivery",

                    address:
                      s.address || "",

                    latitude:
                      s.latitude
                        ? String(s.latitude)
                        : "",

                    longitude:
                      s.longitude
                        ? String(s.longitude)
                        : "",

                    status:
                      s.status || "pending",

                    eta:
                      s.eta || "",

                    actual_arrival:
                      s.actual_arrival || "",

                    actual_departure:
                      s.actual_departure || "",

                    duration_sec:
                      s.duration_sec
                        ? String(s.duration_sec)
                        : "",

                    distance_m:
                      s.distance_m
                        ? String(s.distance_m)
                        : ""
                  }))

                : [emptyStop()]
          });

        } catch (err) {

          console.error(
            "Failed to load shipment",
            err
          );

          toast.error(
            "Failed to load shipment"
          );

        } finally {

          setLoadingShipment(false);
        }
      };

    loadShipment();

  }, [
    mode,
    shipmentId,
    form
  ]);

  // ── Geocode a single stop ──────────────────────────────────────────────────
  const handleGeocode = useCallback(async (index: number) => {
    const address = form.getValues(`stops.${index}.address`);
    if (!address) { toast.error("Enter an address first."); return; }

    setGeocodingIdx(index);
    const result = await geocodeAddress(address);
    setGeocodingIdx(null);

    if (result) {
      form.setValue(`stops.${index}.latitude`,  result.lat, { shouldDirty: true });
      form.setValue(`stops.${index}.longitude`, result.lng, { shouldDirty: true });
      toast.success("Coordinates found.");
    } else {
      toast.error("Address not found — try a more specific address.");
    }
  }, [form]);

  // ── Reorder helpers ────────────────────────────────────────────────────────
  const moveUp   = (i: number) => { if (i > 0)                  move(i, i - 1); };
  const moveDown = (i: number) => { if (i < fields.length - 1)  move(i, i + 1); };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const endpoint =
        mode === "add"
          ? `${process.env.NEXT_PUBLIC_API_URL}/logistics/shipments`
          : `${process.env.NEXT_PUBLIC_API_URL}/logistics/shipments/${shipmentId}`;

      const stopsPayload = values.stops.map((stop, i) => ({
        name:             stop.name,
        type:             stop.type,
        address:          stop.address          || null,
        latitude:         stop.latitude         ? Number(stop.latitude)     : null,
        longitude:        stop.longitude        ? Number(stop.longitude)    : null,
        status:           stop.status           || "pending",
        eta:              stop.eta              || null,
        actual_arrival:   stop.actual_arrival   || null,
        actual_departure: stop.actual_departure || null,
        duration_sec:     stop.duration_sec     ? Number(stop.duration_sec) : null,
        distance_m:       stop.distance_m       ? Number(stop.distance_m)   : null,
        sequence_order:   i + 1,
      }));

      const res = await fetch(endpoint, {
        method:  mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          reference:   values.reference,
          description: values.description || null,
          driver:      currentUsername    || null,
          vehicle:     values.vehicle     || null,
          stops:       stopsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (mode === "add") {
        setSavedId(data.shipmentId ?? data.id);
        setConfirmed(true);
        toast.success("Route created successfully!");
      } else {
        toast.success("Route updated successfully!");
      }
      router.push(`/logistics/transportlist/${shipmentId}`);
    } catch (err: any) {
      console.error("Route submit error:", err);
      toast.error("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (confirmed && savedId) {
    return (
      <div className="lg:w-[85%]">
        <ConfirmationScreen
          shipmentId={savedId}
          stopCount={form.getValues("stops").length}
          onNew={() => {
            setConfirmed(false);
            setSavedId(null);
            form.reset();
          }}
        />
      </div>
    );
  }

  if (loadingShipment) {

    return (

      <div className="
        flex
        items-center
        justify-center
        py-20
      ">

        <Loader2
          className="
            animate-spin
            text-[#5871A7]
          "
          size={40}
        />

      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2.5">
            <Package className="text-[#5871A7]" size={28} />
            {mode === "add"
              ? "New Route"
              : `Edit Route — SHP-${String(shipmentId).padStart(6, "0")}`
            }
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "add"
              ? "Create a route and add all stops in sequence order."
              : "Update route details and stops."
            }
          </p>
        </div>
        {shipmentId && (
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono">
            SHP-{String(shipmentId).padStart(6, "0")}
          </span>
        )}
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── Section 1: Route details ──────────────────────────────── */}
          <section className="space-y-5">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Package className="text-[#5871A7]" size={20} />
              Route Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField name="reference" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reference *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SHP-2025-001 or your internal reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="driver" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={currentUsername}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-default"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="vehicle" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Vehicle reg or ID" {...field} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="description" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the shipment" {...field} />
                  </FormControl>
                </FormItem>
              )} />

            </div>
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: Stops ─────────────────────────────────────────── */}
          <section className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2.5">
                  <MapPin className="text-[#5871A7]" size={20} />
                  Route Stops
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Add stops in order — use the arrows to reorder them.
                </p>
              </div>
              <span className="text-xs font-semibold bg-[#5871A7]/10 text-[#5871A7] px-3 py-1.5 rounded-full">
                {fields.length} stop{fields.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Array-level validation error */}
            {form.formState.errors.stops?.root && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={14} />
                {form.formState.errors.stops.root.message}
              </div>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => (
                <StopCard
                  key={field.id}
                  index={index}
                  total={fields.length}
                  form={form}
                  onRemove={remove}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onGeocode={handleGeocode}
                  geocoding={geocodingIdx === index}
                />
              ))}
            </div>

            {/* Add stop */}
            <Button
              type="button"
              variant="outline"
              // ✅ append uses emptyStop() which supplies status: "pending" explicitly
              onClick={() => append(emptyStop())}
              className="w-full border-dashed border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
            >
              <Plus size={16} className="mr-2" />
              Add Stop
            </Button>

            {/* Route summary */}
            {fields.length > 1 && (
              <div className="rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-900/50 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Route Summary
                </p>
                <div className="space-y-1.5">
                  {fields.map((_, i) => {
                    const name = form.watch(`stops.${i}.name`);
                    const type = form.watch(`stops.${i}.type`);
                    const cfg  = STOP_TYPES.find((t) => t.value === type);
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[#5871A7] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-gray-400">{cfg?.icon}</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {name || `Stop ${i + 1}`}
                        </span>
                        {i < fields.length - 1 && (
                          <span className="text-gray-300 dark:text-gray-600 ml-auto text-xs">↓</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total distance */}
                {(() => {
                  const total = form
                    .getValues("stops")
                    .reduce((sum, s) => sum + (Number(s.distance_m) || 0), 0);
                  return total > 0 ? (
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-[#D4D8EA] dark:border-[#2E4066]">
                      Total route distance:{" "}
                      <strong>{(total / 1000).toFixed(1)} km</strong>
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="md:w-[10%] order-1 md:order-none"
              onClick={() => router.push("/logistics/shipments")}
            >
              <ArrowLeft size={15} className="mr-1.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="md:w-[45%] bg-[#5871A7] hover:bg-[#4560A0] text-white"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {mode === "add" ? "Creating Route…" : "Updating Route…"}
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {mode === "add" ? "Create Route" : "Update Route"}
                </>
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}