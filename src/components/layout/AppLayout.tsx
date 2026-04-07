import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { cn } from "@/lib/utils";
import { Copyright, Server } from "lucide-react";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setSidebarCollapsed(true);
        setMobileOpen(false);
      }
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-brand-red/30 dark:selection:bg-brand-red/40 transition-colors duration-500">
      {/* Dot Grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <GlobalProgressBar variant="both" />
      <GlobalSearch />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => {
          // On mobile, toggle overlay; on desktop, collapse
          if (window.innerWidth < 768) {
            setMobileOpen(!mobileOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* MAIN CONTAINER */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] w-full relative z-10",
          // On mobile: no left padding (sidebar is overlay)
          // On desktop: pad based on collapse state
          "pl-0 md:pl-16",
          !sidebarCollapsed && "md:pl-64",
        )}
      >
        <AppHeader onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />

        {/* WORK AREA */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto relative z-0 bg-transparent">
          <div
            key={location.pathname}
            className="animate-page-enter max-w-[1600px] mx-auto w-full"
          >
            <Outlet />
          </div>
        </main>

        {/* FOOTER */}
        <footer className="px-4 md:px-8 py-3 md:py-4 bg-card/80 backdrop-blur-xl border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 relative z-20 transition-all">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors cursor-default">
            <Copyright className="h-3.5 w-3.5" />
            <span>
              Transport Manager System TMS{" "}
              <span className="text-brand-red mx-1.5">•</span> Asicom{" "}
              {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-900/30 border border-emerald-500/20 dark:border-emerald-500/30 cursor-default transition-all hover:bg-emerald-500/20 dark:hover:bg-emerald-900/50">
            <div className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mt-[1px]">
                Servidor Online
              </span>
              <Server className="h-3 w-3 text-emerald-600/70 dark:text-emerald-400/70" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
