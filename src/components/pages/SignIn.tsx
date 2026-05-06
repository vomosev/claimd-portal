"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import Link from "next/link";
import LanguageSelector from "../shared/LanguageSelector";
import PinVerification from "./PinVerification";
import { setPaygNewCookie, setUsernameCookie, hasValidSession, getSessionInfo, getUsernameFromCookie, clearSessionCookies } from '@/utils/cookieUtils';

// Add your API URL - adjust this to match your actual API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Function to assign handle if user doesn't have one
async function ensureUserHasHandle(username: string) {
  try {
    // Check if user has a display name
    const checkResponse = await fetch(
      `${API_URL}/users/${username}/display-name`,
      {
        method: "GET",
      }
    );

    if (!checkResponse.ok) {
      console.error("Failed to check display name");
      return;
    }

    const checkData = await checkResponse.json();

    // If user has a display name, no action needed
    if (
      checkData.success &&
      checkData.displayName &&
      checkData.displayName.trim() !== ""
    ) {
      console.log("User already has display name:", checkData.displayName);
      return;
    }

    // User doesn't have a display name, generate one via backend
    const assignResponse = await fetch(`${API_URL}/assign-handle-on-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!assignResponse.ok) {
      console.error("Failed to assign handle");
      return;
    }

    const assignData = await assignResponse.json();

    if (assignData.success && assignData.generated) {
      console.log("Generated handle for user:", assignData.displayName);
    }
  } catch (error) {
    // Don't block login if handle assignment fails
    console.error("Error ensuring user has handle:", error);
  }
}

// Separate component that uses useSearchParams
function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [attemptedEmail, setAttemptedEmail] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(true); // NEW: Control form visibility
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
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

  const [cssLoading, setCssLoading] = useState(false);
  // Function to inject entire stylesheet dynamically into the page
  const injectCSS = async (cssText: string) => {
    try {
      // Create and inject new style element with the entire stylesheet
      const styleElement = document.createElement("style");
      styleElement.textContent = cssText;
      document.head.appendChild(styleElement);

      console.log(`Stylesheet injected successfully`);
    } catch (error) {
      console.error("Error injecting stylesheet:", error);
    }
  };

  // Function to fetch and apply CSS
  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

  const fetchAndApplyCSS = async () => {
    setCssLoading(true);
    try {
      const response = await fetch(`${apiUrl}/target-css/${worldId}`, {
        headers: {
          Accept: "text/css,*/*",
        },
      });

      const cssText = await response.text();
      console.log(`>>>>>>>>>> ${apiUrl}/target-css/${worldId}`, "cssText");

      // Extract only the CSS values, removing HTML tags if any
      const cleanCssText = cssText.replace(/<[^>]*>/g, "");

      // Inject CSS into the page immediately
      injectCSS(cleanCssText);

      // Log the clean CSS text for debugging
      console.log(">>>>>>>>>> CSS injected successfully", "cleanCssText");
    } catch (error) {
      console.error("Error fetching CSS:", error);
    } finally {
      setCssLoading(false);
    }
  };

  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(count + 1); // Runs once after mount
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "app.geo-drops.com"
    ) {
      fetchAndApplyCSS();
    }
  }, []); // Empty dependency array

  const publicAwardID = searchParams.get("id");

  useEffect(() => {
    const publicShowFields = searchParams.get("tf");
    if (publicShowFields === "1" || publicShowFields === "true") {
      setShowLoginForm(true);
    }
    if (publicShowFields === "0" || publicShowFields === "false") {
      setShowLoginForm(false);
    }
  }, [searchParams]); // Run when searchParams changes

  useEffect(() => {
    // Check if user has valid cookies on component mount
    const sessionInfo = getSessionInfo();
    if (sessionInfo.isValid) {
      setIsAuthenticated(true);
      setCurrentUser(sessionInfo.username);
      if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && adminStatus) {
        window.location.href = "/admin/ins-policy";
      } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && !adminStatus) {
        window.location.href = "/dashboard/ins-policy";
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [adminStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/loginmobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("username", username);
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }
        setPaygNewCookie(); // Creates UUID cookie
        setUsernameCookie(username); // Sets username cookie

        ensureUserHasHandle(username).catch((err) => {
          console.error("Handle assignment failed:", err);
        });

        // UPDATED: Check if PIN verification is required
        if (data.requiresPin) {
          setAttemptedEmail(username);
          setShowPinVerification(true);
        } else {
          console.log("adminStatus", adminStatus);
        }
      } else if (
        data.requiresPin ||
        data.message?.includes("not verified") ||
        data.message?.includes("activate")
      ) {
        setAttemptedEmail(username);
        setShowPinVerification(true);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (e) {
      console.error(e);
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSuccess = () => {
    // Redirect to dashboard after successful PIN verification
    // Check if publicAwardID exists and redirect accordingly
    if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && adminStatus) {
      window.location.href = "/admin/ins-policy";
    } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && !adminStatus) {
      window.location.href = "/dashboard/ins-policy";
    }
  };

  const handlePinCancel = () => {
    // Go back to signin form
    setShowPinVerification(false);
    setAttemptedEmail("");
  };

  // Show PIN verification dialog if needed
  if (showPinVerification) {
    return (
      <PinVerification
        email={attemptedEmail}
        resend={true}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-no-repeat bg-cover bg-center flex items-center justify-center relative py-10"
      style={{
        backgroundImage: `url(https://nodejs.gridiron-app.com/images/bkg_${worldId}.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Language Dropdown */}
      <div className="absolute top-4 left-4">
        <LanguageSelector />
      </div>

      {/* About Link */}
      <div className="absolute top-6 right-12 text-white font-semibold">
        {/* About Geo-Drops */}
      </div>

      {/* Main Card */}
      <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px] bkg-card">
        <div className="text-center">
          <img
            src={process.env.NEXT_PUBLIC_LOGO_PATH}
            style={{
              width: "100px",
              display: "inline-block",
            }}
            alt="Logo"
          />
        </div>

        {/* HOME PAGE VIEW - Show when login form is hidden */}
        {!showLoginForm ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center mb-1 logo-wrapper">
              {process.env.NEXT_PUBLIC_DROPSITE_NAME}
            </h2>
            <p className="text-[#61667A] text-sm text-center mb-6 logo-wrapper">
              {process.env.NEXT_PUBLIC_INDEX_HTML}
            </p>

            {/* Sign In Button */}
            <Button
              onClick={() => setShowLoginForm(true)}
              className="w-full rounded-[12px] text-white text-base h-13 font-extrabold geo-claim-button"
            >
              Sign In
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600 logo-wrapper">
              Don't have an account?{" "}
              <Link
                href={publicAwardID ? `/signup?id=${publicAwardID}` : "/signup"}
                className="text-geodrops font-semibold logo-wrapper"
              >
                Sign up
              </Link>
            </p>

            {/* Reset Password Link */}
            <p className="text-center text-sm text-gray-600 logo-wrapper">
              Can't remember your password?{" "}
              <Link
                href={"/reset-password"}
                className="text-geodrops font-semibold logo-wrapper"
              >
                Reset password
              </Link>
            </p>
          </div>
        ) : (
          /* LOGIN FORM VIEW - Show when Sign In button is clicked */
          <>
            <h2 className="text-2xl font-semibold text-center mb-1 logo-wrapper">
              Sign in
            </h2>
            <p className="text-[#61667A] text-sm text-center mb-1 logo-wrapper">
              Enter your details to login
            </p>

            <div className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
                  <Input
                    type="email"
                    placeholder="Your email address"
                    className="pl-11"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={(e) => {
                      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                      if (e.target.value && !emailRegex.test(e.target.value)) {
                        e.target.setCustomValidity('Please enter a valid email address');
                        e.target.reportValidity();
                      } else {
                        e.target.setCustomValidity('');
                      }
                    }}
                    pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
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

              <div>
                {/* Options Row */}
                <div className="flex justify-between items-center text-sm py-1">
                  <div></div>
                </div>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleSubmit}
                className="w-full rounded-[12px] text-white text-base h-13 font-extrabold disabled:opacity-50 geo-claim-button"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </Button>

              {/* Back Button */}
              <Button
                onClick={() => {
                  setShowLoginForm(false);
                  setError("");
                }}
                variant="outline"
                className="w-full rounded-[12px] text-base h-13 font-semibold"
                disabled={loading}
              >
                Back
              </Button>

              {/* Register */}
              <p className="text-center text-sm text-gray-600 logo-wrapper">
                Don't have an account?{" "}
                <Link
                  href={publicAwardID ? `/signup?id=${publicAwardID}` : "/signup"}
                  className="text-geodrops font-semibold logo-wrapper"
                >
                  Sign up
                </Link>
              </p>

            {/* Reset Password Link */}
            <p className="text-center text-sm text-gray-600 logo-wrapper">
              Can't remember your password?{" "}
              <Link
                href={"/reset-password"}
                className="text-geodrops font-semibold logo-wrapper"
              >
                Reset password
              </Link>
            </p>

              {/* Home Link */}
              <p className="text-center text-sm text-gray-600 logo-wrapper">
                <Link
                  href="https://www.geo-drops.com"
                  className="text-geodrops font-semibold logo-wrapper"
                >
                  Geo-Drops Home Page
                </Link>
              </p>

              <div style={{ display: "none" }}>
                {/* Divider */}
                <div className="flex items-center gap-2 text-[#8E91A0] text-xs">
                  <hr className="flex-grow border-[#EEEFF3]" />
                  OR
                  <hr className="flex-grow border-[#EEEFF3]" />
                </div>

                {/* Google Sign-in */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-bold text-base h-13 rounded-[12px] flex gap-2 justify-center border border-[#EEEFF3]"
                  disabled={loading}
                >
                  <Image
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    width={20}
                    height={20}
                  />
                  Sign in with Google
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
const SignIn = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-10 bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center">
          <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px] flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
};

export default SignIn;
