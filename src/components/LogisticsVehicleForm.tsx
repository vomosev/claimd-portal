// components/LogisticsVehicleForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Truck,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import toast from "react-hot-toast";

// ────────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────────
interface VehicleFormProps {
  mode: "add" | "edit";
  vehicleId?: number;
}

// ────────────────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────────────────
const schema = z.object({
  driver_userid: z.string().optional(),
  vehicle_reg: z.string().min(1, "Vehicle registration is required"),
  capacity: z.string().optional(),
  status: z.string().optional(),
  name: z.string().min(1, "Vehicle name is required"),
});

type FormValues = z.infer<typeof schema>;

// ────────────────────────────────────────────────────────────────────────────────
// Confirmation
// ────────────────────────────────────────────────────────────────────────────────
function ConfirmationScreen({
  vehicleId,
  onNew,
}: {
  vehicleId: number;
  onNew: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 py-12">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Vehicle Saved
        </h2>

        <p className="text-gray-500 dark:text-gray-400">
          Vehicle record successfully created.
        </p>

        <div className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#5871A7]/10 border border-[#5871A7]/30">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
            Vehicle ID
          </p>

          <p className="text-xl font-mono font-bold text-[#5871A7]">
            VEH-{String(vehicleId).padStart(6, "0")}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/logistics/vehicles")}
        >
          View Vehicles
        </Button>

        <Button
          className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          onClick={onNew}
        >
          Add Another Vehicle
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────────
export default function LogisticsVehicleForm({
  mode,
  vehicleId,
}: VehicleFormProps) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      driver_userid: currentUsername,
      vehicle_reg: "",
      capacity: "",
      status: "active",
      name: "",
    },
  });

  // ── Set the field value when username is available ────────────────────────────
  useEffect(() => {
    if (currentUsername) {
      form.setValue("driver_userid", currentUsername);
    }
  }, [currentUsername, form]);

  // ────────────────────────────────────────────────────────────────────────────
  // Load vehicle when editing
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !vehicleId) return;

    const loadVehicle = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/logistics/vehicles/${vehicleId}`
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load vehicle");
        }

        form.reset({
          driver_userid: currentUsername || data.driver_userid?.toString() || "",
          vehicle_reg: data.vehicle_reg || "",
          capacity: data.capacity?.toString() || "",
          status: data.status || "active",
          name: data.name || "",
        });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load vehicle");
      }
    };

    loadVehicle();
  }, [mode, vehicleId, form]);

  // ────────────────────────────────────────────────────────────────────────────
  // Submit
  // ────────────────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setSaving(true);

    try {
      const endpoint =
        mode === "add"
          ? `${process.env.NEXT_PUBLIC_API_URL}/logistics/vehicles`
          : `${process.env.NEXT_PUBLIC_API_URL}/logistics/vehicles/${vehicleId}`;

      const res = await fetch(endpoint, {
        method: mode === "add" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driver_userid: currentUsername || values.driver_userid
            ? currentUsername
            : null,

          vehicle_reg: values.vehicle_reg,

          capacity: values.capacity
            ? Number(values.capacity)
            : null,

          status: values.status || "active",

          name: values.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save vehicle");
      }

      if (mode === "add") {
        setSavedId(data.vehicleId ?? data.id);
        setConfirmed(true);
        toast.success("Vehicle created successfully");
      } else {
        toast.success("Vehicle updated successfully");
        router.push("/logistics/vehicles");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Confirmation
  // ────────────────────────────────────────────────────────────────────────────
  if (confirmed && savedId) {
    return (
      <div className="lg:w-[85%]">
        <ConfirmationScreen
          vehicleId={savedId}
          onNew={() => {
            setConfirmed(false);
            setSavedId(null);

            form.reset({
              driver_userid: currentUsername || "",
              vehicle_reg: "",
              capacity: "",
              status: "active",
              name: "",
            });
          }}
        />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">

        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2.5">
            <Truck className="text-[#5871A7]" size={28} />

            {mode === "add"
              ? "New Vehicle"
              : `Edit Vehicle — VEH-${String(vehicleId).padStart(6, "0")}`
            }
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            {mode === "add"
              ? "Create a new logistics vehicle."
              : "Update vehicle information."
            }
          </p>
        </div>

        {vehicleId && (
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono">
            VEH-{String(vehicleId).padStart(6, "0")}
          </span>
        )}
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Vehicle Name */}
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Name *</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="e.g. Transit Van 1"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vehicle Reg */}
            <FormField
              name="vehicle_reg"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Registration *</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="e.g. AB12 CDE"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Driver User ID */}
            <FormField
              name="driver_userid"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver User ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={currentUsername}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-default"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Capacity */}
            <FormField
              name="capacity"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>

                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 1200"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              name="status"
              control={form.control}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Status</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="active"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

          </div>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* Actions */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">

            <Button
              type="button"
              variant="outline"
              className="md:w-[10%]"
              onClick={() => router.push("/logistics/vehicles")}
            >
              <ArrowLeft size={15} className="mr-1.5" />
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="md:w-[45%] bg-[#5871A7] hover:bg-[#4560A0] text-white"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />

                  {mode === "add"
                    ? "Creating Vehicle..."
                    : "Updating Vehicle..."
                  }
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />

                  {mode === "add"
                    ? "Create Vehicle"
                    : "Update Vehicle"
                  }
                </>
              )}
            </Button>

          </div>

        </form>
      </Form>
    </div>
  );
}