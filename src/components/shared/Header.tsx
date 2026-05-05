"use client";

import { Moon, Sun, Search, ChevronDown } from "lucide-react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const categories = ["All", "Music", "Sport", "Lifestyle", "Fashion"];

// Function to get initial theme state
const getInitialTheme = () => {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return stored === "dark" || (!stored && prefersDark);
};

// Function to apply theme immediately
const applyTheme = (isDark: boolean) => {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
};

const Header = () => {
  const [isDark, setIsDark] = useState(() => getInitialTheme());
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const [imageurl, setImageurl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentUsername = typeof window !== "undefined" ? localStorage.getItem("username") ?? "" : "";
  const [currentPoints, setCurrentPoints] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<string | null>(null);
  const [balancePoints, setBalancePoints] = useState<string | null>(null);

  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/points/${currentUsername}`)
        .then((res) => res.json())
        .then((data) => {
          localStorage.setItem("currentpoints", data.totalPoints);
          setCurrentPoints(data.totalPoints);
          localStorage.setItem("claimedpoints", data.claimedPoints);
          setClaimedPoints(data.claimedPoints);
          localStorage.setItem("balancepoints", data.balancePoints);
          setBalancePoints(data.balancePoints);
        })
        .catch((err) => {
          console.error("Error fetching currentPoints:", err);
        });
    }
  }, [currentUsername]);

  let currentView = "public";
  if (window.location.pathname.includes("/dashboard")) {
    currentView = "dashboard";
  }

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentQuery = searchParams.get("q");

    setSearchQuery("");

    if (currentPath === "/" + currentView && !currentQuery) {
      setSelectedCategory("All");
    } else if (currentQuery) {
      const matchedCategory = categories.find(
        (cat) => cat.toLowerCase() === currentQuery.toLowerCase()
      );
      setSelectedCategory(matchedCategory || "All");

      if (currentPath.includes("/search")) {
        setSearchQuery(currentQuery || "");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUsername) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/getdisplaypic/${currentUsername}`
      )
        .then((res) => res.json())
        .then((data) => {
          setImageurl(data.imageurl);
          localStorage.setItem("displayname", data.displayname);
        })
        .catch((error) =>
          console.error("Error fetching display picture:", error)
        );
    }
  }, [currentUsername]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById("category-dropdown");
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const getCategoryUrl = (category: string) => {
    if (category === "All") return "/" + currentView;
    if (category === "...") return "#";
    return `/${currentView.toLowerCase()}/search?q=${category.toLowerCase()}`;
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(
        `/${currentView.toLowerCase()}/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setIsDropdownOpen(false);
    router.push(getCategoryUrl(category));
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <div
      className={`sticky w-full right-0 z-[40] bg-[#EEEFF3] dark:bg-[#1C2541] transition-all duration-300 flex px-4 py-4 gap-4 flex-col items-end md:flex-row md:items-center md:justify-between md:gap-0 md:py-7 ${
        isMobile ? "top-[60px] left-0" : ``
      }`}
    >
      {/* Category Links - Desktop */}
      <div className="hidden md:flex gap-2 w-full overflow-x-auto pb-2 md:w-auto md:overflow-visible md:pb-0">
        {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && Number(process.env.NEXT_PUBLIC_CATEGORIES) === 1 && categories.map((category, idx) => (
          <Link
            key={idx}
            href={getCategoryUrl(category)}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-[10px] text-sm font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              category === selectedCategory
                ? "bg-white text-blue-950 dark:bg-[#2D385B] dark:text-white"
                : "bg-white text-gray-400 dark:bg-[#2D385B] dark:text-gray-400"
            }`}
          >
            {category}
          </Link>
        ))}
      </div>

      {/* Category Dropdown - Mobile */}
      <div
        id="category-dropdown"
        className="md:hidden relative w-full flex items-center"
      >
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center justify-between w-full px-4 py-2 rounded-[10px] text-sm font-bold transition-all duration-200 bg-white dark:bg-[#2D385B] text-blue-950 dark:text-white`}
        >
          <span>{selectedCategory}</span>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#2D385B] rounded-[10px] shadow-lg z-50 overflow-hidden">
            {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && Number(process.env.NEXT_PUBLIC_CATEGORIES) === 1 && categories.map((category, idx) => (
              <button
                key={idx}
                onClick={() => handleCategoryClick(category)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                  category === selectedCategory
                    ? "bg-blue-50 dark:bg-[#3D4F6F] text-blue-950 dark:text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3D4F6F]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search and Avatar */}
      <div className="flex items-center justify-between space-x-2 w-full md:w-auto">
        {/* Search Bar */}
        {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && Number(process.env.NEXT_PUBLIC_CATEGORIES) === 1 && !pathname.includes("/search") && (
          <div
            onSubmit={handleSearch}
            className="flex items-center flex-1 md:flex-initial"
          >
            <div className="flex items-center bg-white dark:bg-[#1C2541] px-3 py-2 rounded-[10px] dark:border dark:border-[#2E4066] w-full lg:w-[225px] xl:w-[325px]">
              <button
                onClick={handleSearch}
                className="flex items-center justify-center mr-2 hover:opacity-70 transition-opacity"
              >
                <Search className="w-4 h-4 text-geodrops cursor-pointer" />
              </button>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyPress={handleKeyPress}
                className="outline-none text-sm bg-transparent text-black dark:text-white flex-1"
              />
            </div>
          </div>
        )}

        <span className="relative text-sm font-black text-black dark:text-white leading-none"><a href="/dashboard/mantlepiece">{balancePoints}</a></span>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white dark:bg-[#1C2541] text-[#151E3A] dark:text-white border dark:border-gray-700 cursor-pointer flex-shrink-0"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Avatar with badge */}
          <div className="relative flex-shrink-0">
            <a href="/dashboard/settings">
              <img
                src={imageurl || "https://i.pravatar.cc/32"}
                alt="User"
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="absolute -top-1 -right-2 rounded-full flex items-center justify-center text-white text-xs font-bold"></div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
