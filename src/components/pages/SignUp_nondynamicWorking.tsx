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
import { setPaygNewCookie, setUsernameCookie, hasValidSession, getSessionInfo, getUsernameFromCookie, clearSessionCookies } from '@/utils/cookieUtils';

// Add your API URL - adjust this to match your actual API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Separate component that uses useSearchParams
const SignUpForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [fullname, setFullName] = useState("");
  const [username, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

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
    // Check if user has valid cookies on component mount
    const sessionInfo = getSessionInfo();
    if (sessionInfo.isValid) {
      setIsAuthenticated(true);
      setCurrentUser(sessionInfo.username);
      if (publicAwardID) {
        window.location.href = `/dashboard/award-details/${publicAwardID}`;
      } else if (Number(process.env.NEXT_PUBLIC_DISTRIBUTION) === 1) {
        window.location.href = "/dashboard/list-music";
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      setIsAuthenticated(false);
      // Optionally redirect to login
      // window.location.href = '/signin';
    }
  }, []);

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

    try {
      const res = await fetch(`${API_URL}/signupmobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, username, password }),
      });

      let data;
      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const text = await res.text();
        if (text) {
          data = JSON.parse(text);
        } else {
          data = {};
        }
      } else {
        setError(`Server error: ${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }

      if (res.ok && data.success) {
        localStorage.setItem("username", username);
        const assignResponse = await fetch(
          `${API_URL}/assign-handle-on-login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
          }
        );
        setPaygNewCookie(); // Creates UUID cookie
        setUsernameCookie(username); // Sets username cookie

        if (assignResponse.ok) {
          const assignData = await assignResponse.json();

          if (assignData.success && assignData.generated) {
            console.log("Generated handle for user:", assignData.displayName);
          }
        }

        // UPDATED: Check if PIN verification is required
        if (data.requiresPin) {
          setSignupEmail(username);
          setShowPinVerification(true);
        } else {
          if (publicAwardID) {
            window.location.href = `/dashboard/award-details/${publicAwardID}`;
          } else if (Number(process.env.NEXT_PUBLIC_DISTRIBUTION) === 1) {
            window.location.href = "/dashboard/list-music";
          } else {
            window.location.href = "/dashboard";
          }
        }
      } else {
        setError(`Sign up failed: ${res.status} -  ${data.username}`);
      }
    } catch (e) {
      console.error("Sign up error:", e);
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSuccess = () => {
    // Redirect to dashboard after successful PIN verification
    // Check if publicAwardID exists and redirect accordingly
    if (publicAwardID) {
      window.location.href = `/dashboard/award-details/${publicAwardID}`;
    } else if (Number(process.env.NEXT_PUBLIC_DISTRIBUTION) === 1) {
      window.location.href = "/dashboard/list-music";
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handlePinCancel = () => {
    // Go back to signup form
    setShowPinVerification(false);
    setSignupEmail("");
  };

  // Show PIN verification dialog if needed
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

      {/* Sign Up Card */}
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
        <h2 className="text-2xl font-semibold text-center mb-1 logo-wrapper">
          Sign up
        </h2>
        <p className="text-[#61667A] text-sm text-center mb-1 logo-wrapper">
          to unlock collectibles and rewards now
        </p>
        {/* <p className="text-[#61667A] text-sm text-center mb-1 logo-wrapper">
          After signup, watch the intro and demo videos.
        </p> */}

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold logo-wrapper">
              Full Name
            </label>
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

          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold logo-wrapper">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
              <Input
                type="email"
                placeholder="Your email address"
                className="pl-11"
                value={username}
                onChange={(e) => setEmail(e.target.value)}
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
            <label className="text-sm font-semibold logo-wrapper">
              Password
            </label>
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

          {/* Terms Checkbox */}
          <div className="flex items-center space-x-2 text-sm logo-wrapper">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) =>
                setAgreedToTerms(checked as boolean)
              }
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

          {/* Signup Button */}
          <Button
            onClick={handleSubmit}
            className="w-full rounded-[12px] text-white text-base h-13 font-extrabold geo-claim-button"
            disabled={
              loading || !agreedToTerms || !fullname || !username || !password
            }
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>

          {/* Already have account */}
          <p className="text-center text-sm text-gray-600 logo-wrapper">
            Already have an account?{" "}
            <Link
              href={publicAwardID ? `/signin?id=${publicAwardID}&tf=1` : "/signin?tf=1"}
              className="text-geodrops font-semibold logo-wrapper"
            >
              Sign in
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

            {/* Google Sign-up */}
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

// Main component with Suspense wrapper
const SignUp = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center">
          <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px] flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
};

export default SignUp;
