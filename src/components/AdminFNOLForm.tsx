// components/FNOLForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car, User, MapPin, FileText, Phone, Mail,
  Calendar, Clock, Camera, AlertTriangle,
  CheckCircle, Loader2, Shield,
  Building, ChevronRight, Info,
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
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox }   from "@/components/ui/checkbox";
import CustomTooltip  from "@/components/ui/tooltip";
import toast          from "react-hot-toast";
import axios          from "axios";
import moment         from "moment";

// ── Which incident types involve a vehicle ────────────────────────────────────
const VEHICLE_INCIDENT_TYPES = new Set([
  "collision",
  "theft",
  "vandalism",
  "fire",
  "flood",
  "animal",
  "windscreen",
  "hit_and_run",
]);

// ── Types ──────────────────────────────────────────────────────────────────────
interface FNOLFormProps {
  mode:     "new" | "edit";
  claimId?: string;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({

  // Policyholder
  policyNumber:               z.string().min(1,  "Policy number is required"),
  policyholderName:           z.string().min(2,  "Full name is required"),
  policyholderEmail:          z.string().email(  "Valid email is required"),
  policyholderPhone:          z.string().min(7,  "Phone number is required"),
  policyholderDOB:            z.string().optional(),

  // Incident
  incidentDate:               z.string().min(1,  "Incident date is required"),
  incidentTime:               z.string().optional(),
  incidentType:               z.string().min(1,  "Incident type is required"),
  incidentDescription:        z.string()
                                .min(10, "Please provide more detail (min 10 characters)")
                                .max(2000),

  // Location
  incidentAddress:            z.string().optional(),
  incidentLatitude:           z.string().optional(),
  incidentLongitude:          z.string().optional(),
  incidentCountry:            z.string().optional(),

  // Vehicle — all optional; visibility controlled by incidentType
  vehicleRegistration:        z.string().optional(),
  vehicleMake:                z.string().optional(),
  vehicleModel:               z.string().optional(),
  vehicleYear:                z.string().optional(),
  vehicleColour:              z.string().optional(),
  vehicleDriveable:           z.string().optional(),

  // Third party
  thirdPartyInvolved:         z.boolean(),
  thirdPartyName:             z.string().optional(),
  thirdPartyPhone:            z.string().optional(),
  thirdPartyVehicleReg:       z.string().optional(),
  thirdPartyInsurer:          z.string().optional(),
  thirdPartyPolicyNumber:     z.string().optional(),

  // Injuries
  injuriesReported:           z.boolean(),
  injuryDescription:          z.string().optional(),
  emergencyServicesAttended:  z.boolean(),
  policeReportNumber:         z.string().optional(),

  // Witnesses
  witnessName:                z.string().optional(),
  witnessPhone:               z.string().optional(),

  // Loss
  estimatedDamage:            z.string().optional(),
  currency:                   z.string().optional(),

  // Declaration
  declarationAccepted:        z.boolean(),

}).superRefine((data, ctx) => {
  if (data.incidentDate && moment(data.incidentDate).isAfter(moment(), "day")) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: "Incident date cannot be in the future",
      path:    ["incidentDate"],
    });
  }
  if (!data.declarationAccepted) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: "You must accept the declaration to submit",
      path:    ["declarationAccepted"],
    });
  }
});

type FormValues = z.infer<typeof schema>;

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Policyholder", icon: User          },
  { id: 2, label: "Incident",     icon: AlertTriangle },
  { id: 3, label: "Vehicle",      icon: Car           },
  { id: 4, label: "Third Party",  icon: Shield        },
  { id: 5, label: "Injuries",     icon: FileText      },
  { id: 6, label: "Declaration",  icon: CheckCircle   },
];

function StepIndicator({
  current,
  vehicleApplicable,
}: {
  current:           number;
  vehicleApplicable: boolean;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const Icon        = step.icon;
        const isActive    = step.id === current;
        const isComplete  = step.id < current;
        const isVehicle   = step.id === 3;
        const isSkipped   = isVehicle && !vehicleApplicable;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                transition-all duration-200 flex-shrink-0
                ${isSkipped
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 opacity-50"
                  : isComplete
                  ? "bg-green-500 text-white"
                  : isActive
                  ? "bg-[#5871A7] text-white ring-4 ring-[#5871A7]/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                }
              `}>
                {!isSkipped && isComplete ? <CheckCircle size={16} /> : <Icon size={15} />}
              </div>
              <span className={`
                text-[9px] font-semibold uppercase tracking-wide text-center leading-tight
                ${isSkipped   ? "text-gray-300 dark:text-gray-600"
                  : isActive  ? "text-[#5871A7]"
                  : isComplete ? "text-green-500"
                  : "text-gray-400"
                }
              `}>
                {step.label}
                {isSkipped && (
                  <span className="block text-[8px] normal-case font-normal">
                    N/A
                  </span>
                )}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`
                w-8 h-0.5 mb-4 mx-0.5 flex-shrink-0 transition-colors duration-200
                ${isComplete ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
  disabled,
  disabledReason,
}: {
  icon:            React.ElementType;
  title:           string;
  description?:    string;
  children:        React.ReactNode;
  disabled?:       boolean;
  disabledReason?: string;
}) {
  return (
    <section className={`space-y-6 ${disabled ? "opacity-50 pointer-events-none select-none" : ""}`}>
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2.5">
          <Icon className={disabled ? "text-gray-400" : "text-[#5871A7]"} size={22} />
          {title}
          {disabled && (
            <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full ml-1">
              Not applicable
            </span>
          )}
        </h2>
        {disabled && disabledReason ? (
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
            <Info size={13} />
            {disabledReason}
          </p>
        ) : description ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        ) : null}
      </div>
      {!disabled && children}
      {disabled && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <Car size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">
            Vehicle details are only required for vehicle-related incidents.
          </p>
        </div>
      )}
    </section>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function FNOLForm({ mode, claimId }: FNOLFormProps) {
  const router = useRouter();

  const [saving,          setSaving]          = useState(false);
  const [currentStep,     setCurrentStep]     = useState(1);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [findingAddress,  setFindingAddress]  = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedPhotos,  setUploadedPhotos]  = useState<string[]>([]);
  const [claimReference,  setClaimReference]  = useState<string | null>(null);
  const [submitted,       setSubmitted]       = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      policyNumber:               "",
      policyholderName:           "",
      policyholderEmail:          "",
      policyholderPhone:          "",
      policyholderDOB:            "",
      incidentDate:               moment().format("YYYY-MM-DD"),
      incidentTime:               "",
      incidentType:               "",
      incidentDescription:        "",
      incidentAddress:            "",
      incidentLatitude:           "",
      incidentLongitude:          "",
      incidentCountry:            "",
      vehicleRegistration:        "",
      vehicleMake:                "",
      vehicleModel:               "",
      vehicleYear:                "",
      vehicleColour:              "",
      vehicleDriveable:           "",
      thirdPartyInvolved:         false,
      thirdPartyName:             "",
      thirdPartyPhone:            "",
      thirdPartyVehicleReg:       "",
      thirdPartyInsurer:          "",
      thirdPartyPolicyNumber:     "",
      injuriesReported:           false,
      injuryDescription:          "",
      emergencyServicesAttended:  false,
      policeReportNumber:         "",
      witnessName:                "",
      witnessPhone:               "",
      estimatedDamage:            "",
      currency:                   "GBP",
      declarationAccepted:        false,
    },
  });

  const incidentType       = form.watch("incidentType");
  const thirdPartyInvolved = form.watch("thirdPartyInvolved");
  const injuriesReported   = form.watch("injuriesReported");
  const emergencyAttended  = form.watch("emergencyServicesAttended");

  // ── Derived: does this incident type involve a vehicle? ───────────────────
  const vehicleApplicable = VEHICLE_INCIDENT_TYPES.has(incidentType);

  // ── Clear vehicle fields when incident type changes to non-vehicle ────────
  useEffect(() => {
    if (incidentType && !vehicleApplicable) {
      form.setValue("vehicleRegistration", "");
      form.setValue("vehicleMake",         "");
      form.setValue("vehicleModel",        "");
      form.setValue("vehicleYear",         "");
      form.setValue("vehicleColour",       "");
      form.setValue("vehicleDriveable",    "");
    }
  }, [incidentType, vehicleApplicable, form]);

  // ── Edit mode: load existing claim ────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !claimId) return;

    const fetchClaim = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ins_fnol/${claimId}`
        );
        if (!res.ok) {
          toast.error("Claim not found.");
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        const c    = data.claim || data;

        form.reset({
          policyNumber:               c.policy_number             || "",
          policyholderName:           c.policyholder_name         || "",
          policyholderEmail:          c.userid                    || "",
          policyholderPhone:          c.policyholder_phone        || "",
          policyholderDOB:            c.policyholder_dob
                                      ? moment(c.policyholder_dob).format("YYYY-MM-DD")
                                      : "",
          incidentDate:               c.incident_date
                                      ? moment(c.incident_date).format("YYYY-MM-DD")
                                      : "",
          incidentTime:               c.incident_time             || "",
          incidentType:               c.incident_type             || "",
          incidentDescription:        c.incident_description      || "",
          incidentAddress:            c.incident_address          || "",
          incidentLatitude:           c.incident_latitude         ? String(c.incident_latitude)  : "",
          incidentLongitude:          c.incident_longitude        ? String(c.incident_longitude) : "",
          incidentCountry:            c.incident_country          || "",
          vehicleRegistration:        c.vehicle_registration      || "",
          vehicleMake:                c.vehicle_make              || "",
          vehicleModel:               c.vehicle_model             || "",
          vehicleYear:                c.vehicle_year              ? String(c.vehicle_year) : "",
          vehicleColour:              c.vehicle_colour            || "",
          vehicleDriveable:           c.vehicle_driveable         || "",
          thirdPartyInvolved:         Number(c.third_party_involved)          === 1,
          thirdPartyName:             c.third_party_name          || "",
          thirdPartyPhone:            c.third_party_phone         || "",
          thirdPartyVehicleReg:       c.third_party_vehicle_reg   || "",
          thirdPartyInsurer:          c.third_party_insurer       || "",
          thirdPartyPolicyNumber:     c.third_party_policy_number || "",
          injuriesReported:           Number(c.injuries_reported)             === 1,
          injuryDescription:          c.injury_description        || "",
          emergencyServicesAttended:  Number(c.emergency_services_attended)   === 1,
          policeReportNumber:         c.police_report_number      || "",
          witnessName:                c.witness_name              || "",
          witnessPhone:               c.witness_phone             || "",
          estimatedDamage:            c.estimated_damage          ? String(c.estimated_damage) : "",
          currency:                   c.currency                  || "GBP",
          declarationAccepted:        Number(c.declaration_accepted)          === 1,
        });

        if (Array.isArray(c.photos)) {
          setUploadedPhotos(c.photos.map((p: any) => p.filename || p));
        }
      } catch (err) {
        console.error("Error loading claim:", err);
        toast.error("Failed to load claim data.");
      }
    };

    fetchClaim();
  }, [mode, claimId, form, router]);

  // ── GPS location ──────────────────────────────────────────────────────────
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        form.setValue("incidentLatitude",  latitude.toString(),  { shouldDirty: true });
        form.setValue("incidentLongitude", longitude.toString(), { shouldDirty: true });
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data.display_name) {
            form.setValue("incidentAddress", data.display_name,          { shouldDirty: true });
            form.setValue("incidentCountry", data.address?.country || "", { shouldDirty: true });
          }
          toast.success("Location captured.");
        } catch {
          toast.error("Could not reverse-geocode the location.");
        }
        setGettingLocation(false);
      },
      () => {
        toast.error("Location permission denied or unavailable.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Address lookup ────────────────────────────────────────────────────────
  const handleFindAddress = async () => {
    const address = form.getValues("incidentAddress");
    if (!address) { toast.error("Enter an address or postcode first."); return; }
    setFindingAddress(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await res.json();
      if (data?.length > 0) {
        const { lat, lon, display_name } = data[0];
        form.setValue("incidentLatitude",  lat.toString(), { shouldDirty: true });
        form.setValue("incidentLongitude", lon.toString(), { shouldDirty: true });
        form.setValue("incidentAddress",   display_name,   { shouldDirty: true });
        toast.success("Address resolved.");
      } else {
        toast.error("Address not found.");
      }
    } catch {
      toast.error("Error resolving address.");
    } finally {
      setFindingAddress(false);
    }
  };

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (files: FileList) => {
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("photos", f));
      if (claimId) fd.append("claimId", claimId);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/ins_fnol/upload-photos`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.success) {
        setUploadedPhotos((prev) => [...prev, ...(res.data.filenames || [])]);
        toast.success(`${files.length} photo${files.length !== 1 ? "s" : ""} uploaded.`);
      } else {
        toast.error(res.data.message || "Photo upload failed.");
      }
    } catch {
      toast.error("Error uploading photos.");
    } finally {
      setUploadingPhotos(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        photos:      uploadedPhotos,
        submittedAt: new Date().toISOString(),
        claimId:     claimId || undefined,
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ins_fnol/${
          mode === "new" ? "submit" : `update/${claimId}`
        }`,
        {
          method:  mode === "new" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setClaimReference(data.claimReference || data.id || "Claim-" + Date.now());
      setSubmitted(true);
      toast.success("Claim submitted successfully!");
    } catch (err: any) {
      console.error("Claim submit error:", err);
      toast.error("Failed to submit: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (submitted && claimReference) {
    return (
      <div className="lg:w-[85%] flex flex-col items-center justify-center min-h-[400px] space-y-6 py-12">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Claim Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Your claim has been received and is being reviewed.
          </p>
          <div className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#5871A7]/10 border border-[#5871A7]/30">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
              Claim Reference
            </p>
            <p className="text-xl font-mono font-bold text-[#5871A7]">{claimReference}</p>
          </div>
          <p className="text-sm text-gray-400 pt-2">
            Please quote this reference in all correspondence.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
          <Button
            className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
            onClick={() => window.print()}
          >
            Print Confirmation
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold">
            {mode === "new"
              ? "New Claim"
              : `Edit Claim — ${claimId}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete all sections and submit to register your claim.
          </p>
        </div>
        {claimId && (
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono">
            {claimId}
          </span>
        )}
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <StepIndicator current={currentStep} vehicleApplicable={vehicleApplicable} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── STEP 1: POLICYHOLDER ───────────────────────────────────── */}
          <Section icon={User} title="Policyholder Details"
            description="The person named on the insurance policy.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField name="policyNumber" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Policy Number *</FormLabel>
                    <CustomTooltip content="Found on your insurance documents or renewal notice." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="pl-9" placeholder="e.g. POL-123456789" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="policyholderName" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="pl-9" placeholder="First and last name" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="policyholderEmail" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="pl-9" type="email" placeholder="your@email.com" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="policyholderPhone" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="pl-9" type="tel" placeholder="+44 7700 900000" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="policyholderDOB" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" className="dark:[color-scheme:dark]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </div>
          </Section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── STEP 2: INCIDENT ───────────────────────────────────────── */}
          <Section icon={AlertTriangle} title="Incident Details"
            description="Tell us what happened, when and where.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField name="incidentDate" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Incident *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                      <Input className="pl-9 dark:[color-scheme:dark]" type="date" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="incidentTime" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Time of Incident (if known)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                      <Input className="pl-9 dark:[color-scheme:dark]" type="time" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="incidentType" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Type of Incident *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Vehicle-related incidents */}
                      <SelectItem value="collision">🚗 Collision / Road Traffic Accident</SelectItem>
                      <SelectItem value="theft">🚗 Theft / Attempted Theft</SelectItem>
                      <SelectItem value="vandalism">🚗 Vandalism / Malicious Damage</SelectItem>
                      <SelectItem value="fire">🚗 Fire</SelectItem>
                      <SelectItem value="flood">🚗 Flood / Storm Damage</SelectItem>
                      <SelectItem value="animal">🚗 Animal Strike</SelectItem>
                      <SelectItem value="windscreen">🚗 Windscreen / Glass Damage</SelectItem>
                      <SelectItem value="hit_and_run">🚗 Hit and Run</SelectItem>
                      {/* Non-vehicle incidents */}
                      <SelectItem value="personal_injury">Personal Injury</SelectItem>
                      <SelectItem value="property_damage">Property Damage</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Hint showing whether vehicle details will be required */}
                  {field.value && (
                    <p className={`
                      text-xs mt-1.5 flex items-center gap-1.5
                      ${vehicleApplicable
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400"
                      }
                    `}>
                      <Info size={12} />
                      {vehicleApplicable
                        ? "Vehicle details will be required for this incident type."
                        : "Vehicle details are not required for this incident type."
                      }
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="incidentAddress" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <FormLabel>Incident Location</FormLabel>
                    <CustomTooltip content="Enter the address where the incident occurred, or use your current location." />
                  </div>
                  <FormControl>
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                        <Input className="pl-9" placeholder="Address or postcode of incident" {...field} />
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" className="bg-[#5871A7] h-10 flex-1"
                          onClick={handleFindAddress} disabled={findingAddress}>
                          {findingAddress
                            ? <><Loader2 size={14} className="mr-2 animate-spin" />Finding…</>
                            : "Find Address"
                          }
                        </Button>
                        <Button type="button" variant="outline" className="h-10 flex-1"
                          onClick={handleGetLocation} disabled={gettingLocation}>
                          {gettingLocation
                            ? <><Loader2 size={14} className="mr-2 animate-spin" />Getting…</>
                            : "Use My Location"
                          }
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="incidentLatitude" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude (auto-filled)</FormLabel>
                  <FormControl>
                    <Input placeholder="—" {...field} readOnly
                      className="bg-gray-50 dark:bg-gray-900 text-gray-500" />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="incidentLongitude" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude (auto-filled)</FormLabel>
                  <FormControl>
                    <Input placeholder="—" {...field} readOnly
                      className="bg-gray-50 dark:bg-gray-900 text-gray-500" />
                  </FormControl>
                </FormItem>
              )} />

            </div>

            <FormField name="incidentDescription" control={form.control} render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Description of Incident *</FormLabel>
                  <CustomTooltip content="Describe exactly what happened in as much detail as possible." />
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Describe what happened, the sequence of events, road/weather conditions, speed, direction of travel, what was damaged, and any other relevant details…"
                    className="min-h-[140px] resize-y"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center mt-1">
                  <FormMessage />
                  <span className={`text-xs ${(field.value?.length || 0) > 1800 ? "text-orange-500" : "text-gray-400"}`}>
                    {field.value?.length || 0} / 2000
                  </span>
                </div>
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField name="estimatedDamage" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <FormLabel>Estimated Damage Value (optional)</FormLabel>
                    <CustomTooltip content="Your best estimate — a surveyor will assess the actual amount." />
                  </div>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 2500" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField name="currency" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="GBP">GBP £</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Scene / Damage Photos (optional)</p>
                <CustomTooltip content="Upload photos of damage or the scene. Max 10MB per file." />
              </div>
              <div className="relative">
                <Input
                  type="file" accept="image/*" multiple
                  onChange={(e) => { if (e.target.files) handlePhotoUpload(e.target.files); }}
                  disabled={uploadingPhotos}
                />
                {uploadingPhotos
                  ? <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" />
                    </div>
                  : <Camera size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                }
              </div>
              {uploadedPhotos.length > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? "s" : ""} uploaded
                </p>
              )}
            </div>
          </Section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── STEP 3: VEHICLE ────────────────────────────────────────── */}
          {/* ── Disabled + greyed out when incidentType is not vehicle-related ── */}
          <Section
            icon={Car}
            title="Vehicle Details"
            description="Your vehicle involved in the incident."
            disabled={!vehicleApplicable}
            disabledReason={
              incidentType
                ? `Vehicle details are not required for "${incidentType.replace(/_/g, " ")}" incidents.`
                : "Select an incident type above to determine whether vehicle details are needed."
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField name="vehicleRegistration" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Registration Number</FormLabel>
                    <CustomTooltip content="Your vehicle's number plate — e.g. AB12 CDE" />
                  </div>
                  <FormControl>
                    <Input
                      placeholder="AB12 CDE"
                      className="uppercase font-mono tracking-widest"
                      disabled={!vehicleApplicable}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="vehicleDriveable" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Is the Vehicle Driveable?</FormLabel>
                    <CustomTooltip content="If not driveable, recovery and storage may be arranged." />
                  </div>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!vehicleApplicable}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Yes — driveable</SelectItem>
                      <SelectItem value="no">No — not driveable</SelectItem>
                      <SelectItem value="unknown">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField name="vehicleMake" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ford" disabled={!vehicleApplicable} {...field} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="vehicleModel" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Focus" disabled={!vehicleApplicable} {...field} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="vehicleYear" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 2019"
                      min="1900"
                      max={new Date().getFullYear()}
                      disabled={!vehicleApplicable}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="vehicleColour" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Colour</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Silver" disabled={!vehicleApplicable} {...field} />
                  </FormControl>
                </FormItem>
              )} />

            </div>
          </Section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── STEP 4: THIRD PARTY & WITNESSES ───────────────────────── */}
          <Section icon={Shield} title="Third Party & Witnesses"
            description="Details of any other parties or witnesses involved.">

            <FormField name="thirdPartyInvolved" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Another party was involved</FormLabel>
                  <FormDescription>
                    Check this if another vehicle, person or property was involved.
                  </FormDescription>
                </div>
              </FormItem>
            )} />

            {thirdPartyInvolved && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-[#5871A7]/30">

                <FormField name="thirdPartyName" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Third Party Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                        <Input className="pl-9" placeholder="Full name" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />

                <FormField name="thirdPartyPhone" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Third Party Phone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                        <Input className="pl-9" type="tel" placeholder="+44 7700 900000" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />

                <FormField name="thirdPartyVehicleReg" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Third Party Vehicle Registration</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="AB12 CDE"
                        className="uppercase font-mono tracking-widest"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField name="thirdPartyInsurer" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Third Party Insurer (if known)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                        <Input className="pl-9" placeholder="Insurer name" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />

                <FormField name="thirdPartyPolicyNumber" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Third Party Policy Number (if known)</FormLabel>
                    <FormControl><Input placeholder="Policy number" {...field} /></FormControl>
                  </FormItem>
                )} />

              </div>
            )}

            <hr className="border-dashed border-[#D4D8EA] dark:border-[#2E4066]" />

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Witness Details (if any)
              </h3>
              <p className="text-xs text-gray-500">Witness statements can be crucial to your claim.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="witnessName" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Witness Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="pl-9" placeholder="Full name" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
              <FormField name="witnessPhone" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Witness Phone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="pl-9" type="tel" placeholder="+44 7700 900000" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </Section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── STEP 5: INJURIES & EMERGENCY SERVICES ─────────────────── */}
          <Section icon={FileText} title="Injuries & Emergency Services"
            description="Report any personal injuries and whether emergency services attended.">

            <FormField name="injuriesReported" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Injuries were sustained</FormLabel>
                  <FormDescription>
                    Check this if you, a passenger, or any other person was injured.
                  </FormDescription>
                </div>
              </FormItem>
            )} />

            {injuriesReported && (
              <FormField name="injuryDescription" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe the Injuries</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Who was injured, what injuries were sustained, and whether medical treatment was received…"
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField name="emergencyServicesAttended" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Emergency services attended</FormLabel>
                  <FormDescription>
                    Police, ambulance or fire service attended the scene.
                  </FormDescription>
                </div>
              </FormItem>
            )} />

            {emergencyAttended && (
              <FormField name="policeReportNumber" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Police Report / CRIME Reference Number</FormLabel>
                    <CustomTooltip content="Provided by the attending officer." />
                  </div>
                  <FormControl>
                    <Input placeholder="e.g. 01/12345/24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </Section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── STEP 6: DECLARATION ────────────────────────────────────── */}
          <Section icon={CheckCircle} title="Declaration"
            description="Please read and accept the declaration before submitting.">

            <div className="rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-900/50 p-5 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="font-semibold text-gray-800 dark:text-white">Declaration of Truth</p>
              <p>
                I declare that the information I have provided on this form is true
                and complete to the best of my knowledge and belief. I understand
                that it is an offence to make a fraudulent insurance claim and that
                doing so could result in prosecution and the voiding of my policy.
              </p>
              <p>
                I consent to my personal data being processed by the insurer and
                its authorised agents for the purpose of assessing and managing
                this claim, in accordance with the insurer's privacy policy.
              </p>
              <p className="text-xs text-gray-400">
                By submitting this form you agree to the above declaration.
              </p>
            </div>

            <FormField name="declarationAccepted" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I confirm the information provided is accurate and I accept the declaration *
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )} />

          </Section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="md:w-[10%] order-1 md:order-none"
              onClick={() => router.back()}
            >
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
                  {mode === "new" ? "Submitting Claim…" : "Updating Claim…"}
                </>
              ) : (
                <>
                  <ChevronRight size={16} className="mr-2" />
                  {mode === "new" ? "Submit Claim" : "Update Claim"}
                </>
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}