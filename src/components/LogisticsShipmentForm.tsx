// components/LogisticsShipmentForm.tsx

"use client";

import * as z from "zod";

import {
  useForm,
  useFieldArray
} from "react-hook-form";

import {
  zodResolver
} from "@hookform/resolvers/zod";

import {
  useState,
  useCallback,
  useEffect
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  Package,
  MapPin,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle,
  Search,
  Clock,
  Navigation,
  AlertTriangle,
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

import {
  Input
} from "@/components/ui/input";

import {
  Button
} from "@/components/ui/button";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface ShipmentFormProps {

  mode:
    "add" | "edit";

  shipmentId?:
    number;
}

// ─────────────────────────────────────────────────────────────
// STOP TYPES
// ─────────────────────────────────────────────────────────────

const STOP_TYPES = [

  {
    value: "pickup",
    label: "Pickup",
    icon: "📦"
  },

  {
    value: "delivery",
    label: "Delivery",
    icon: "🏠"
  },

  {
    value: "waypoint",
    label: "Waypoint",
    icon: "📍"
  },

  {
    value: "depot",
    label: "Depot",
    icon: "🏭"
  },

  {
    value: "rest",
    label: "Rest Stop",
    icon: "☕"
  },

  {
    value: "fuel",
    label: "Fuel Stop",
    icon: "⛽"
  },
];

const STOP_STATUSES = [

  {
    value: "pending",
    label: "Pending"
  },

  {
    value: "en_route",
    label: "En Route"
  },

  {
    value: "arrived",
    label: "Arrived"
  },

  {
    value: "completed",
    label: "Completed"
  },

  {
    value: "skipped",
    label: "Skipped"
  },
];

// ─────────────────────────────────────────────────────────────
// ZOD SCHEMA
// ─────────────────────────────────────────────────────────────

const stopSchema = z.object({

  name:
    z.string().min(
      1,
      "Stop name is required"
    ),

  type:
    z.string().min(
      1,
      "Stop type is required"
    ),

  address:
    z.string().optional(),

  latitude:
    z.string().optional(),

  longitude:
    z.string().optional(),

  status:
    z.string(),

  eta:
    z.string().optional(),

  actual_arrival:
    z.string().optional(),

  actual_departure:
    z.string().optional(),

  duration_sec:
    z.string().optional(),

  distance_m:
    z.string().optional(),
});

const schema = z.object({

  reference:
    z.string().min(
      1,
      "Shipment reference is required"
    ),

  description:
    z.string().optional(),

  driver:
    z.string().optional(),

  vehicle:
    z.string().optional(),

  stops:
    z.array(stopSchema)
      .min(
        1,
        "Add at least one stop"
      ),
});

type FormValues =
  z.infer<typeof schema>;

type StopFormValue =
  z.infer<typeof stopSchema>;

// ─────────────────────────────────────────────────────────────
// EMPTY STOP
// ─────────────────────────────────────────────────────────────

const emptyStop = (): StopFormValue => ({

  name: "",

  type: "delivery",

  address: "",

  latitude: "",

  longitude: "",

  status: "pending",

  eta: "",

  actual_arrival: "",

  actual_departure: "",

  duration_sec: "",

  distance_m: "",
});

// ─────────────────────────────────────────────────────────────
// DATETIME FORMATTER
// ─────────────────────────────────────────────────────────────

const formatDateTimeLocal = (
  value?: string | null
) => {

  if (!value) {
    return "";
  }

  try {

    return new Date(value)
      .toISOString()
      .slice(0, 16);

  } catch {

    return "";
  }
};

// ─────────────────────────────────────────────────────────────
// GEOCODER
// ─────────────────────────────────────────────────────────────

async function geocodeAddress(
  address: string
): Promise<{
  lat: string;
  lng: string;
} | null> {

  try {

    const res =
      await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );

    const data =
      await res.json();

    if (data?.length > 0) {

      return {

        lat:
          data[0].lat,

        lng:
          data[0].lon
      };
    }

    return null;

  } catch {

    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ShipmentForm({
  mode,
  shipmentId
}: ShipmentFormProps) {

  const router =
    useRouter();

  const [saving, setSaving] =
    useState(false);

  const [loadingShipment, setLoadingShipment] =
    useState(
      mode === "edit"
    );

  const [geocodingIdx, setGeocodingIdx] =
    useState<number | null>(
      null
    );

  const form =
    useForm<FormValues>({

      resolver:
        zodResolver(schema),

      defaultValues: {

        reference: "",

        description: "",

        driver: "",

        vehicle: "",

        stops: [
          emptyStop()
        ],
      },
    });

  const {
    fields,
    append,
    remove,
    move
  } = useFieldArray({

    control:
      form.control,

    name:
      "stops",
  });

  // ─────────────────────────────────────────────────────────
  // LOAD SHIPMENT
  // ─────────────────────────────────────────────────────────

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

          if (!res.ok) {

            throw new Error(
              "Failed to fetch shipment"
            );
          }

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
                      s.latitude !== null &&
                      s.latitude !== undefined
                        ? String(s.latitude)
                        : "",

                    longitude:
                      s.longitude !== null &&
                      s.longitude !== undefined
                        ? String(s.longitude)
                        : "",

                    status:
                      s.status || "pending",

                    eta:
                      formatDateTimeLocal(
                        s.eta
                      ),

                    actual_arrival:
                      formatDateTimeLocal(
                        s.actual_arrival
                      ),

                    actual_departure:
                      formatDateTimeLocal(
                        s.actual_departure
                      ),

                    duration_sec:
                      s.duration_sec !== null &&
                      s.duration_sec !== undefined
                        ? String(s.duration_sec)
                        : "",

                    distance_m:
                      s.distance_m !== null &&
                      s.distance_m !== undefined
                        ? String(s.distance_m)
                        : ""
                  }))

                : [emptyStop()]
          });

        } catch (err) {

          console.error(err);

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

  // ─────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────

  if (loadingShipment) {

    return (

      <div className="
        flex
        items-center
        justify-center
        py-20
      ">

        <Loader2
          size={40}
          className="
            animate-spin
            text-[#5871A7]
          "
        />

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // GEOCODE
  // ─────────────────────────────────────────────────────────

  const handleGeocode =
    useCallback(

      async (
        index: number
      ) => {

        const address =
          form.getValues(
            `stops.${index}.address`
          );

        if (!address) {

          toast.error(
            "Enter an address first."
          );

          return;
        }

        setGeocodingIdx(index);

        const result =
          await geocodeAddress(address);

        setGeocodingIdx(null);

        if (result) {

          form.setValue(
            `stops.${index}.latitude`,
            result.lat
          );

          form.setValue(
            `stops.${index}.longitude`,
            result.lng
          );

          toast.success(
            "Coordinates found."
          );

        } else {

          toast.error(
            "Address not found."
          );
        }
      },

      [form]
    );

  // ─────────────────────────────────────────────────────────
  // REORDER
  // ─────────────────────────────────────────────────────────

  const moveUp =
    (i: number) => {

      if (i > 0) {
        move(i, i - 1);
      }
    };

  const moveDown =
    (i: number) => {

      if (
        i < fields.length - 1
      ) {
        move(i, i + 1);
      }
    };

  // ─────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────

  const onSubmit =
    async (
      values: FormValues
    ) => {

      try {

        setSaving(true);

        const endpoint =

          mode === "add"

            ? `${process.env.NEXT_PUBLIC_API_URL}/logistics/shipments`

            : `${process.env.NEXT_PUBLIC_API_URL}/logistics/shipments/${shipmentId}`;

        const res =
          await fetch(
            endpoint,
            {

              method:
                mode === "add"
                  ? "POST"
                  : "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  reference:
                    values.reference,

                  description:
                    values.description || null,

                  driver:
                    values.driver || null,

                  vehicle:
                    values.vehicle || null,

                  stops:
                    values.stops.map((stop, i) => ({

                      ...stop,

                      latitude:
                        stop.latitude
                          ? Number(stop.latitude)
                          : null,

                      longitude:
                        stop.longitude
                          ? Number(stop.longitude)
                          : null,

                      duration_sec:
                        stop.duration_sec
                          ? Number(stop.duration_sec)
                          : null,

                      distance_m:
                        stop.distance_m
                          ? Number(stop.distance_m)
                          : null,

                      sequence_order:
                        i + 1,
                    }))
                }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {

          throw new Error(
            data.error || "Request failed"
          );
        }

        toast.success(

          mode === "add"

            ? "Shipment created"

            : "Shipment updated"
        );

        router.push(
          "/logistics/shipments"
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err.message ||
          "Failed to save"
        );

      } finally {

        setSaving(false);
      }
    };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (

    <div className="
      lg:w-[85%]
      space-y-6
    ">

      <Form {...form}>

        <form
          onSubmit={
            form.handleSubmit(
              onSubmit
            )
          }
          className="
            space-y-6
          "
        >

          <div className="
            flex
            justify-between
            items-center
          ">

            <h1 className="
              text-2xl
              font-bold
              flex
              items-center
              gap-2
            ">

              <Package
                className="
                  text-[#5871A7]
                "
              />

              {
                mode === "add"

                  ? "New Shipment"

                  : "Edit Shipment"
              }

            </h1>

          </div>

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (

              <FormItem>

                <FormLabel>
                  Reference
                </FormLabel>

                <FormControl>

                  <Input
                    {...field}
                  />

                </FormControl>

                <FormMessage />

              </FormItem>
            )}
          />

          <div className="
            space-y-4
          ">

            {fields.map((field, index) => (

              <div
                key={field.id}
                className="
                  border
                  rounded-xl
                  p-4
                  space-y-4
                "
              >

                <div className="
                  flex
                  justify-between
                ">

                  <strong>
                    Stop {index + 1}
                  </strong>

                  <div className="
                    flex
                    gap-2
                  ">

                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                    >
                      <ChevronUp size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                    >
                      <ChevronDown size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>
                </div>

                <FormField
                  control={form.control}
                  name={`stops.${index}.name`}
                  render={({ field }) => (

                    <FormItem>

                      <FormLabel>
                        Stop Name
                      </FormLabel>

                      <FormControl>

                        <Input
                          {...field}
                        />

                      </FormControl>

                    </FormItem>
                  )}
                />

              </div>
            ))}

          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => append(emptyStop())}
          >

            <Plus
              size={16}
              className="mr-2"
            />

            Add Stop

          </Button>

          <div className="
            flex
            gap-4
          ">

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/logistics/shipments")}
            >

              <ArrowLeft
                size={16}
                className="mr-2"
              />

              Cancel

            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="
                bg-[#5871A7]
                hover:bg-[#4560A0]
                text-white
              "
            >

              {
                saving

                  ? (
                    <>
                      <Loader2
                        size={16}
                        className="
                          mr-2
                          animate-spin
                        "
                      />

                      Saving...
                    </>
                  )

                  : (
                    <>
                      <Save
                        size={16}
                        className="mr-2"
                      />

                      Save Shipment
                    </>
                  )
              }

            </Button>

          </div>

        </form>

      </Form>

    </div>
  );
}