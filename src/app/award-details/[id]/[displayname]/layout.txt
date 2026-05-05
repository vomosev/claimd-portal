"use client";

import PublicDashboardSidebar from "@/components/shared/PublicDashboardSidebar";
import Header from "@/components/shared/Header";
import { useState } from "react";
import PublicRoute from "@/components/PublicRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <PublicRoute>
      <main className="flex min-h-screen w-full overflow-x-hidden">
        <PublicDashboardSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        <section
          className={`
            transition-all duration-300 relative w-full min-w-0 flex-1 
            ml-0 pb-20 pt-0 
            lg:pb-20 lg:pt-0
            ${isCollapsed ? "lg:ml-[68px] lg:pl-12" : "lg:ml-[300px]"}
          `}
        >
          <Header />
          <div className="px-4 pt-20 lg:pt-0 w-full max-w-full overflow-x-auto">
            {children}
          </div>
        </section>
      </main>
    </PublicRoute>
  );
}
