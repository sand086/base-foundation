import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { cn } from "@/lib/utils";
import { Copyright } from "lucide-react";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-brand-red/20">
      {/* ATMÓSFERA PREMIUM: Aurora Background Sutil */}
      <div className="aurora-background opacity-60" aria-hidden="true" />
      <div className="aurora-orb-center opacity-50" aria-hidden="true" />

      <GlobalProgressBar variant="both" />
      <GlobalSearch />

      {/* SIDEBAR FIXED */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* CONTENEDOR PRINCIPAL */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] w-full",
          sidebarCollapsed ? "pl-16" : "pl-64",
        )}
      >
        <AppHeader />

        {/* ÁREA DE TRABAJO: Superficie más blanca y brillante */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto relative z-0 bg-white/60 backdrop-blur-[2px]">
          <div
            key={location.pathname}
            className="animate-page-enter max-w-[1600px] mx-auto w-full"
          >
            <Outlet />
          </div>
        </main>

        <footer className="px-8 py-4 bg-white/60 backdrop-blur-xl border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 transition-all">
          {/*  Marca y Copyright */}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-500 transition-colors cursor-default">
            <Copyright className="h-3.5 w-3.5" />
            <span>
              Transport Manager System TMS{" "}
              <span className="text-brand-red mx-1">•</span> Asicom{" "}
              {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] cursor-default transition-all hover:bg-emerald-500/15">
            <div className="relative flex h-2 w-2 items-center justify-center">
              {/* Efecto de ping extendido */}
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              {/* Punto sólido central */}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </div>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mt-[1px]">
              Servidor Online
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
