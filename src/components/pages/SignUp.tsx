"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import Link from "next/link";
import LanguageSelector from "../shared/LanguageSelector";
import PinVerification from "./PinVerification";
import {
  setPaygNewCookie,
  setUsernameCookie,
  getSessionInfo,
} from "@/utils/cookieUtils";

const API_URL  = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";
const WORLD_ID = process.env.NEXT_PUBLIC_WORLDID || "0";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Shape of one entry in worldsettings.jsoncolumns */
interface DynamicFieldDef {
  key:          string;        // used as the JSON key in userdata.jsoncolumns
  label:        string;        // shown as the field label
  type?:        string;        // text | email | number | tel | select | textarea (default: text)
  placeholder?: string;
  required?:    boolean;
  options?:     string[];      // for type === "select"
}

// ── Dynamic field renderer ─────────────────────────────────────────────────────
interface DynamicFieldProps {
  def:      DynamicFieldDef;
  value:    string;
  onChange: (key: string, value: string) => void;
  disabled: boolean;
}

function DynamicField({ def, value, onChange, disabled }: DynamicFieldProps) {
  const baseClass = `
    w-full px-3 py-2 text-sm rounded-lg
    border border-gray-300
    focus:outline-none focus:ring-2 focus:ring-[#5871A7] focus:border-transparent
    disabled:opacity-60 disabled:cursor-not-allowed
    placeholder-[#8E91A0]
  `;

  const label = (
    <label className="text-sm font-semibold logo-wrapper">
      {def.label}
      {def.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  if (def.type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <textarea
          rows={3}
          placeholder={def.placeholder || `Enter ${def.label.toLowerCase()}…`}
          value={value}
          onChange={(e) => onChange(def.key, e.target.value)}
          disabled={disabled}
          required={def.required}
          className={`${baseClass} resize-y`}
        />
      </div>
    );
  }

  if (def.type === "select" && def.options?.length) {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(def.key, e.target.value)}
          disabled={disabled}
          required={def.required}
          className={baseClass}
        >
          <option value="">Select {def.label}…</option>
          {def.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  // Default — plain Input with icon-free layout to match the existing style
  return (
    <div className="flex flex-col gap-1">
      {label}
      <Input
        type={def.type || "text"}
        placeholder={def.placeholder || `Enter ${def.label.toLowerCase()}…`}
        value={value}
        onChange={(e) => onChange(def.key, e.target.value)}
        disabled={disabled}
        required={def.required}
      />
    </div>
  );
}

// ── SignUpForm ─────────────────────────────────────────────────────────────────
const SignUpForm = () => {
  const [showPassword,        setShowPassword]        = useState(false);
  const [fullname,            setFullName]            = useState("");
  const [username,            setEmail]               = useState("");
  const [password,            setPassword]            = useState("");
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState("");
  const [agreedToTerms,       setAgreedToTerms]       = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [signupEmail,         setSignupEmail]         = useState("");

  // ── Dynamic fields ──────────────────────────────────────────────────────────
  const [dynamicFields,  setDynamicFields]  = useState<DynamicFieldDef[]>([]);
  const [dynamicValues,  setDynamicValues]  = useState<Record<string, string>>({});
  const [fieldsLoading,  setFieldsLoading]  = useState(false);

  const searchParams  = useSearchParams();
  const publicAwardID = searchParams.get("id");
  const [currentUsername, setCurrentUsername] = useState("");
  const [adminStatus,     setAdminStatus]     = useState(false);
  const [accessChecked,   setAccessChecked]   = useState(false);

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

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
      });
  }, [currentUsername]);

  // ── CSS injection ───────────────────────────────────────────────────────────
  const injectCSS = (cssText: string) => {
    const el = document.createElement("style");
    el.textContent = cssText;
    document.head.appendChild(el);
  };

  const fetchAndApplyCSS = async () => {
    try {
      const res     = await fetch(`${API_URL}/target-css/${WORLD_ID}`, {
        headers: { Accept: "text/css,*/*" },
      });
      const cssText = await res.text();
      injectCSS(cssText.replace(/<[^>]*>/g, ""));
    } catch (err) {
      console.error("Error fetching CSS:", err);
    }
  };

  // ── Redirect helper ─────────────────────────────────────────────────────────
  const redirectAfterAuth = () => {
      const datarole = localStorage.getItem("datarole");
      console.log("datarole", datarole);
      // some roles may include others (e.g. "admin" may also include "user" permissions)
      if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("admin")) {
        window.location.href = "/admin/ins-policy";
      } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("user")) {
        window.location.href = "/dashboard/ins-policy";
      } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("subscriber")) {
        window.location.href = "/logistics/subscriber";
      } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("driver")) {
        window.location.href = "/logistics/shipments";
      } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("logisticsadmin")) {
        window.location.href = "/logistics/transportmap/fleet";
      }
  };

  // ── On mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    // CSS
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "app.geo-drops.com"
    ) {
      fetchAndApplyCSS();
    }

    // Already signed in → redirect
    const sessionInfo = getSessionInfo();
    if (sessionInfo.isValid) {
      redirectAfterAuth();
      return;
    }

    // Fetch dynamic field definitions from worldsettings
    const fetchDynamicFields = async () => {
      if (!WORLD_ID || process.env.NEXT_PUBLIC_SIGNUP_DETAILS !== "1") return;
      setFieldsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/worldsettings/jsoncolumns/${WORLD_ID}`
        );
        if (!res.ok) return;

        const data = await res.json();
        const raw  = data?.jsoncolumns;
        if (!raw) return;

        const parsed: DynamicFieldDef[] =
          typeof raw === "string" ? JSON.parse(raw) : raw;

        if (Array.isArray(parsed) && parsed.length > 0) {
          setDynamicFields(parsed);
          const init: Record<string, string> = {};
          parsed.forEach((f) => { init[f.key] = ""; });
          setDynamicValues(init);
        }
      } catch (err) {
        console.error("Error fetching dynamic fields:", err);
      } finally {
        setFieldsLoading(false);
      }
    };

    fetchDynamicFields();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dynamic field value handler ─────────────────────────────────────────────
  const handleDynamicChange = (key: string, value: string) => {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions");
      setLoading(false);
      return;
    }

    if (!fullname || !username || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Validate required dynamic fields
    for (const f of dynamicFields) {
      if (f.required && !dynamicValues[f.key]?.trim()) {
        setError(`Please fill in the "${f.label}" field`);
        setLoading(false);
        return;
      }
    }

    try {
      // ── 1. Sign up ─────────────────────────────────────────────────────────
      const res = await fetch(`${API_URL}/signupmobile`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fullname, username, password }),
      });

      let data: any = {};
      const ct = res.headers.get("content-type");
      if (ct?.includes("application/json")) {
        const text = await res.text();
        if (text) data = JSON.parse(text);
      } else {
        setError(`Server error: ${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setError(`Sign up failed: ${res.status} - ${data.username ?? ""}`);
        setLoading(false);
        return;
      }

      // ── 2. Assign handle ───────────────────────────────────────────────────
      localStorage.setItem("username", username);
      try {
        const assignRes = await fetch(`${API_URL}/assign-handle-on-login`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ username }),
        });
        if (assignRes.ok) {
          const ad = await assignRes.json();
          if (ad.success && ad.generated) {
            console.log("Generated handle:", ad.displayName);
          }
        }
      } catch (e) {
        console.error("assign-handle error:", e);
      }

      setPaygNewCookie();
      setUsernameCookie(username);

      // ── 3. Upsert dynamic field values into userdata.jsoncolumns ──────────
      const hasValues =
        dynamicFields.length > 0 &&
        Object.values(dynamicValues).some((v) => v.trim() !== "");

      if (hasValues) {
        const payload: Record<string, string> = {};
        dynamicFields.forEach((f) => {
          if (dynamicValues[f.key]?.trim()) {
            payload[f.key] = dynamicValues[f.key].trim();
          }
        });

        try {
          await fetch(`${API_URL}/userdatabyworldid/jsoncolumns`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              userid:      username,
              worldid:     WORLD_ID,
              jsoncolumns: JSON.stringify(payload),
            }),
          });
        } catch (udErr) {
          // Non-fatal — sign-up already succeeded
          console.error("Failed to save dynamic field values:", udErr);
        }
      }

      // ── 4. Redirect or PIN ─────────────────────────────────────────────────
      if (data.requiresPin) {
        setSignupEmail(username);
        setShowPinVerification(true);
      } else {
        redirectAfterAuth();
      }
    } catch (e) {
      console.error("Sign up error:", e);
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  };

  // ── PIN callbacks ───────────────────────────────────────────────────────────
  const handlePinSuccess = () => redirectAfterAuth();
  const handlePinCancel  = () => { setShowPinVerification(false); setSignupEmail(""); };

  if (showPinVerification) {
    return (
      <PinVerification
        email={signupEmail}
        resend={false}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-no-repeat bg-cover bg-center flex items-center justify-center relative py-10"
      style={{
        backgroundImage:    `url(https://nodejs.gridiron-app.com/images/bkg_${WORLD_ID}.png)`,
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
      }}
    >
      {/* Language Dropdown */}
      <div className="absolute top-4 left-4">
        <LanguageSelector />
      </div>

      {/* Sign Up Card */}
      <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px] bkg-card">
        <div className="text-center">
          <img
            src={process.env.NEXT_PUBLIC_LOGO_PATH}
            style={{ width: "100px", display: "inline-block" }}
            alt="Logo"
          />
        </div>
        <h2 className="text-2xl font-semibold text-center mb-1 logo-wrapper">
          Sign up
        </h2>
        <p className="text-[#61667A] text-sm text-center mb-1 logo-wrapper">
          Free membership, collectibles and rewards now
        </p>

        <div className="space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold logo-wrapper">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
              <Input
                type="text"
                placeholder="Your full name"
                className="pl-11"
                value={fullname}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold logo-wrapper">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
              <Input
                type="email"
                placeholder="Your email address"
                className="pl-11"
                value={username}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => {
                  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                  if (e.target.value && !re.test(e.target.value)) {
                    e.target.setCustomValidity("Please enter a valid email address");
                    e.target.reportValidity();
                  } else {
                    e.target.setCustomValidity("");
                  }
                }}
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold logo-wrapper">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                className="pl-11 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              {showPassword ? (
                <EyeOff
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0] cursor-pointer"
                  onClick={() => setShowPassword(false)}
                />
              ) : (
                <Eye
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0] cursor-pointer"
                  onClick={() => setShowPassword(true)}
                />
              )}
            </div>
          </div>

          {/* ── Dynamic fields ─────────────────────────────────────────────── */}
          {fieldsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-400" />
              Loading additional fields…
            </div>
          )}

          {!fieldsLoading && dynamicFields.length > 0 && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-2 text-[#8E91A0] text-xs">
                <hr className="flex-grow border-[#EEEFF3]" />
                <span className="flex-shrink-0 font-medium">
                  Additional Details
                </span>
                <hr className="flex-grow border-[#EEEFF3]" />
              </div>

              {dynamicFields.map((def) => (
                <DynamicField
                  key={def.key}
                  def={def}
                  value={dynamicValues[def.key] ?? ""}
                  onChange={handleDynamicChange}
                  disabled={loading}
                />
              ))}
            </>
          )}

          {/* Terms */}
          <div className="flex items-center space-x-2 text-sm logo-wrapper">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              disabled={loading}
            />
            <label htmlFor="terms">
              I agree to the{" "}
              <a
                href="https://www.geo-drops.com/geo-drops-terms-and-conditions.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-geodrops font-semibold hover:underline geo-card-text logo-wrapper"
              >
                Terms & Conditions
              </a>
            </label>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            className="w-full rounded-[12px] text-white text-base h-13 font-extrabold geo-claim-button"
            disabled={
              loading ||
              !agreedToTerms ||
              !fullname ||
              !username ||
              !password
            }
          >
            {loading ? "Creating Account…" : "Create Account"}
          </Button>

          {/* Sign in */}
          <p className="text-center text-sm text-gray-600 logo-wrapper">
            Already have an account?{" "}
            <Link
              href={
                publicAwardID
                  ? `/signin?id=${publicAwardID}&tf=1`
                  : "/signin?tf=1"
              }
              className="text-geodrops font-semibold logo-wrapper"
            >
              Sign in
            </Link>
          </p>

          {/* Home */}
          <p className="text-center text-sm text-gray-600 logo-wrapper">
            <Link
              href="https://www.geo-drops.com"
              className="text-geodrops font-semibold logo-wrapper"
            >
              Geo-Drops Home Page
            </Link>
          </p>

          {/* Google (hidden) */}
          <div style={{ display: "none" }}>
            <div className="flex items-center gap-2 text-[#8E91A0] text-xs">
              <hr className="flex-grow border-[#EEEFF3]" />
              OR
              <hr className="flex-grow border-[#EEEFF3]" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full font-bold text-base h-13 rounded-[12px] flex gap-2 justify-center border border-[#EEEFF3]"
            >
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={20}
                height={20}
              />
              Sign up with Google
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

// ── Main export ────────────────────────────────────────────────────────────────
const SignUp = () => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center">
        <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px] flex items-center justify-center">
          <div className="text-center">Loading…</div>
        </div>
      </div>
    }
  >
    <SignUpForm />
  </Suspense>
);

export default SignUp;