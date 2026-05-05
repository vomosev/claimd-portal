// src/components/layout/PublicSidebar.tsx
"use client";

import React, { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import logoLight from "@/assets/logo-light.png";
import logoIcon from "@/assets/logo-icon.png";

import {
  Award,
  CircleArrowOutUpRight,
  CirclePlus,
  Flame,
  House,
  PanelLeftClose,
  Settings,
  Search,
  X,
  Menu,
  Trophy,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import LinkComponent from "../shared/LinkComponent";
import StyledIcon from "../shared/StyledIcon";
import { usePathname, useRouter } from "next/navigation";

interface PublicSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isAuthenticated: boolean;
  currentUsername: string;
}

const PublicSidebar = ({
  isCollapsed,
  setIsCollapsed,
  isAuthenticated,
  currentUsername,
}: PublicSidebarProps) => {
  const [role, setUserrole] = useState(null);
  const [adminStatus, setAdminStatus] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch user role when username is available and user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
        .then((res) => res.json())
        .then((data) => {
          setUserrole(data.role);
          setAdminStatus(String(data.role).includes("admin"));
        })
        .catch((err) => {
          console.error("Error fetching user role:", err);
          setAdminStatus(false);
        });
    } else {
      setAdminStatus(false);
      setUserrole(null);
    }
  }, [isAuthenticated, currentUsername]);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile menu when route changes and stop loading
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNavigating(false);
    setShowLoadingOverlay(false);
    setPendingRoute(null);
  }, [pathname]);

  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, [isMobile, isMobileMenuOpen]);

  const handleMobileToggle = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleNavigation = (href: string, event: React.MouseEvent) => {
    event.preventDefault();

    if (pathname === href) return;
    if (isNavigating) return;

    setIsNavigating(true);
    setPendingRoute(href);

    // Start loading overlay timer
    const loadingTimer = setTimeout(() => {
      setShowLoadingOverlay(true);
    }, 500);

    // Navigate after delay
    setTimeout(() => {
      clearTimeout(loadingTimer);
      router.push(href);
    }, 500);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isMobileMenuOpen) {
        const sidebar = document.getElementById("public-sidebar");
        const mobileMenu = document.getElementById("public-mobile-menu");
        const target = event.target as Node;
        if (
          sidebar &&
          mobileMenu &&
          !sidebar.contains(target) &&
          !mobileMenu.contains(target)
        ) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, isMobileMenuOpen]);

  // Navigation items - conditional based on authentication
  const getNavigationItems = () => {
    if (isAuthenticated) {
      // Authenticated user navigation
      return [
        { href: "/dashboard", label: "Home", icon: House },
        { href: "/dashboard/mantlepiece", label: "Profile", icon: Award },
        { href: "/dashboard/geo-drops", label: "Map Nearest", icon: Flame },
        {
          href: "/dashboard/search",
          label: "Find Drops",
          icon: Search,
          degree: 90,
        },
        {
          href: "/dashboard/searchworlds",
          label: "Find Dropsites",
          icon: Search,
          degree: 90,
        },
      ];
    } else {
      // Public user navigation
      return [
        { href: "/public", label: "Home", icon: House },
        { href: "/public/geo-drops", label: "Map Nearest", icon: Flame },
        {
          href: "/public/search",
          label: "Find Drops",
          icon: Search,
          degree: 90,
        },
        {
          href: "/public/searchworlds",
          label: "Find Dropsites",
          icon: Search,
          degree: 90,
        },
        // { href: "/geo-drops", label: "Geo-Drops Map", icon: Flame },
        // { href: "/search", label: "Search", icon: Search, degree: 90 },
      ];
    }
  };

  const getBottomNavigationItems = () => {
    if (isAuthenticated) {
      // Authenticated user bottom navigation
      return [
        { href: "/public/settings", label: "Settings", icon: Settings },
        {
          href: "/logout",
          label: "Logout",
          icon: CircleArrowOutUpRight,
          degree: 45,
        },
      ];
    } else {
      // Public user bottom navigation
      return [
        { href: "/signin", label: "Sign In", icon: LogIn },
        { href: "/signup", label: "Sign Up", icon: UserPlus },
      ];
    }
  };

  // Navigation Link Component with Loading State
  const NavigationLink = ({
    href,
    label,
    icon: Icon,
    degree = 0,
    showLabel = true,
  }: {
    href: string;
    label: string;
    icon: any;
    degree?: number;
    showLabel?: boolean;
  }) => {
    const isActive = pathname === href;
    const isPending = isNavigating && pendingRoute === href;

    return (
      <div
        onClick={(e) => handleNavigation(href, e)}
        className="cursor-pointer"
      >
        <LinkComponent
          label={showLabel ? label : ""}
          icon={
            isPending ? (
              <Loader2 size={20} className="animate-spin text-[#5871A7]" />
            ) : (
              <StyledIcon Icon={Icon} degree={degree} />
            )
          }
          active={isActive}
        />
      </div>
    );
  };

  const navigationItems = getNavigationItems();
  const bottomNavigationItems = getBottomNavigationItems();

  return (
    <>
      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white dark:bg-[#151E3A] p-6 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[#5871A7]" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Loading...
            </span>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[80] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header - Logo + Hamburger */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-[#151E3A] border-b border-b-[#F7F8F9] dark:border-b-[#191C24] px-4 py-3 flex items-center justify-between z-[90] lg:hidden">
          <div>
            <Image
              src={process.env.NEXT_PUBLIC_LOGO_PATH || logo}
              width={120}
              height={40}
              className="block dark:hidden"
              alt="LOGO"
            />
            <Image
              src={process.env.NEXT_PUBLIC_LOGO_PATH_LIGHT || logoLight}
              width={120}
              height={40}
              className="hidden dark:block"
              alt="LOGO-DARK"
            />
          </div>

          <button
            onClick={handleMobileToggle}
            className="bg-[#F7F8F9] dark:bg-[#1C2541] p-2 rounded-md shadow-lg"
            disabled={isNavigating}
          >
            {isMobileMenuOpen ? (
              <X size={20} className="text-[#5871A7]" />
            ) : (
              <Menu size={20} className="text-[#5871A7]" />
            )}
          </button>
        </div>
      )}

      {/* Mobile Dropdown Menu */}
      {isMobile && isMobileMenuOpen && (
        <div
          id="public-mobile-menu"
          className="fixed top-[61px] left-0 right-0 bg-white dark:bg-[#151E3A] border-b border-b-[#F7F8F9] dark:border-b-[#191C24] z-[90] lg:hidden shadow-lg landscape:h-screen landscape:overflow-scroll landscape:pb-14"
        >
          <div className="px-4 py-4 flex flex-col gap-1.5">
            {navigationItems.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                degree={item.degree}
              />
            ))}

            <div className="border-t border-t-[#F7F8F9] dark:border-t-[#191C24] mt-2 pt-2">
              {bottomNavigationItems.map((item) => (
                <NavigationLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  degree={item.degree}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        id="public-sidebar"
        className={`
          bg-white dark:bg-[#151E3A] h-screen fixed top-0 bottom-0 left-0 z-[90] transition-all duration-300 hidden lg:block ${
            isCollapsed ? "lg:w-[68px] md:px-2" : "lg:w-[300px] md:px-5"
          } pt-5 pb-10
        `}
      >
        <div className="flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-b-[#F7F8F9] dark:border-b-[#191C24] pb-4 flex items-center justify-between">
              {/* Logo section */}
              {!isCollapsed && (
                <div>
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_PATH || logo}
                    width={155}
                    height={50}
                    className="block dark:hidden"
                    alt="LOGO"
                  />
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_PATH_LIGHT || logoLight}
                    width={155}
                    height={50}
                    className="hidden dark:block"
                    alt="LOGO-DARK"
                  />
                </div>
              )}

              {/* Collapsed logo */}
              {isCollapsed && (
                <div>
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_PATH || logoIcon}
                    width={40}
                    height={40}
                    className="w-full scale-75"
                    alt="LOGO-ICON"
                  />
                </div>
              )}

              {/* Toggle button */}
              <button
                onClick={handleMobileToggle}
                className={`bg-[#F7F8F9] dark:bg-[#1C2541] p-2 rounded-md cursor-pointer hover:opacity-60 duration-300 ease-in-out ${
                  isCollapsed &&
                  "absolute -right-1.5 top-3 translate-x-full border border-[#2D385B]"
                }`}
                disabled={isNavigating}
              >
                <PanelLeftClose size={20} className="text-[#5871A7]" />
              </button>
            </div>

            <div className="mt-10 flex flex-col gap-1.5">
              {navigationItems.map((item) => (
                <NavigationLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  degree={item.degree}
                  showLabel={!isCollapsed}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {bottomNavigationItems.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                degree={item.degree}
                showLabel={!isCollapsed}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

export default PublicSidebar;
