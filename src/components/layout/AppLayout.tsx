import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { cn } from "@/lib/utils";
import { Copyright, Server } from "lucide-react";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] text-slate-900 dark:text-slate-100 relative selection:bg-brand-red/30 dark:selection:bg-brand-red/40 transition-colors duration-500">
      {/* 🚀 ATMÓSFERA INDUSTRIAL: Reemplazamos las auroras por un fondo técnico limpio (Dot Grid) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #94a3b8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

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
          "flex flex-col min-h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] w-full relative z-10",
          sidebarCollapsed ? "pl-16" : "pl-64",
        )}
      >
        <AppHeader />

        {/* ÁREA DE TRABAJO: Adaptativa al Dark Mode */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto relative z-0 bg-transparent">
          <div
            key={location.pathname}
            className="animate-page-enter max-w-[1600px] mx-auto w-full"
          >
            <Outlet />
          </div>
        </main>

        {/* 🚀 FOOTER TAHOE: Barra de estado técnica */}
        <footer className="px-8 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-20 transition-all">
          {/* Marca y Copyright */}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-brand-navy dark:hover:text-slate-300 transition-colors cursor-default">
            <Copyright className="h-3.5 w-3.5" />
            <span>
              Transport Manager System TMS{" "}
              <span className="text-brand-red mx-1.5">•</span> Asicom{" "}
              {new Date().getFullYear()}
            </span>
          </div>

          {/* Indicador de Estado del Servidor */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-900/30 border border-emerald-500/20 dark:border-emerald-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] cursor-default transition-all hover:bg-emerald-500/20 dark:hover:bg-emerald-900/50">
            <div className="relative flex h-2 w-2 items-center justify-center">
              {/* Efecto de ping extendido */}
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-75"></span>
              {/* Punto sólido central */}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
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
