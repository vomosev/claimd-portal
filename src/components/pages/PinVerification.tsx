"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logo from "@/assets/logo.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PinVerificationProps {
  email: string;
  resend: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

const PinVerification = ({
  email,
  onSuccess,
  resend = false,
  onCancel,
}: PinVerificationProps) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasCalledResend = useRef(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (resend && !hasCalledResend.current) {
      hasCalledResend.current = true;
      handleResendPin();
    }
  }, [resend]);

  const handlePinChange = (value: string) => {
    // Only allow digits
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setPin(numericValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (pin.length !== 6) {
      setError("Please enter all 6 digits");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        localStorage.setItem("username", email);
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(data.message || "Invalid PIN. Please try again.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch (e) {
      console.error("PIN verification error:", e);
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendPin = async () => {
    setResendMessage("");
    setResendLoading(true);

    try {
      const res = await fetch(`${API_URL}/resend-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResendMessage("PIN resent successfully. Check your email.");
        setResendCooldown(60);
        setPin("");
        inputRef.current?.focus();
      } else {
        setError(data.message || "Failed to resend PIN.");
      }
    } catch (e) {
      console.error("Resend PIN error:", e);
      setError("Network or server error");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center relative py-10">
      <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px]">
        <div className="flex justify-center mb-4">
          <Image src={process.env.NEXT_PUBLIC_LOGO_PATH || logo} alt="Logo" width={200} height={200} />
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2">
          Verify Your Email
        </h2>
        <p className="text-[#61667A] text-sm text-center mb-8">
          We've sent a 6-digit PIN to
          <br />
          <span className="font-semibold text-gray-800">{email}</span>
        </p>

        <div className="space-y-6" onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded-lg text-sm text-center font-medium">
              ✓ Email verified successfully!
            </div>
          )}

          {/* Resend Success Message */}
          {resendMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              {resendMessage}
            </div>
          )}

          {/* PIN Input Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Enter 6-digit PIN
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              disabled={loading || success}
              className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-[#EEEFF3] rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal disabled:opacity-50"
            />
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleSubmit}
            className="w-full rounded-[12px] text-white text-base h-13 font-extrabold"
            disabled={loading || success || pin.length !== 6}
          >
            {loading ? "Verifying..." : success ? "✓ Verified" : "Verify PIN"}
          </Button>

          {/* Resend PIN Section */}
          <div className="pt-4 border-t border-[#EEEFF3]">
            <p className="text-center text-sm text-gray-600 mb-3">
              Didn't receive the PIN?
            </p>
            <Button
              onClick={handleResendPin}
              disabled={resendLoading || resendCooldown > 0}
              variant="outline"
              className="w-full rounded-[12px] text-geodrops border border-teal font-semibold h-11"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : resendLoading
                ? "Sending..."
                : "Resend PIN"}
            </Button>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full rounded-[12px] text-gray-600 border border-[#EEEFF3] font-semibold h-11"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PinVerification;
