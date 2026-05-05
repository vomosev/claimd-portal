"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import Link from "next/link";
import LanguageSelector from "../shared/LanguageSelector";
import { clearSessionCookies } from '@/utils/cookieUtils';

const Logout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get username from localStorage for display
  const username =
    typeof window !== "undefined" ? localStorage.getItem("username") : null;

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Clear the cached username from localStorage
      localStorage.removeItem("username");
      localStorage.removeItem("displayname");

      // Clear any other cached data if needed
      // localStorage.removeItem('token');
      // localStorage.removeItem('userEmail');
      // sessionStorage.clear(); // if using sessionStorage
      clearSessionCookies();

      // You can also clear all localStorage if needed:
      localStorage.clear();

      // Simulate logout process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect to login page after logging out
      window.location.href = "/signin";
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    // Go back to previous page or dashboard
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-[url('/bg.png')] bg-no-repeat bg-cover bg-center flex items-center justify-center relative py-10">
      {/* Language Dropdown */}
      <div className="absolute top-4 left-4">
        <LanguageSelector />
      </div>

      {/* About Link */}
      <div className="absolute top-6 right-12 text-white font-semibold">
        {/* About Geo-Drops */}
      </div>

      {/* Logout Card */}
      <div className="bg-white px-10 py-12 rounded-[30px] shadow-xl w-[450px]">
        <div className="flex justify-center mb-4">
          <Image src={process.env.NEXT_PUBLIC_LOGO_PATH || logo} alt="Logo" width={200} height={200} />
        </div>

        {/* Logout Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <LogOut className="size-8 text-red-600" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-1">Sign Out</h2>
        <p className="text-[#61667A] text-sm text-center mb-8">
          Are you sure you want to sign out of your account?
        </p>

        {/* User Info - Display cached username if available */}
        {/* {username && (
          <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="bg-geodrops-100 p-2 rounded-full">
              <User className="size-5 text-geodrops-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">{username}</p>
              <p className="text-xs text-[#61667A]">Signed in user</p>
            </div>
          </div>
        )} */}

        <div className="space-y-4">
          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full rounded-[12px] text-white text-base h-13 font-extrabold bg-red-600 hover:bg-red-700"
          >
            {isLoggingOut ? "Signing Out..." : "Yes, Sign Out"}
          </Button>

          {/* Cancel Button */}
          <Button
            onClick={handleCancel}
            variant="secondary"
            className="w-full font-bold h-13 rounded-[12px] border border-[#EEEFF3]"
          >
            Cancel
          </Button>

          {/* Back to Dashboard */}
          <p className="text-center text-sm text-gray-600">
            Want to stay?{" "}
            <Link href="/dashboard" className="text-geodrops font-semibold">
              Go to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Logout;
