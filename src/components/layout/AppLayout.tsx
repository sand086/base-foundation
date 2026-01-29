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
    <div className="min-h-screen bg-background">
      {/* Aurora Mesh Background - Subtle animated atmosphere */}
      <div className="aurora-background" aria-hidden="true" />
      <div className="aurora-orb-center" aria-hidden="true" />
      
      {/* Global Progress Bar - Safari/iOS style */}
      <GlobalProgressBar />
      
      {/* Global Command Palette - Spotlight Search (Cmd+K) */}
      <GlobalSearch />
      
      {/* Fixed Sidebar - Always visible on desktop */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main content with proper margin to avoid sidebar overlap */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-out",
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
