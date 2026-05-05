// src/components/layout/PublicHeader.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Moon,
  Sun,
  User,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PublicHeaderProps {
  isAuthenticated: boolean;
  currentUsername: string;
  displayName?: string;
  isCollapsed: boolean;
}

const PublicHeader = ({
  isAuthenticated,
  currentUsername,
  displayName,
  isCollapsed,
}: PublicHeaderProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Handle theme toggle
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "light";
    setIsDarkMode(theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Fetch profile image for authenticated users
  useEffect(() => {
    if (isAuthenticated && currentUsername) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/getdisplaypic/${currentUsername}`
      )
        .then((res) => res.json())
        .then((data) => {
          setProfileImage(data.imageurl);
        })
        .catch((err) => {
          console.error("Error fetching profile image:", err);
          setProfileImage(null);
        });
    }
  }, [isAuthenticated, currentUsername]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchRoute = isAuthenticated ? "/public/search" : "/search";
      router.push(`${searchRoute}?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("username");
    router.push("/signin");
  };

  const getPageTitle = () => {
    if (displayName) {
      return `${displayName}'s profile`;
    }
    return "Geo Drops";
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 bg-white dark:bg-[#151E3A] border-b border-[#F7F8F9] dark:border-[#191C24] z-50 h-16 transition-all duration-300 ${
        isCollapsed ? "lg:left-[68px]" : "lg:left-[300px]"
      }`}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Page Title */}
        <div className="flex items-center">
          <h1 className="text-xl ml-8 font-semibold text-gray-900 dark:text-white">
            {/* {getPageTitle()} */}
          </h1>
        </div>

        {/* Right side - Search, Theme Toggle, Profile */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-[#F7F8F9] dark:bg-[#1C2541] border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5871A7] focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </form>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-[#F7F8F9] dark:bg-[#1C2541] hover:opacity-70 transition-opacity"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun size={18} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon size={18} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>

          {/* Profile Section */}
          {isAuthenticated ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F7F8F9] dark:hover:bg-[#1C2541] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User
                        size={16}
                        className="text-gray-600 dark:text-gray-300"
                      />
                    </div>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className="text-gray-600 dark:text-gray-300"
                />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#151E3A] border border-[#F7F8F9] dark:border-[#2D385B] rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#F7F8F9] dark:border-[#2D385B]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentUsername}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Authenticated User
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      router.push("/dashboard/settings");
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#F7F8F9] dark:hover:bg-[#1C2541] flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#F7F8F9] dark:hover:bg-[#1C2541] flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Public User Profile Icon */
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/signin")}
                className="p-2 rounded-lg bg-[#F7F8F9] dark:bg-[#1C2541] hover:opacity-70 transition-opacity"
                title="Sign in to access more features"
              >
                <User size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
