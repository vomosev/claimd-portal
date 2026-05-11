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
  Globe,
  Mail,
  Link2,
  BotMessageSquare,
  BarChart2,
  ChartPie,
  Package,
  Route,
  Truck,
} from "lucide-react";
import Image from "next/image";
import LinkComponent from "./LinkComponent";
import StyledIcon from "./StyledIcon";
import { usePathname, useRouter } from "next/navigation";

const DashboardSidebar = ({
  isCollapsed,
  setIsCollapsed,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}) => {
  const [role, setUserrole] = useState(null);
  const [adminStatus, setAdminStatus] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  let datarole = "";

  // Handle localStorage access safely
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // Fetch user role when username is available
  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
        .then((res) => res.json())
        .then((data) => {
          setUserrole(data.role);
          localStorage.setItem("datarole", data.role);
          datarole = data.role;
          if ((String(data.role).includes("admin")) || (String(data.role).includes("superuser"))) {
            setAdminStatus(true);
          } else {
            setAdminStatus(false);
          }
        })
        .catch((err) => {
          console.error("Error fetching user role:", err);
          setAdminStatus(false);
        });
    }
  }, [currentUsername]);

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
      // Lock body scroll
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
    } else {
      // Unlock body scroll
      document.body.style.overflow = "";
      document.body.style.height = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, [isMobile, isMobileMenuOpen]);

  // Handle mobile menu toggle
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

    // Start loading overlay timer - show after 500ms
    const loadingTimer = setTimeout(() => {
      setShowLoadingOverlay(true);
    }, 500);

    // Navigate after 500ms delay
    setTimeout(() => {
      clearTimeout(loadingTimer);
      router.push(href);
    }, 500);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isMobileMenuOpen) {
        const sidebar = document.getElementById("dashboard-sidebar");
        const mobileMenu = document.getElementById("mobile-menu");
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

  const labelText = process.env.NEXT_PUBLIC_DISTRIBUTION === "1" ? "Latest Info" : "Home";

  // Navigation items configuration
  const navigationItems = [ 
    { href: "/dashboard/ins-policy", label: "Policies", icon: Award, degree: 0 },
    { href: "/dashboard/ins-claim", label: "Claims", icon: Flame, degree: 0 },
    { href: "/dashboard/ins-policy/new", label: "New Policy", icon: Award, degree: 0 },
    { href: "/dashboard/ins-claim/new", label: "New Claim", icon: Trophy, degree: 0 },
    // { href: "/dashboard", label: labelText, icon: House, degree: 0 },
    // { href: "/dashboard/my-activity", label: "My Tickets & Rewards", icon: Search, degree: 90 },
  ];

  // Admin Navigation items configuration
  const navigationItemsAdmin = [ 
    { href: "/admin/ins-policy", label: "Policies Admin", icon: Award, degree: 0 },
    { href: "/admin/ins-claim", label: "Claims Admin", icon: Flame, degree: 0 },
    // { href: "/admin/ins-policy/new", label: "New Policy Admin", icon: Award, degree: 0 },
    // { href: "/admin/ins-claim/new", label: "New Claim Admin", icon: Trophy, degree: 0 },
  ];

  // Admin Navigation items configuration
  const navigationItemsDriver = [ 
    { href: "/logistics/transportmap/fleet", label: "Fleet Tracking", icon: Globe, degree: 0 },
    { href: "/logistics/shipments", label: "Vehicle Routes", icon: Route, degree: 0 },
    { href: "/logistics/shipments/add", label: "Add Route", icon: Link2, degree: 0 },
    { href: "/logistics/vehicles", label: "My Vehicles", icon: Truck, degree: 0 },
  ];

  const bottomNavigationItems = [
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    { href: "/logout", label: "Logout", icon: CircleArrowOutUpRight, degree: 45,},
  ];

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

  return (
    <>
      {/* Loading Overlay - only shows after 500ms delay */}
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
            {/* Light mode logo */}
            <Image
              src={process.env.NEXT_PUBLIC_LOGO_PATH || logo}
              width={120}
              height={40}
              className='w-[120px] block dark:hidden'
              alt='LOGO'
            />
            {/* Dark mode logo */}
            <Image
              src={process.env.NEXT_PUBLIC_LOGO_PATH_LIGHT || logoLight}
              width={120}
              height={40}
              className='w-[120px] hidden dark:block'
              alt='LOGO-DARK'
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
          id="mobile-menu"
          className="fixed top-[61px] left-0 right-0 bg-white dark:bg-[#151E3A] border-b border-b-[#F7F8F9] dark:border-b-[#191C24] z-[90] lg:hidden shadow-lg landscape:h-screen landscape:overflow-scroll landscape:pb-14"
        >
          <div className="px-4 py-4 flex flex-col gap-1.5">

            {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && datarole === "user" && navigationItems.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                degree={item.degree}
              />
            ))}

            {(adminStatus && Number(process.env.NEXT_PUBLIC_INSURANCE) === 1) && (
              <><hr /></>
            )}

            {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && adminStatus && navigationItemsAdmin.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                degree={item.degree}
              />
            ))}

            {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && datarole === "driver" && navigationItemsDriver.map((item) => (
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
        id="dashboard-sidebar"
        className={`
          bg-white dark:bg-[#151E3A] h-screen fixed top-0 bottom-0 left-0 z-[90] transition-all duration-300 hidden lg:block ${
            isCollapsed ? "lg:w-[68px] md:px-2" : "lg:w-[300px] md:px-5"
          } pt-5 pb-10
        `}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="">
            <div className="border-b border-b-[#F7F8F9] dark:border-b-[#191C24] pb-4 flex items-center justify-between">
              {/* Logo section */}
              {!isCollapsed && (
                <div>
                  {/* Light mode logo */}
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_PATH || logo}
                    width={155}
                    height={50}
                    className="w-[155px] block dark:hidden"
                    alt="LOGO"
                  />

                  {/* Dark mode logo */}
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_PATH_LIGHT || logoLight}
                    width={155}
                    height={50}
                    className="w-[155px] hidden dark:block"
                    alt="LOGO-DARK"
                  />
                </div>
              )}

              {/* Collapsed logo */}
              {isCollapsed && (
                <div>
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_PATH || logoIcon}
                    width={155}
                    height={50}
                    className="w-full scale-75"
                    alt="LOGO"
                  />
                </div>
              )}

              {/* Toggle button */}
              <button
                onClick={handleMobileToggle}
                className={`bg-[#F7F8F9] dark:bg-[#1C2541] p-2 rounded-md cursor-pointer hover:opacity-60 duration-300 ease-in-out ${
                  isCollapsed &&
                  "absolute -right-1.5 translate-x-full border border-[#2D385B]"
                }`}
                disabled={isNavigating}
              >
                <PanelLeftClose size={20} className="text-[#5871A7]" />
              </button>
            </div>

            <div className="mt-10 flex flex-col gap-1.5">

              {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && !adminStatus && navigationItems.map((item) => (
                <NavigationLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  degree={item.degree}
                  showLabel={!isCollapsed}
                />
              ))}

              {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && adminStatus && navigationItemsAdmin.map((item) => (
                <NavigationLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  degree={item.degree}
                  showLabel={!isCollapsed}
                />
              ))}

              {Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && datarole === "driver" && navigationItemsDriver.map((item) => (
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

export default DashboardSidebar;
