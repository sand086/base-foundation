import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* ========================================
          AMBIENT LIGHT - Floating Blob Orbs
          Subtle animated background atmosphere
          ======================================== */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Red Brand Orb - Top Left */}
        <div 
          className={cn(
            "absolute -top-32 -left-32",
            "w-96 h-96 rounded-full",
            "bg-brand-red/10",
            "blur-3xl mix-blend-multiply",
            "animate-blob"
          )} 
        />
        {/* Blue Orb - Top Right */}
        <div 
          className={cn(
            "absolute -top-16 -right-16",
            "w-80 h-80 rounded-full",
            "bg-blue-200/10",
            "blur-3xl mix-blend-multiply",
            "animate-blob animation-delay-2000"
          )} 
        />
        {/* Purple Orb - Bottom Center */}
        <div 
          className={cn(
            "absolute -bottom-32 left-1/2 -translate-x-1/2",
            "w-[500px] h-[500px] rounded-full",
            "bg-purple-200/10",
            "blur-3xl mix-blend-multiply",
            "animate-blob animation-delay-4000"
          )} 
        />
      </div>
      
      {/* Global Progress Bar - Safari/iOS style */}
      <GlobalProgressBar />
      
      {/* Global Command Palette - Spotlight Search (Cmd+K) */}
      <GlobalSearch />
      
      {/* Fixed Sidebar - Always visible on desktop */}
      <div className="relative z-10">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      
      {/* Main content with proper margin to avoid sidebar overlap */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-out relative z-10",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <AppHeader />
        <main className="p-6">
          {/* Page transition wrapper - key forces re-animation on route change */}
          <div 
            key={location.pathname}
            className="animate-page-enter"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
