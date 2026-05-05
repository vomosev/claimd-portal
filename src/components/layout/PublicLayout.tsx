// src/components/layout/PublicLayout.tsx
"use client";

import React, { useEffect, useState } from "react";
import PublicSidebar from "./PublicSidebar";
import PublicHeader from "./PublicHeader";

interface PublicLayoutProps {
  children: React.ReactNode;
  displayName?: string;
}

const PublicLayout = ({ children, displayName }: PublicLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");

  // Check authentication status
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
    setIsAuthenticated(!!username);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8F9] dark:bg-[#0B1426]">
      {/* Sidebar */}
      <PublicSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isAuthenticated={isAuthenticated}
        currentUsername={currentUsername}
      />

      {/* Header */}
      <PublicHeader
        isAuthenticated={isAuthenticated}
        currentUsername={currentUsername}
        displayName={displayName}
        isCollapsed={isCollapsed}
      />

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isCollapsed ? "lg:ml-[68px]" : "lg:ml-[300px]"
        } pt-16 lg:pt-0`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default PublicLayout;
