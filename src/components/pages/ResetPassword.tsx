// ResetPassword.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo-icon.png";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import toast from "react-hot-toast";

import LanguageSelector from "../shared/LanguageSelector";

// Step 1 Schema - Email only
const step1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Step 2 Schema - New password
const step2Schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const ResetPasswordContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step1Success, setStep1Success] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);

  // Step 2 should be shown when token is present
  const isStep2 = !!token && !!emailParam;

  // Forms for each step
  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: "",
    },
  });

  const step2Form = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Verify token when component loads with token
  useEffect(() => {
    if (token && emailParam && !tokenVerified && !verifyingToken) {
      verifyToken();
    }
  }, [token, emailParam]);

  const verifyToken = async () => {
    setVerifyingToken(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/verify-reset-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailParam, token }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || "Invalid or expired reset token");
        setTimeout(() => router.push("/reset-password"), 2000);
        return;
      }

      setTokenVerified(true);
    } catch (error) {
      console.error("Error verifying token:", error);
      toast.error("Failed to verify reset token");
      setTimeout(() => router.push("/reset-password"), 2000);
    } finally {
      setVerifyingToken(false);
    }
  };

  // Handle step 1 submission (send reset email)
  const onStep1Submit = async (data: z.infer<typeof step1Schema>) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setStep1Success(true);
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        toast.error(result.message || "Failed to send reset email");
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle step 2 submission (update password)
  const onStep2Submit = async (data: z.infer<typeof step2Schema>) => {
    if (!token || !emailParam) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailParam,
            token,
            newPassword: data.password,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Password reset successfully!");
        setTimeout(() => router.push("/signin"), 2000);
      } else {
        toast.error(result.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1Success = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle2 className="text-green-500 w-16 h-16" />
      </div>
      <h2 className="text-2xl font-semibold">Check your email</h2>
      <p className="text-[#61667A] text-sm">
        We've sent a password reset link to your email address. Please check
        your inbox and follow the instructions.
      </p>
      <p className="text-[#61667A] text-xs mt-4">
        The link will expire in 30 minutes.
      </p>
      <Button
        onClick={() => {
          setStep1Success(false);
          step1Form.reset();
        }}
        variant="outline"
        className="mt-4 text-black"
      >
        Didn't receive the email? Try again
      </Button>
    </div>
  );

  const renderStep1 = () => (
    <>
      <h2 className="text-2xl font-semibold text-center mb-1">
        Reset your password
      </h2>
      <p className="text-[#61667A] text-sm text-center mb-8">
        Enter your email to reset your password
      </p>

      <Form {...step1Form}>
        <form
          onSubmit={step1Form.handleSubmit(onStep1Submit)}
          className="space-y-6"
        >
          <FormField
            name="email"
            control={step1Form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
                    <Input
                      type="email"
                      placeholder="Enter email address here"
                      className="pl-11"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full rounded-[12px] text-white text-base h-13 font-extrabold"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/signin")}
              className="text-sm text-[#5871A7] hover:underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      </Form>
    </>
  );

  const renderStep2 = () => {
    if (verifyingToken) {
      return (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5871A7]"></div>
          </div>
          <p className="text-[#61667A]">Verifying reset link...</p>
        </div>
      );
    }

    if (!tokenVerified) {
      return (
        <div className="text-center space-y-4">
          <p className="text-red-500">Invalid or expired reset link</p>
          <Button onClick={() => router.push("/reset-password")}>
            Request New Link
          </Button>
        </div>
      );
    }

    return (
      <>
        <h2 className="text-2xl font-semibold text-center mb-1">
          Create new password
        </h2>
        <p className="text-[#61667A] text-sm text-center mb-8">
          Enter your new password below
        </p>

        <Form {...step2Form}>
          <form
            onSubmit={step2Form.handleSubmit(onStep2Submit)}
            className="space-y-6"
          >
            <FormField
              name="password"
              control={step2Form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="pl-11 pr-11"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E91A0] hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="confirmPassword"
              control={step2Form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#8E91A0]" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="pl-11 pr-11"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E91A0] hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Requirements */}
            <div className="text-xs text-[#61667A] space-y-1">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full rounded-[12px] text-white text-base h-13 font-extrabold"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center relative py-10">
      <div className="absolute top-4 left-4">
        <LanguageSelector />
      </div>

      {/* Reset Password Card */}
      <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px]">
        <div className="flex justify-center mb-6">
          <Image src={process.env.NEXT_PUBLIC_LOGO_PATH || logo} alt="Logo" width={60} height={60} />
        </div>

        {isStep2
          ? renderStep2()
          : step1Success
          ? renderStep1Success()
          : renderStep1()}
      </div>
    </div>
  );
};

const ResetPassword = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center">
          <div className="absolute top-4 left-4">
            <LanguageSelector />
          </div>
          <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px]">
            <div className="flex justify-center mb-6">
              <Image src={process.env.NEXT_PUBLIC_LOGO_PATH || logo} alt="Logo" width={60} height={60} />
            </div>
            <div className="text-center text-[#61667A]">Loading...</div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPassword;
