import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, Mail, AlertTriangle, ArrowRight } from "lucide-react";
import { logos_3t } from "@/assets/img";

// IMPORTAMOS NEXT-THEMES PARA FORZAR MODO CLARO SI ES NECESARIO
import { useTheme } from "next-themes";

export default function Login() {
  // =====================
  // UX: FORZAR TEMA CLARO Y RESTAURARLO (Mantenido de tu Login original)
  // =====================
  const { theme, setTheme } = useTheme();
  const originalTheme = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!originalTheme.current) {
      originalTheme.current = theme;
    }
    if (theme !== "light") {
      setTheme("light");
    }
  }, [theme, setTheme]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* Background image & overlays - Idéntico a tu Login chido */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 animate-[subtle-float_20s_ease-in-out_infinite]"
          style={{
            backgroundImage: `url(${logos_3t?.login_bg_3t || "/assets/img/login-bg.jpeg"})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-red/20 via-transparent to-transparent" />
      </div>

      {/* Logo top-right */}
      <div className="hidden md:block absolute right-16 top-10 z-10 select-none">
        <img
          src={logos_3t?.logo_white_3t || "/assets/img/logo-white.svg"}
          alt="TMS Logo"
          className="h-20"
        />
      </div>

      {/* Content Center */}
      <div className="relative z-10 flex h-full items-center justify-center px-6 md:justify-end md:px-16">
        <Card className="login-card w-full max-w-[520px] rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl shadow-[0_8px_64px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-300">
          <CardContent className="px-10 py-10 flex flex-col items-center text-center">
            {/* Header Corporativo TMS */}
            <div className="text-center w-full">
              <div className="text-5xl font-black uppercase tracking-wide text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                TMS
              </div>
              <div className="mx-auto mt-2 h-[6px] w-[150px] rounded-full bg-gradient-to-r from-brand-red via-brand-red/80 to-brand-red shadow-[0_0_20px_rgba(190,8,17,0.5)]" />
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                TRANSPORT MANAGEMENT SYSTEM
              </div>
            </div>

            {/* Icono de Mantenimiento Animado */}
            <div className="my-8 relative flex items-center justify-center">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 relative shadow-inner backdrop-blur-md">
                <Wrench className="h-10 w-10 text-white animate-[spin_10s_linear_infinite]" />
              </div>
              <div className="absolute -top-2 -right-2 p-1 bg-brand-red rounded-lg border border-white/20 shadow-md">
                <Clock className="h-4 w-4 text-white animate-pulse" />
              </div>
            </div>

            {/* Bloque de Texto Informativo */}
            <div className="space-y-3 px-2">
              <Badge
                variant="outline"
                className="text-[10px] font-black uppercase tracking-widest border-amber-500/30 bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />{" "}
                Ventana de Mantenimiento
              </Badge>
              <h2 className="text-xl font-black text-white tracking-tight pt-1">
                Estamos optimizando el sistema
              </h2>
              <p className="text-white/70 text-xs font-medium leading-relaxed max-w-sm mx-auto">
                Actualmente nos encontramos realizando mejoras programadas en
                las bases de datos y el motor de timbrado del SAT para ofrecerte
                un servicio más rápido y blindado.
              </p>
              <p className="text-brand-red font-black text-xs uppercase tracking-wider pt-1 animate-pulse">
                Volveremos a estar en línea en unos minutos.
              </p>
            </div>

            {/* Separador estético */}
            <div className="w-full border-t border-white/10 my-6" />

            {/* Firma de Sistemas y Botón de Soporte */}
            <div className="w-full space-y-5">
              <div className="text-xs text-white/50 font-bold uppercase tracking-wider">
                Atentamente:
                <br />
                <span className="text-white font-black text-sm tracking-widest block mt-1 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  EQUIPO DE SISTEMAS
                </span>
              </div>

              <div className="pt-2">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.15em] mb-2.5">
                  ¿Necesitas reportar una incidencia urgente?
                </p>
                <Button
                  asChild
                  className="h-12 w-full rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:translate-y-0 shadow-md"
                >
                  <a href="mailto:desarrolloSoft@asicomsystems.com.mx">
                    <Mail className="h-4 w-4 mr-2 text-white" />
                    desarrolloSoft@asicomsystems.com.mx
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
