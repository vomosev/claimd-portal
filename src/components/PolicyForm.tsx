// components/PolicyForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, User, Mail, MapPin, DollarSign,
  FileText, Building, ChevronRight, CheckCircle,
  Loader2, AlertTriangle, Info, RefreshCw,
  PoundSterling,
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
import CustomTooltip from "@/components/ui/tooltip";
import toast         from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PolicyFormProps {
  mode:      "new" | "edit";
  policyId?: number | string;
}

interface PricingResult {
  base:       number;
  adjustments: number;
  total:      number;
  breakdown?: string;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  userid:        z.string().min(1,  "User ID is required"),
  productType:   z.string().min(1,  "Product type is required"),
  postcode:      z.string().min(1,  "Postcode is required").max(10),
  assetValue:    z.string()
                   .min(1, "Asset value is required")
                   .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
                     message: "Asset value must be a positive number",
                   }),
  coverageLimit: z.string().optional(),
  excess:        z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Premium preview card ───────────────────────────────────────────────────────
function PremiumPreview({
  pricing,
  loading,
}: {
  pricing:  PricingResult | null;
  loading:  boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-900/50 p-5 flex items-center gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" />
        <span className="text-sm text-gray-500">Calculating premium…</span>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="rounded-xl border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-5 text-center">
        <PoundSterling size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">
          Fill in the product type, postcode and asset value to see a premium estimate.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#5871A7]/30 bg-[#5871A7]/5 dark:bg-[#5871A7]/10 p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5871A7]">
        Premium Estimate
      </p>
      <div className="space-y-1.5">
        {pricing.base != null && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Base premium</span>
            <span>£ {Number(pricing.base).toFixed(2)}</span>
          </div>
        )}
        {pricing.adjustments != null && pricing.adjustments !== 0 && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Adjustments</span>
            <span className={pricing.adjustments > 0 ? "text-orange-500" : "text-green-500"}>
              {pricing.adjustments > 0 ? "+" : ""}£ {Number(pricing.adjustments).toFixed(2)}
            </span>
          </div>
        )}
        {pricing.breakdown && (
          <p className="text-xs text-gray-400 italic">{pricing.breakdown}</p>
        )}
      </div>
      <div className="border-t border-[#5871A7]/20 pt-3 flex justify-between items-center">
        <span className="font-bold text-gray-800 dark:text-white">Total Annual Premium</span>
        <span className="text-xl font-black text-[#5871A7]">
          £ {Number(pricing.total).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ── Confirmation screen ────────────────────────────────────────────────────────
function ConfirmationScreen({
  policyNumber,
  pricing,
  onNew,
}: {
  policyNumber: number;
  pricing:      PricingResult | null;
  onNew:        () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 py-12">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Policy Created
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          The policy has been saved and the ledger entry recorded.
        </p>
        <div className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#5871A7]/10 border border-[#5871A7]/30">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
            Policy Number
          </p>
          <p className="text-xl font-mono font-bold text-[#5871A7]">
            POL-{String(policyNumber).padStart(6, "0")}
          </p>
        </div>
        {pricing && (
          <p className="text-sm text-gray-500 pt-1">
            Annual premium: <strong>£ {Number(pricing.total).toFixed(2)}</strong>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/ins-policy")}>
          View All Policies
        </Button>
        <Button
          className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          onClick={onNew}
        >
          Add Another Policy
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PolicyForm({ mode, policyId }: PolicyFormProps) {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState("");
  const [adminStatus,     setAdminStatus]     = useState(false);
  const [accessChecked,   setAccessChecked]   = useState(false);

  // Form state
  const [saving,          setSaving]          = useState(false);
  const [loadingPolicy,   setLoadingPolicy]   = useState(mode === "edit");
  const [confirmed,       setConfirmed]       = useState(false);
  const [savedPolicyNum,  setSavedPolicyNum]  = useState<number | null>(null);

  // Premium preview
  const [pricing,         setPricing]         = useState<PricingResult | null>(null);
  const [previewLoading,  setPreviewLoading]  = useState(false);
  const [previewTimer,    setPreviewTimer]    = useState<ReturnType<typeof setTimeout>>();
  const [isGenerating, setIsGenerating] = useState(false);
  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";
  const walletUrl = process.env.NEXT_PUBLIC_WALLET_URL || apiUrl + "/images/wallet.jpg";
  const [mantlePieceItem, setMantlepiece] = useState<string | null>(null);
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userid:        "",
      productType:   "",
      postcode:      "",
      assetValue:    "",
      coverageLimit: "",
      excess:        "",
    },
  });

  const watchedValues = form.watch(["productType", "postcode", "assetValue"]);

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
    if (username) form.setValue("userid", username);
  }, [form]);

  // ── Check admin access ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
      .then((r) => r.json())
      .then((data) => {
        const isAdmin =
          String(data.role).includes("admin") ||
          String(data.role).includes("superuser");
        setAdminStatus(isAdmin);
        setAccessChecked(true);
      })
      .catch(() => {
        setAdminStatus(false);
        setAccessChecked(true);
        router.push("/dashboard/settings");
      });
  }, [currentUsername, router]);

  // ── Load existing policy (edit mode) ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !policyId || !accessChecked || !adminStatus) return;
    const fetchPolicy = async () => {
      setLoadingPolicy(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ins_policy/policy/${policyId}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        form.reset({
          userid:        data.userid        || "",
          productType:   data.productType   || "",
          postcode:      data.postcode      || "",
          assetValue:    data.asset_value?.toString() || "",
          coverageLimit: data.coverage_limit?.toString() || "",
          excess:        data.excess?.toString() || "",
        });
      } catch (err) {
        console.error("Error loading policy:", err);
        toast.error("Failed to load policy.");
        router.push("/dashboard/ins-policy");
      } finally {
        setLoadingPolicy(false);
      }
    };
    fetchPolicy();
  }, [mode, policyId, accessChecked, adminStatus, form, router]);

  // ── Debounced premium preview ─────────────────────────────────────────────────
  useEffect(() => {
    const [productType, postcode, assetValue] = watchedValues;
    if (!productType || !postcode || !assetValue || Number(assetValue) <= 0) {
      setPricing(null);
      return;
    }

    clearTimeout(previewTimer);
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ins_policy/preview-premium`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ productType, postcode, assetValue }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPricing(data.pricing ?? data);
      } catch (err) {
        console.error("Premium preview error:", err);
        setPricing(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 700);
    setPreviewTimer(t);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.join(",")]);

  const handleGeneratePass = async (userid: string, policy_id: string) => {
    try {
      setIsGeneratingPass(true);
      toast.success(`Generating card and sending to ${currentUsername}`);
      const formData = {
        userName: currentUsername,
        eventName: `${policy_id}`,
        userid: currentUsername,
        policy_id: policy_id,
        eventDate: new Date().toISOString().split('T')[0]
      };

      const response = await fetch(`${apiUrl}/ins_wallet/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('JSON response:', data);
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wallet-pass.pkpass';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('Pass downloaded successfully');
          toast.success(`Card generated and sent to ${currentUsername}`);
        }
      } else {
        toast.success('Could not generate card.');
        console.error('Failed to generate pass');
      }
    } catch (error) {
      console.error('Error generating pass:', error);
      toast.error('Error generating pass');
    } finally {
      setIsGeneratingPass(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const endpoint =
        mode === "new"
          ? `${process.env.NEXT_PUBLIC_API_URL}/ins_policy/create-policy`
          : `${process.env.NEXT_PUBLIC_API_URL}/ins_policy/update-policy/${policyId}`;

      const res = await fetch(endpoint, {
        method:  mode === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userid:        values.userid,
          productType:   values.productType,
          postcode:      values.postcode.toUpperCase().trim(),
          assetValue:    Number(values.assetValue),
          coverageLimit: values.coverageLimit ? Number(values.coverageLimit) : undefined,
          excess:        values.excess        ? Number(values.excess)        : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (mode === "new") {
        setSavedPolicyNum(data.policyNumber);
        setPricing(data.pricing ?? pricing);
        setConfirmed(true);
        toast.success("Policy created successfully!");
      } else {
        toast.success("Policy updated successfully!");
        router.push("/dashboard/ins-policy");
      }
    } catch (err: any) {
      console.error("Policy submit error:", err);
      toast.error("Failed to save policy: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ── Confirmation screen ────────────────────────────────────────────────────────
  if (confirmed && savedPolicyNum) {
    return (
      <div className="lg:w-[85%]">
        <ConfirmationScreen
          policyNumber={savedPolicyNum}
          pricing={pricing}
          onNew={() => {
            setConfirmed(false);
            setSavedPolicyNum(null);
            setPricing(null);
            form.reset();
          }}
        />
      </div>
    );
  }

  // ── Render guards ──────────────────────────────────────────────────────────────
  if (!accessChecked || loadingPolicy) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">
            {!accessChecked ? "Checking permissions…" : "Loading policy…"}
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold flex items-center gap-2.5">
            <Shield className="text-[#5871A7]" size={28} />
            {mode === "new" ? "New Policy" : `Edit Policy — POL-${String(policyId).padStart(6, "0")}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "new"
              ? "Enter the policy details below. The premium will be calculated automatically."
              : "Update the policy details below."
            }
          </p>
        </div>
        {policyId && (
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono">
            POL-{String(policyId).padStart(6, "0")}
          </span>
        )}
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── Two-column layout: form left, premium preview right ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left: form fields ──────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-8">

              {/* ── Section 1: Policyholder ─────────────────────────────── */}
              <section className="space-y-5">
                <h2 className="text-xl font-semibold flex items-center gap-2.5">
                  <User className="text-[#5871A7]" size={20} />
                  Policyholder
                </h2>

                <FormField name="userid" control={form.control} render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>User ID *</FormLabel>
                      <CustomTooltip content="The email address or username of the policyholder." />
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                        <Input className="pl-9" placeholder="user@example.com" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </section>

              <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

              {/* ── Section 2: Product ──────────────────────────────────── */}
              <section className="space-y-5">
                <h2 className="text-xl font-semibold flex items-center gap-2.5">
                  <FileText className="text-[#5871A7]" size={20} />
                  Product Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <FormField name="productType" control={form.control} render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <div className="flex items-center gap-2">
                        <FormLabel>Product Type *</FormLabel>
                        <CustomTooltip content="The type of insurance product being issued." />
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="motor_comprehensive">
                            <div className="flex flex-col">
                              <span className="font-medium">Motor — Comprehensive</span>
                              <span className="text-xs text-gray-500">Full cover including own-damage</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="motor_tpft">
                            <div className="flex flex-col">
                              <span className="font-medium">Motor — Third Party Fire & Theft</span>
                              <span className="text-xs text-gray-500">Fire, theft and third-party liability</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="motor_tpo">
                            <div className="flex flex-col">
                              <span className="font-medium">Motor — Third Party Only</span>
                              <span className="text-xs text-gray-500">Minimum legal cover</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="home_buildings">
                            <div className="flex flex-col">
                              <span className="font-medium">Home — Buildings</span>
                              <span className="text-xs text-gray-500">Structure and permanent fixtures</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="home_contents">
                            <div className="flex flex-col">
                              <span className="font-medium">Home — Contents</span>
                              <span className="text-xs text-gray-500">Personal possessions inside the home</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="home_combined">
                            <div className="flex flex-col">
                              <span className="font-medium">Home — Combined Buildings & Contents</span>
                              <span className="text-xs text-gray-500">Full home protection</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="travel_single">
                            <div className="flex flex-col">
                              <span className="font-medium">Travel — Single Trip</span>
                              <span className="text-xs text-gray-500">One-off journey cover</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="travel_annual">
                            <div className="flex flex-col">
                              <span className="font-medium">Travel — Annual Multi-Trip</span>
                              <span className="text-xs text-gray-500">Unlimited trips within 12 months</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="gadget">
                            <div className="flex flex-col">
                              <span className="font-medium">Gadget Insurance</span>
                              <span className="text-xs text-gray-500">Mobile phones, laptops and electronics</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="pet">
                            <div className="flex flex-col">
                              <span className="font-medium">Pet Insurance</span>
                              <span className="text-xs text-gray-500">Veterinary and liability cover</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField name="postcode" control={form.control} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Postcode *</FormLabel>
                        <CustomTooltip content="Risk postcode — used to calculate the premium." />
                      </div>
                      <FormControl>
                        <div className="relative">
                          <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                          <Input
                            className="pl-9 uppercase font-mono tracking-widest"
                            placeholder="SW1A 1AA"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField name="assetValue" control={form.control} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Asset Value (£) *</FormLabel>
                        <CustomTooltip content="The declared value of the insured asset — e.g. vehicle value or property rebuild cost." />
                      </div>
                      <FormControl>
                        <div className="relative">
                          <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                          <Input
                            className="pl-9"
                            type="number"
                            min="1"
                            placeholder="e.g. 15000"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </div>
              </section>

              <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

              {/* ── Section 3: Cover terms ──────────────────────────────── */}
              <section className="space-y-5">
                <h2 className="text-xl font-semibold flex items-center gap-2.5">
                  <Building className="text-[#5871A7]" size={20} />
                  Cover Terms
                  <span className="text-sm font-normal text-gray-400">(optional — defaults used if blank)</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <FormField name="coverageLimit" control={form.control} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Coverage Limit (£)</FormLabel>
                        <CustomTooltip content={`Maximum payout per claim. Defaults to £${
                          Number(process.env.NEXT_PUBLIC_DEFAULT_COVERAGE_LIMIT || 10000).toLocaleString()
                        } if left blank.`} />
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                          <Input
                            className="pl-9"
                            type="number"
                            min="1"
                            placeholder={`Default: £${Number(
                              process.env.NEXT_PUBLIC_DEFAULT_COVERAGE_LIMIT || 10000
                            ).toLocaleString()}`}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField name="excess" control={form.control} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Excess (£)</FormLabel>
                        <CustomTooltip content={`The amount the policyholder pays first on any claim. Defaults to £${
                          Number(process.env.NEXT_PUBLIC_DEFAULT_EXCESS || 250).toLocaleString()
                        } if left blank.`} />
                      </div>
                      <FormControl>
                        <div className="relative">
                          <AlertTriangle size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                          <Input
                            className="pl-9"
                            type="number"
                            min="0"
                            placeholder={`Default: £${Number(
                              process.env.NEXT_PUBLIC_DEFAULT_EXCESS || 250
                            ).toLocaleString()}`}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </div>

                {/* Default info banner */}
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                  <Info size={15} className="flex-shrink-0 mt-0.5" />
                  <p>
                    If coverage limit or excess are left blank, the system defaults
                    will be applied:{" "}
                    <strong>
                      £{Number(process.env.NEXT_PUBLIC_DEFAULT_COVERAGE_LIMIT || 10000).toLocaleString()} limit
                    </strong>
                    {" "}and{" "}
                    <strong>
                      £{Number(process.env.NEXT_PUBLIC_DEFAULT_EXCESS || 250).toLocaleString()} excess
                    </strong>.
                  </p>
                </div>
              </section>

            </div>

            {/* ── Right: premium preview ──────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                <DollarSign size={14} />
                Premium Preview
              </h3>

              <PremiumPreview pricing={pricing} loading={previewLoading} />

              {pricing && (
                <p className="text-xs text-gray-400 text-center">
                  This is an estimate. The final premium is calculated on submission.
                </p>
              )}

              {/* Ledger note */}
              <div className="rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2 text-xs text-gray-500">
                <p className="font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <FileText size={13} /> What happens on submission
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>A claims advisor is assigned to the policy</li>
                  <li>They will contact you to discuss the policy details</li>
                  <li>Take note of the policy number for future reference</li>
                </ul>
              </div>
            </div>

          </div>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="md:w-[10%] order-1 md:order-none"
              onClick={() => router.push("/dashboard/ins-policy")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="md:w-[40%] bg-[#5871A7] hover:bg-[#4560A0] text-white"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {mode === "new" ? "Creating Policy…" : "Updating Policy…"}
                </>
              ) : (
                <>
                  <ChevronRight size={16} className="mr-2" />
                  {mode === "new" ? "Create Policy" : "Update Policy"}
                </>
              )}
            </Button>
          </div>

          {mode === "edit" && (
            <div className="flex flex-col md:flex-row md:justify-end gap-4">
              <Button
                    onClick={() => handleGeneratePass(`${currentUsername}`, `${policyId}`)}
                    className="md:w-[40%] bg-[#5871A7] hover:bg-[#4560A0] text-white"
                    disabled={isGeneratingPass}
                    // className={`rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white`}
                  >
                  <span className="flex items-center justify-center gap-2">
                  {/* Loading overlay */}
                  {isGeneratingPass && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
                        <br></br>
                        <br></br>
                        <h2>Generating your wallet pass...</h2>
                        <h2>Sending a copy by email</h2>
                      </div>
                    </div>
                  )}
                  {!isGenerating && (
                    <img 
                      src={apiUrl + "/images/Add_to_Apple_Wallet_badge.svg.png"}
                      alt="Apple" 
                      style={{ height: '24px', verticalAlign: 'middle' }}
                      className="inline-block"
                    />
                  )}
                  <span>
                    {/* update the button text */}
                    {isGenerating ? "Downloading Policy" : "Download Policy"}
                  </span>
                </span>
              </Button>
            </div>
          )}

        </form>
      </Form>
    </div>
  );
}